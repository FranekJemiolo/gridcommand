import { describe, it, expect } from 'vitest';
import { HLC } from '../src/hlc';
import { chunkPayload, BLEChunkAssembler } from '../src/bleChunker';
import { reduceGameState, reducePeers, reduceTacticalMarkers } from '../src/reducer';
import { MissionGraph, CRDTEventValue } from '../src/types';
import { latLonToMGRS, latLonToUTM } from '../src/mgrs';
import { computeElevationProfile, getTerrainElevation } from '../src/elevationProfile';
import { OfflineMapStorageManager } from '../src/offlineMapManager';

describe('Hybrid Logical Clock (HLC)', () => {
  it('generates monotonic timestamps with device fingerprint', () => {
    const clock = new HLC('devAlpha');
    const t1 = clock.now();
    const t2 = clock.now();

    expect(t1).toContain('devAlpha');
    expect(t2).toContain('devAlpha');
    expect(HLC.compare(t1, t2)).toBeLessThan(0);

    const parsed1 = HLC.parse(t1);
    const parsed2 = HLC.parse(t2);
    expect(parsed1?.deviceId).toBe('devAlpha');
    expect(parsed2?.deviceId).toBe('devAlpha');
    expect(parsed2?.logical).toBeGreaterThanOrEqual(0);
  });

  it('updates logical clock on incoming remote timestamp causality', () => {
    const clock = new HLC('devBravo');
    const futureHLC = '2099-01-01T00:00:00.000Z-0005-devRemote';
    clock.update(futureHLC);

    const next = clock.now();
    expect(HLC.compare(next, futureHLC)).toBeGreaterThan(0);
  });
});

describe('BLE Chunking Protocol', () => {
  it('chunks and successfully reassembles arbitrary binary payloads', () => {
    // Generate sample 350-byte random binary payload
    const original = new Uint8Array(350);
    for (let i = 0; i < original.length; i++) {
      original[i] = (i * 17) % 256;
    }

    const batchId = 42;
    const chunks = chunkPayload(batchId, original, 122);
    expect(chunks.length).toBe(3); // 122 + 122 + 106 = 350

    const assembler = new BLEChunkAssembler();
    expect(assembler.addFrame(chunks[1])).toBeNull(); // Out of order delivery
    expect(assembler.addFrame(chunks[0])).toBeNull();
    const result = assembler.addFrame(chunks[2]);

    expect(result).not.toBeNull();
    expect(result?.batchId).toBe(42);
    expect(result?.data.length).toBe(original.length);
    expect(result?.data).toEqual(original);
  });
});

describe('Deterministic DAG Reducer', () => {
  const initialGraph: MissionGraph = {
    nodes: {
      bunker_01: {
        id: 'bunker_01',
        name: 'Bunker 1',
        prerequisites: [],
        status: 'ACTIVE',
        owner: null,
        points: 100,
        decayRatePerMin: 0,
      },
      bunker_02: {
        id: 'bunker_02',
        name: 'Bunker 2',
        prerequisites: ['bunker_01'],
        status: 'LOCKED',
        owner: null,
        points: 200,
        decayRatePerMin: 0,
      },
      radar_hq: {
        id: 'radar_hq',
        name: 'Radar HQ',
        prerequisites: ['bunker_02'],
        status: 'LOCKED',
        owner: null,
        points: 500,
        decayRatePerMin: 0,
      },
    },
  };

  it('captures an active objective and cascades unlocks to downstream nodes', () => {
    const events: Record<string, CRDTEventValue> = {
      '2026-10-02T14:00:00.000Z-0000-devAlpha': {
        t: 'CAPT',
        sq: 'squad_alpha',
        opr: 'alpha_lead',
        dat: { o: 'bunker_01' },
      },
    };

    const finalState = reduceGameState(initialGraph, events);
    expect(finalState.nodes['bunker_01'].status).toBe('RESOLVED');
    expect(finalState.nodes['bunker_01'].owner).toBe('squad_alpha');
    // bunker_02 should cascade to ACTIVE
    expect(finalState.nodes['bunker_02'].status).toBe('ACTIVE');
    // radar_hq should remain LOCKED
    expect(finalState.nodes['radar_hq'].status).toBe('LOCKED');
  });

  it('handles God-Mode OVER events deterministically regardless of insertion order', () => {
    const eventsOrder1: Record<string, CRDTEventValue> = {
      '2026-10-02T14:10:00.000Z-0000-devGM': {
        t: 'OVER',
        sq: 'squad_bravo',
        opr: 'gm_base',
        dat: { o: 'radar_hq', st: 'RESOLVED' },
      },
      '2026-10-02T14:00:00.000Z-0000-devAlpha': {
        t: 'CAPT',
        sq: 'squad_alpha',
        opr: 'alpha_lead',
        dat: { o: 'bunker_01' },
      },
    };

    const state1 = reduceGameState(initialGraph, eventsOrder1);
    expect(state1.nodes['radar_hq'].status).toBe('RESOLVED');
    expect(state1.nodes['radar_hq'].owner).toBe('squad_bravo');
    expect(state1.nodes['bunker_01'].status).toBe('RESOLVED');
  });
});

describe('Blue Force Tracking (BFT) State Reducer', () => {
  it('aggregates peer telemetry and updates monotonically by HLC', () => {
    const events: Record<string, CRDTEventValue> = {
      '2026-10-02T14:01:00.000Z-0000-devAlpha1': {
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'alpha_lead',
        dat: {
          peer: {
            id: 'alpha_lead',
            callsign: 'Viper-1',
            squad: 'squad_alpha',
            role: 'LEADER',
            lat: 54.401,
            lon: 18.552,
            battery: 95,
            status: 'ACTIVE',
          },
        },
      },
      '2026-10-02T14:02:00.000Z-0000-devAlpha1': {
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'alpha_lead',
        dat: {
          peer: {
            id: 'alpha_lead',
            lat: 54.402,
            lon: 18.553,
            battery: 94,
            status: 'ENGAGING',
          },
        },
      },
      '2026-10-02T14:01:30.000Z-0000-devBravo1': {
        t: 'BFT',
        sq: 'squad_bravo',
        opr: 'bravo_lead',
        dat: {
          peer: {
            id: 'bravo_lead',
            callsign: 'Coyote-1',
            squad: 'squad_bravo',
            role: 'LEADER',
            lat: 54.398,
            lon: 18.549,
            battery: 88,
            status: 'ACTIVE',
          },
        },
      },
    };

    const peers = reducePeers(events);
    expect(peers.size).toBe(2);

    const viper = peers.get('alpha_lead');
    expect(viper?.callsign).toBe('Viper-1');
    expect(viper?.lat).toBe(54.402);
    expect(viper?.battery).toBe(94);
    expect(viper?.status).toBe('ENGAGING');

    const coyote = peers.get('bravo_lead');
    expect(coyote?.callsign).toBe('Coyote-1');
    expect(coyote?.squad).toBe('squad_bravo');
  });
});

describe('Field SPOTREP Tactical Markers', () => {
  it('creates active markers and supports removal and expiration', () => {
    const now = 1760000000000;
    const events: Record<string, CRDTEventValue> = {
      '2026-10-02T14:05:00.000Z-0000-devAlpha1': {
        t: 'SPOTREP',
        sq: 'squad_alpha',
        opr: 'alpha_scout',
        dat: {
          marker: {
            id: 'marker_01',
            type: 'HOSTILE',
            lat: 54.403,
            lon: 18.555,
            title: 'Enemy Sighting 2x',
            createdAt: now,
            expiresAt: now + 600000,
            active: true,
          },
        },
      },
      '2026-10-02T14:06:00.000Z-0000-devBravo1': {
        t: 'SPOTREP',
        sq: 'squad_bravo',
        opr: 'bravo_scout',
        dat: {
          marker: {
            id: 'marker_02',
            type: 'HAZARD',
            lat: 54.399,
            lon: 18.548,
            title: 'Minefield Warning',
            createdAt: now,
            expiresAt: now + 300000,
            active: true,
          },
        },
      },
    };

    const markers = reduceTacticalMarkers(events, now);
    expect(markers.size).toBe(2);
    expect(markers.get('marker_01')?.type).toBe('HOSTILE');
    expect(markers.get('marker_02')?.type).toBe('HAZARD');

    // Deactivation event
    events['2026-10-02T14:07:00.000Z-0000-devAlpha1'] = {
      t: 'SPOTREP',
      sq: 'squad_alpha',
      opr: 'alpha_lead',
      dat: {
        marker: {
          id: 'marker_01',
          lat: 54.403,
          lon: 18.555,
          active: false,
        },
      },
    };

    const updated = reduceTacticalMarkers(events, now);
    expect(updated.size).toBe(1);
    expect(updated.has('marker_01')).toBe(false);
    expect(updated.has('marker_02')).toBe(true);
  });
});

describe('Military Grid Reference System (MGRS)', () => {
  it('correctly converts Gdańsk coordinates to UTM Zone 34U', () => {
    // Gdańsk Oliwa coordinates (54.4080° N, 18.5385° E)
    const utm = latLonToUTM(54.408, 18.5385);
    expect(utm.zone).toBe(34);
    expect(utm.band).toBe('U');
    expect(utm.easting).toBeGreaterThan(300000);
    expect(utm.easting).toBeLessThan(400000);
    expect(utm.northing).toBeGreaterThan(6000000);
  });

  it('formats valid 10-figure MGRS string for field operations', () => {
    const mgrs = latLonToMGRS(54.408, 18.5385, 5);
    expect(mgrs.zone).toBe(34);
    expect(mgrs.band).toBe('U');
    expect(mgrs.squareId.length).toBe(2);
    expect(mgrs.formatted).toMatch(/^34U [A-Z]{2} \d{5} \d{5}$/);
  });
});

describe('Terrain Elevation & Line-of-Sight (LOS) Engine', () => {
  it('returns topographical elevations across moraine terrain', () => {
    // Pachołek peak should have substantial elevation
    const pacholekElev = getTerrainElevation(54.4095, 18.541);
    expect(pacholekElev).toBeGreaterThan(50);
  });

  it('computes elevation profile slice and detects line of sight status', () => {
    const start = { lat: 54.408, lon: 18.5385, alt: 60 };
    const target = { lat: 54.4095, lon: 18.541, alt: 110 };

    const analysis = computeElevationProfile(start, target, 20);
    expect(analysis.distanceMeters).toBeGreaterThan(150);
    expect(analysis.distanceMeters).toBeLessThan(400);
    expect(analysis.bearingDeg).toBeGreaterThan(0);
    expect(analysis.bearingDeg).toBeLessThan(90);
    expect(analysis.profile.length).toBe(21);
    expect(analysis.fresnelRadiusMidpointMeters).toBeGreaterThan(0);
  });
});

describe('Offline Map Pack Storage Manager', () => {
  it('lists predefined operational sectors with storage metadata', () => {
    const sectors = OfflineMapStorageManager.getSectors();
    expect(sectors.length).toBeGreaterThanOrEqual(3);
    const oliwa = sectors.find((s) => s.id === 'gdansk_oliwa_tactical');
    expect(oliwa).toBeDefined();
    expect(oliwa?.sizeMb).toBeGreaterThan(10);
    expect(oliwa?.isCached).toBe(true);
  });

  it('downloads and purges sector cache properly', async () => {
    expect(OfflineMapStorageManager.isSectorCached('katowice_forest_grid')).toBe(false);
    let progressReached = 0;
    await OfflineMapStorageManager.downloadSector('katowice_forest_grid', (p) => {
      progressReached = p;
    });
    expect(progressReached).toBe(100);
    expect(OfflineMapStorageManager.isSectorCached('katowice_forest_grid')).toBe(true);

    await OfflineMapStorageManager.purgeSector('katowice_forest_grid');
    expect(OfflineMapStorageManager.isSectorCached('katowice_forest_grid')).toBe(false);
  });
});
