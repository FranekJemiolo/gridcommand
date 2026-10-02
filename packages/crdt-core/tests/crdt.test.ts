import { describe, it, expect } from 'vitest';
import { HLC } from '../src/hlc';
import { chunkPayload, BLEChunkAssembler } from '../src/bleChunker';
import { reduceGameState, reducePeers, reduceTacticalMarkers } from '../src/reducer';
import { MissionGraph, CRDTEventValue, BlueForcePeer, TacticalMarker } from '../src/types';
import { latLonToMGRS, latLonToUTM } from '../src/mgrs';
import { computeElevationProfile, getTerrainElevation } from '../src/elevationProfile';
import { OfflineMapStorageManager } from '../src/offlineMapManager';
import {
  validateMissionDAG,
  removeMissionObjective,
  addDependency,
  isPointInGeofence,
} from '../src/missionBuilder';
import {
  createOperator,
  revokeOperator,
  reinstateOperator,
  findOperatorByPublicKey,
  getDefaultRoster,
} from '../src/squadRoster';
import {
  createSignedMissionManifest,
  verifyMissionManifest,
  exportManifestToBase45,
  importManifestFromBase45,
  exportManifestToJSON,
  importManifestFromJSON,
} from '../src/missionManifest';
import { generateAARMissionReplay, sampleAARStateAtTime } from '../src/aarEngine';
import { runAntiCheatAudit } from '../src/antiCheatAudit';
import {
  fragmentLoraPayload,
  parseLoraChunk,
  LoraPacketAssembler,
  calculateLoraLinkMargin,
  crc16Ccitt,
} from '../src/loraBridge';
import {
  computeTiltCompensatedHeading,
  calibrateMagnetometer,
  calculateTargetNavSolution,
  degreesToCardinal,
  degreesToClockPosition,
} from '../src/sensorFusion';
import {
  peerToCoTEvent,
  markerToCoTEvent,
  objectiveToCoTEvent,
  exportBattlespaceToCoT,
  parseCoTEvent,
  roleToCoTType,
} from '../src/cotGateway';
import {
  computeWeatherState,
  calculateSmokeDispersion,
  evaluateEWInterference,
} from '../src/tacticalEnvironment';
import {
  tickOpforSimulation,
  generateProceduralScenario,
} from '../src/opforSimulation';
import {
  createQuickShoutFrame,
  parseVoiceBurstFrame,
  QUICK_SHOUT_DEFINITIONS,
} from '../src/voiceBurst';
import { generateKeyPair, toHexString } from '@gridcommand/crypto';

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

describe('Milestone 3: Dynamic Mission Builder & DAG Engine', () => {
  it('validates a valid acyclic mission graph and identifies topological order and roots', () => {
    const validGraph: MissionGraph = {
      nodes: {
        obj_alpha: {
          id: 'obj_alpha',
          name: 'Dropzone Alpha',
          prerequisites: [],
          status: 'ACTIVE',
          owner: null,
          points: 100,
          decayRatePerMin: 0,
        },
        obj_bravo: {
          id: 'obj_bravo',
          name: 'Comms Relay',
          prerequisites: ['obj_alpha'],
          status: 'LOCKED',
          owner: null,
          points: 200,
          decayRatePerMin: 0,
        },
        obj_charlie: {
          id: 'obj_charlie',
          name: 'Extraction Point',
          prerequisites: ['obj_bravo'],
          status: 'LOCKED',
          owner: null,
          points: 500,
          decayRatePerMin: 0,
        },
      },
    };

    const res = validateMissionDAG(validGraph);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.rootNodes).toEqual(['obj_alpha']);
    expect(res.topologicalOrder).toEqual(['obj_alpha', 'obj_bravo', 'obj_charlie']);
  });

  it('detects cycles and returns an invalid validation result', () => {
    const cyclicGraph: MissionGraph = {
      nodes: {
        node_1: {
          id: 'node_1',
          name: 'Node 1',
          prerequisites: ['node_3'],
          status: 'ACTIVE',
          owner: null,
          points: 100,
          decayRatePerMin: 0,
        },
        node_2: {
          id: 'node_2',
          name: 'Node 2',
          prerequisites: ['node_1'],
          status: 'LOCKED',
          owner: null,
          points: 100,
          decayRatePerMin: 0,
        },
        node_3: {
          id: 'node_3',
          name: 'Node 3',
          prerequisites: ['node_2'],
          status: 'LOCKED',
          owner: null,
          points: 100,
          decayRatePerMin: 0,
        },
      },
    };

    const res = validateMissionDAG(cyclicGraph);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Circular dependency'))).toBe(true);
  });

  it('detects missing prerequisites and self-loops', () => {
    const invalidGraph: MissionGraph = {
      nodes: {
        self_loop: {
          id: 'self_loop',
          name: 'Self Dependent Node',
          prerequisites: ['self_loop', 'non_existent_node'],
          status: 'ACTIVE',
          owner: null,
          points: 50,
          decayRatePerMin: 0,
        },
      },
    };

    const res = validateMissionDAG(invalidGraph);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('cannot depend on itself'))).toBe(true);
    expect(res.errors.some((e) => e.includes('non-existent prerequisite'))).toBe(true);
  });

  it('adds and removes objectives and cleans up cascading prerequisites', () => {
    let graph: MissionGraph = {
      nodes: {
        root: {
          id: 'root',
          name: 'Root',
          prerequisites: [],
          status: 'ACTIVE',
          owner: null,
          points: 50,
          decayRatePerMin: 0,
        },
        sub: {
          id: 'sub',
          name: 'Sub Objective',
          prerequisites: ['root'],
          status: 'LOCKED',
          owner: null,
          points: 100,
          decayRatePerMin: 0,
        },
      },
    };

    // Remove root objective
    graph = removeMissionObjective(graph, 'root');
    expect(graph.nodes['root']).toBeUndefined();
    // Sub objective's prerequisites should be cleaned up
    expect(graph.nodes['sub'].prerequisites).toEqual([]);
  });

  it('prevents adding dependencies that would introduce a cycle', () => {
    const graph: MissionGraph = {
      nodes: {
        a: { id: 'a', name: 'A', prerequisites: [], status: 'ACTIVE', owner: null, points: 10, decayRatePerMin: 0 },
        b: { id: 'b', name: 'B', prerequisites: ['a'], status: 'LOCKED', owner: null, points: 10, decayRatePerMin: 0 },
      },
    };

    // Attempt to make A depend on B (A -> B -> A cycle)
    const result = addDependency(graph, 'b', 'a');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Circular dependency');
  });

  it('computes geofence proximity correctly', () => {
    // Pachołek Hill
    const objLat = 54.4095;
    const objLon = 18.541;

    // Operator 20 meters away
    const nearLat = 54.4096;
    const nearLon = 18.5411;
    const nearCheck = isPointInGeofence(nearLat, nearLon, objLat, objLon, 50);
    expect(nearCheck.inGeofence).toBe(true);
    expect(nearCheck.distanceMeters).toBeLessThan(50);

    // Operator 2 kilometers away
    const farLat = 54.39;
    const farLon = 18.52;
    const farCheck = isPointInGeofence(farLat, farLon, objLat, objLon, 50);
    expect(farCheck.inGeofence).toBe(false);
    expect(farCheck.distanceMeters).toBeGreaterThan(1000);
  });
});

describe('Milestone 3: Squad Roster & Cryptographic Keypair Registry', () => {
  it('creates operators with auto-generated Ed25519 keypairs', () => {
    const { operator, generatedPrivateKeyHex } = createOperator({
      callsign: 'Apex-1',
      squad: 'squad_alpha',
      role: 'LEADER',
    });

    expect(operator.callsign).toBe('Apex-1');
    expect(operator.squad).toBe('squad_alpha');
    expect(operator.role).toBe('LEADER');
    expect(operator.publicKey.length).toBe(64);
    expect(generatedPrivateKeyHex).toBeDefined();
    expect(generatedPrivateKeyHex?.length).toBe(64);
    expect(operator.revoked).toBe(false);
  });

  it('revokes and reinstates operators in the roster', () => {
    const { operator } = createOperator({
      callsign: 'Scout-Bravo',
      squad: 'squad_bravo',
      role: 'POINTMAN',
    });

    let roster = [operator];
    expect(findOperatorByPublicKey(roster, operator.publicKey)).toBeDefined();

    roster = revokeOperator(roster, operator.id);
    expect(roster[0].revoked).toBe(true);
    expect(findOperatorByPublicKey(roster, operator.publicKey)).toBeUndefined();

    roster = reinstateOperator(roster, operator.id);
    expect(roster[0].revoked).toBe(false);
    expect(findOperatorByPublicKey(roster, operator.publicKey)).toBeDefined();
  });
});

describe('Milestone 3: Signed Mission Manifest & Air-Gapped Base45 QR Exchange', () => {
  it('creates, signs, and verifies a canonical mission manifest', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const pubKeyHex = toHexString(publicKey);

    const manifest = createSignedMissionManifest(
      {
        missionId: 'OPERATION_BALTIC_SHIELD_2026',
        title: 'Operation Baltic Shield',
        description: 'Simulated urban and forest tactical encounter in Gdańsk Oliwa sector.',
        authorPublicKey: pubKeyHex,
        graph: {
          nodes: {
            hq: {
              id: 'hq',
              name: 'HQ Outpost',
              prerequisites: [],
              status: 'ACTIVE',
              owner: null,
              points: 100,
              decayRatePerMin: 0,
            },
          },
        },
        roster: getDefaultRoster(),
      },
      privateKey
    );

    expect(manifest.signature).toBeDefined();
    expect(manifest.signature?.length).toBe(128); // 64-byte Ed25519 signature = 128 hex chars

    const verification = verifyMissionManifest(manifest);
    expect(verification.valid).toBe(true);

    // Test tampering detection
    const tampered = { ...manifest, title: 'Tampered Title' };
    const tamperedVerification = verifyMissionManifest(tampered);
    expect(tamperedVerification.valid).toBe(false);
    expect(tamperedVerification.reason).toContain('mismatch or tampered');
  });

  it('exports and imports manifests via Base45 QR encoding roundtrip', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const manifest = createSignedMissionManifest(
      {
        missionId: 'AIRGAP_MISSION_TEST',
        title: 'Air-Gapped Exercise',
        description: 'Testing Base45 encoding across physical barriers.',
        authorPublicKey: toHexString(publicKey),
        graph: {
          nodes: {
            zone_a: {
              id: 'zone_a',
              name: 'Zone A',
              prerequisites: [],
              status: 'ACTIVE',
              owner: null,
              points: 50,
              decayRatePerMin: 0,
            },
          },
        },
        roster: [],
      },
      privateKey
    );

    const base45Str = exportManifestToBase45(manifest);
    expect(typeof base45Str).toBe('string');
    expect(base45Str.length).toBeGreaterThan(50);

    const importResult = importManifestFromBase45(base45Str);
    expect(importResult.valid).toBe(true);
    expect(importResult.manifest?.missionId).toBe('AIRGAP_MISSION_TEST');
    expect(importResult.manifest?.signature).toBe(manifest.signature);
  });

  it('exports and imports manifests via JSON roundtrip', () => {
    const { privateKey, publicKey } = generateKeyPair();
    const manifest = createSignedMissionManifest(
      {
        missionId: 'JSON_MISSION_TEST',
        title: 'JSON Exercise',
        description: 'Standard JSON manifest import/export.',
        authorPublicKey: toHexString(publicKey),
        graph: {
          nodes: {},
        },
        roster: [],
      },
      privateKey
    );

    const json = exportManifestToJSON(manifest);
    const result = importManifestFromJSON(json);
    expect(result.valid).toBe(true);
    expect(result.manifest?.missionId).toBe('JSON_MISSION_TEST');
  });
});

describe('Milestone 4: 3D Spatial AAR Playback Engine', () => {
  it('generates tactical trajectories with realistic distances and speeds', () => {
    const replay = generateAARMissionReplay('GDANSK_ALPHA_2026', 1800);
    expect(replay.missionId).toBe('GDANSK_ALPHA_2026');
    expect(replay.durationSeconds).toBe(1800);
    expect(replay.trajectories.length).toBe(4);
    expect(replay.bookmarks.length).toBeGreaterThan(0);
    expect(replay.scoreTimeline.length).toBeGreaterThan(0);

    for (const traj of replay.trajectories) {
      expect(traj.path.length).toBeGreaterThan(50);
      expect(traj.totalDistanceMeters).toBeGreaterThan(500);
      expect(traj.totalDistanceMeters).toBeLessThan(10000);
      expect(traj.maxSpeedMps).toBeGreaterThan(0);
      expect(traj.maxSpeedMps).toBeLessThan(15); // reasonable foot / jog speed
    }
  });

  it('samples replay state correctly at arbitrary timeline offsets', () => {
    const replay = generateAARMissionReplay('GDANSK_ALPHA_2026', 1800);

    // Sample at start (t = 0)
    const stateStart = sampleAARStateAtTime(replay, 0);
    expect(stateStart.currentScores.alpha).toBe(0);
    expect(stateStart.currentScores.bravo).toBe(0);
    expect(stateStart.passedBookmarks.length).toBe(0);
    expect(Object.keys(stateStart.activePositions).length).toBe(4);

    // Sample at midpoint (t = 900s / 15m)
    const stateMid = sampleAARStateAtTime(replay, 900);
    expect(stateMid.currentScores.alpha).toBeGreaterThanOrEqual(100);
    expect(stateMid.passedBookmarks.length).toBeGreaterThanOrEqual(2);

    // Sample at end (t = 1800s / 30m)
    const stateEnd = sampleAARStateAtTime(replay, 1800);
    expect(stateEnd.currentScores.alpha).toBe(350);
    expect(stateEnd.currentScores.bravo).toBe(500);
    expect(stateEnd.passedBookmarks.length).toBe(replay.bookmarks.length);
  });
});

describe('Milestone 4: Cryptographic Proof & Anti-Cheat Audit Engine', () => {
  const sampleRoster = getDefaultRoster();
  const sampleGraph: MissionGraph = {
    nodes: {
      bunker_01: {
        id: 'bunker_01',
        name: 'Bunker Pachołek',
        prerequisites: [],
        status: 'ACTIVE',
        owner: null,
        points: 100,
        decayRatePerMin: 0,
        lat: 54.4095,
        lon: 18.541,
        geofenceRadiusMeters: 50,
      },
    },
  };

  it('passes clean event logs with 100/100 integrity score', () => {
    const cleanEvents: Record<string, CRDTEventValue> = {
      '2026-10-02T14:00:00.000Z-0000-dev1': {
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: { lat: 54.4095, lon: 18.541 },
      },
      '2026-10-02T14:00:10.000Z-0000-dev1': {
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: { lat: 54.4096, lon: 18.5411 },
      },
    };

    const report = runAntiCheatAudit({
      missionId: 'TEST_CLEAN',
      events: cleanEvents,
      roster: sampleRoster,
      graph: sampleGraph,
      currentTime: Date.parse('2026-10-02T14:01:00.000Z'),
    });

    expect(report.passed).toBe(true);
    expect(report.integrityScore).toBe(100);
    expect(report.anomalies.length).toBe(0);
  });

  it('detects and flags speed anomalies (vehicle exploit / impossible sprint)', () => {
    const speedEvents: Record<string, CRDTEventValue> = {
      '2026-10-02T14:00:00.000Z-0000-dev1': {
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: { lat: 54.4095, lon: 18.541 },
      },
      '2026-10-02T14:00:05.000Z-0000-dev1': {
        // Moved ~500m in 5 seconds (100 m/s = 360 km/h)
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: { lat: 54.414, lon: 18.541 },
      },
    };

    const report = runAntiCheatAudit({
      events: speedEvents,
      roster: sampleRoster,
      graph: sampleGraph,
      maxSpeedMps: 10,
      currentTime: Date.parse('2026-10-02T14:01:00.000Z'),
    });

    expect(report.anomalies.length).toBeGreaterThan(0);
    const speedAnom = report.anomalies.find((a) => a.type === 'SPEED_ANOMALY' || a.type === 'TELEPORTATION');
    expect(speedAnom).toBeDefined();
    expect(report.integrityScore).toBeLessThan(100);
  });

  it('detects and flags future clock skew', () => {
    const futureEvents: Record<string, CRDTEventValue> = {
      '2026-10-02T15:00:00.000Z-0000-dev1': {
        t: 'BFT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: { lat: 54.4095, lon: 18.541 },
      },
    };

    const report = runAntiCheatAudit({
      events: futureEvents,
      roster: sampleRoster,
      currentTime: Date.parse('2026-10-02T14:00:00.000Z'), // 1 hour behind event
    });

    expect(report.anomalies.some((a) => a.type === 'CLOCK_SKEW_FUTURE')).toBe(true);
  });

  it('detects and flags geofence violation on capture', () => {
    const violationEvents: Record<string, CRDTEventValue> = {
      '2026-10-02T14:00:00.000Z-0000-dev1': {
        t: 'CAPT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: {
          o: 'bunker_01',
          lat: 54.42, // ~1.1km away from bunker_01 (54.4095, 18.541)
          lon: 18.541,
        },
      },
    };

    const report = runAntiCheatAudit({
      events: violationEvents,
      roster: sampleRoster,
      graph: sampleGraph,
      currentTime: Date.parse('2026-10-02T14:01:00.000Z'),
    });

    expect(report.anomalies.some((a) => a.type === 'GEOFENCE_VIOLATION')).toBe(true);
  });

  it('detects and flags revoked operators submitting actions', () => {
    const revokedRoster = revokeOperator(sampleRoster, 'op_alpha_1');

    const events: Record<string, CRDTEventValue> = {
      '2026-10-02T14:00:00.000Z-0000-dev1': {
        t: 'CAPT',
        sq: 'squad_alpha',
        opr: 'op_alpha_1',
        dat: { o: 'bunker_01' },
      },
    };

    const report = runAntiCheatAudit({
      events,
      roster: revokedRoster,
      currentTime: Date.parse('2026-10-02T14:01:00.000Z'),
    });

    expect(report.anomalies.some((a) => a.type === 'REVOKED_OPERATOR')).toBe(true);
    expect(report.passed).toBe(false);
  });
});

describe('Milestone 5: LoRa / Meshtastic SX1262 Hardware Bridge', () => {
  it('fragments and correctly reassembles payload with 237-byte MTU and CRC16', () => {
    // 600-byte synthetic Base45 CRDT delta payload
    const originalPayload = new Uint8Array(600);
    for (let i = 0; i < 600; i++) {
      originalPayload[i] = (i * 37 + 13) % 256;
    }

    const chunks = fragmentLoraPayload(originalPayload, 42);
    // 600 bytes / 229 bytes max per chunk = 3 chunks
    expect(chunks.length).toBe(3);

    chunks.forEach((chunk, idx) => {
      expect(chunk.rawBytes.length).toBeLessThanOrEqual(237);
      expect(chunk.packetId).toBe(42);
      expect(chunk.totalChunks).toBe(3);
      expect(chunk.chunkIndex).toBe(idx);
      expect(chunk.crc16).toBe(crc16Ccitt(chunk.data));

      // Test parsing back
      const parsed = parseLoraChunk(chunk.rawBytes);
      expect(parsed.success).toBe(true);
      expect(parsed.chunk?.chunkIndex).toBe(idx);
    });

    // Ingest out-of-order into assembler (chunk 2, then 0, then 1)
    const assembler = new LoraPacketAssembler();
    const r1 = assembler.ingestChunk(chunks[2]);
    expect(r1.complete).toBe(false);

    const r2 = assembler.ingestChunk(chunks[0]);
    expect(r2.complete).toBe(false);

    const r3 = assembler.ingestChunk(chunks[1]);
    expect(r3.complete).toBe(true);
    expect(r3.payload).toEqual(originalPayload);
    expect(assembler.getActiveSessionCount()).toBe(0);
  });

  it('rejects corrupted frames with invalid CRC or corrupt magic', () => {
    const originalPayload = new Uint8Array([10, 20, 30, 40, 50]);
    const [chunk] = fragmentLoraPayload(originalPayload, 99);

    // Corrupt one byte of data
    const corrupted = new Uint8Array(chunk.rawBytes);
    corrupted[9] ^= 0xff; // Invert bit in payload data

    const parsed = parseLoraChunk(corrupted);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('CRC mismatch');

    // Corrupt magic header
    const badMagic = new Uint8Array(chunk.rawBytes);
    badMagic[0] = 0x00;
    const parsedMagic = parseLoraChunk(badMagic);
    expect(parsedMagic.success).toBe(false);
    expect(parsedMagic.error).toContain('Invalid LoRa frame magic');
  });

  it('models Sub-GHz RF link budget and wet canopy attenuation over 2.5km', () => {
    const budget = calculateLoraLinkMargin({
      distanceMeters: 2500,
      frequencyMhz: 868.1,
      txPowerDbm: 22,
      spreadingFactor: 10,
      bandwidthKhz: 125,
      canopyDepthMeters: 150,
      canopyLossDbPerMeter: 0.08,
    });

    // FSPL for 2.5km at 868MHz is ~99 dB
    expect(budget.freeSpacePathLossDb).toBeGreaterThan(95);
    expect(budget.freeSpacePathLossDb).toBeLessThan(105);
    // Canopy attenuation: 150m * 0.08 dB/m = 12 dB
    expect(budget.canopyLossDb).toBe(12);
    // Viable link margin for SX1262 SF10 (-132 dBm sensitivity)
    expect(budget.isLinkViable).toBe(true);
    expect(budget.linkMarginDb).toBeGreaterThan(0);
  });
});

describe('Milestone 5: Sensor-Fusion Rig Calibration & Digital Compass', () => {
  it('computes tilt-compensated heading and corrects for regional magnetic declination', () => {
    // Level device pointing magnetic East
    const accelLevel = { x: 0, y: 0, z: 9.81 };
    const magEast = { x: 0, y: -45, z: 20 };

    const orientationLevel = computeTiltCompensatedHeading(accelLevel, magEast, undefined, 6.2);
    expect(orientationLevel.pitchDegrees).toBeCloseTo(0, 0);
    expect(orientationLevel.rollDegrees).toBeCloseTo(0, 0);
    expect(orientationLevel.magneticHeadingDegrees).toBeCloseTo(90, 0);
    expect(orientationLevel.trueHeadingDegrees).toBeCloseTo(96.2, 0);
    expect(orientationLevel.cardinal).toBe('E');

    // Device tilted 30 degrees pitch upwards
    const pitchRad = (30 * Math.PI) / 180;
    const accelTilted = {
      x: -9.81 * Math.sin(pitchRad),
      y: 0,
      z: 9.81 * Math.cos(pitchRad),
    };
    // Magnetometer rotated in pitch
    const magTilted = {
      x: 35 * Math.cos(pitchRad),
      y: 0,
      z: -35 * Math.sin(pitchRad),
    };

    const orientationTilted = computeTiltCompensatedHeading(accelTilted, magTilted, undefined, 0);
    expect(orientationTilted.pitchDegrees).toBeCloseTo(30, 0);
    expect(orientationTilted.magneticHeadingDegrees).toBeCloseTo(0, 0); // Pointing North
    expect(orientationTilted.cardinal).toBe('N');
  });

  it('calibrates magnetometer hard-iron bias and soft-iron scale from sweep samples', () => {
    // Generate synthetic 3D sweep samples with hard-iron offset (+25, -15, +40)
    const samples: Array<{ x: number; y: number; z: number }> = [];
    const trueRadius = 50;
    const offsetX = 25;
    const offsetY = -15;
    const offsetZ = 40;

    for (let u = 0; u < 24; u++) {
      const theta = (u / 24) * 2 * Math.PI;
      for (let v = 0; v < 6; v++) {
        const phi = ((v - 2.5) / 5) * Math.PI;
        samples.push({
          x: trueRadius * Math.cos(phi) * Math.cos(theta) + offsetX,
          y: trueRadius * Math.cos(phi) * Math.sin(theta) + offsetY,
          z: trueRadius * Math.sin(phi) + offsetZ,
        });
      }
    }

    const cal = calibrateMagnetometer(samples);
    expect(cal.samplesCollected).toBe(samples.length);
    expect(cal.isCalibrated).toBe(true);
    expect(cal.calibrationQualityScore).toBeGreaterThanOrEqual(70);

    // Hard-iron bias should accurately recover the injected offsets
    expect(cal.bias.x).toBeCloseTo(offsetX, 1);
    expect(cal.bias.y).toBeCloseTo(offsetY, 1);
    expect(cal.bias.z).toBeCloseTo(offsetZ, 1);
  });

  it('calculates great-circle target navigation solution with relative bearing and clock direction', () => {
    // Operator at Oliwa basecamp (54.4095, 18.541), heading due North (0°)
    // Target at Radar HQ Trzy Szczyty (54.398, 18.519) - South-West (~215°)
    const nav = calculateTargetNavSolution(54.4095, 18.541, 0, 54.398, 18.519);

    expect(nav.distanceMeters).toBeGreaterThan(1800);
    expect(nav.distanceMeters).toBeLessThan(2200);
    expect(nav.distanceFormatted).toContain('km');
    expect(nav.targetBearingDegrees).toBeGreaterThan(200);
    expect(nav.targetBearingDegrees).toBeLessThan(235);
    // When operator faces North, target at ~215° is at ~7 or 8 o'clock
    expect(nav.clockPosition).toBeGreaterThanOrEqual(7);
    expect(nav.clockPosition).toBeLessThanOrEqual(8);
  });

  it('converts degrees to NATO cardinals and military clock positions accurately', () => {
    expect(degreesToCardinal(0)).toBe('N');
    expect(degreesToCardinal(45)).toBe('NE');
    expect(degreesToCardinal(90)).toBe('E');
    expect(degreesToCardinal(135)).toBe('SE');
    expect(degreesToCardinal(180)).toBe('S');
    expect(degreesToCardinal(225)).toBe('SW');
    expect(degreesToCardinal(270)).toBe('W');
    expect(degreesToCardinal(315)).toBe('NW');

    expect(degreesToClockPosition(0)).toBe(12);
    expect(degreesToClockPosition(30)).toBe(1);
    expect(degreesToClockPosition(90)).toBe(3);
    expect(degreesToClockPosition(180)).toBe(6);
    expect(degreesToClockPosition(270)).toBe(9);
  });
});

describe('Version 2.0: Defense Interoperability (ATAK Cursor-on-Target CoT)', () => {
  it('serializes BlueForce peers to MIL-STD-2525 CoT XML events', () => {
    const peer: BlueForcePeer = {
      id: 'op_alpha_medic',
      callsign: 'Doc-1',
      squad: 'squad_alpha',
      role: 'MEDIC',
      lat: 54.4095,
      lon: 18.541,
      alt: 118,
      battery: 88,
      status: 'ACTIVE',
      hlc: '2026-10-02T12:00:00.000Z-0000-dev',
      updatedAt: Date.now(),
    };

    const xml = peerToCoTEvent(peer);
    expect(xml).toContain('uid="GRIDCOMMAND-op_alpha_medic"');
    expect(xml).toContain('type="a-f-G-U-C-M"'); // Medical
    expect(xml).toContain('callsign="Doc-1"');
    expect(xml).toContain('battery="88"');
    expect(xml).toContain('lat="54.409500"');
    expect(xml).toContain('lon="18.541000"');
  });

  it('serializes tactical markers and objectives to CoT XML and roundtrips parsing', () => {
    const marker: TacticalMarker = {
      id: 'marker_spotrep_1',
      type: 'HOSTILE',
      title: 'Hostile Scout Patrol',
      notes: '2x armed scouts moving south on ridge',
      lat: 54.415,
      lon: 18.532,
      squad: 'squad_alpha',
      reportedBy: 'Viper-1',
      hlc: '2026-10-02T12:01:00.000Z-0000-dev',
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
      active: true,
    };

    const xml = markerToCoTEvent(marker);
    expect(xml).toContain('type="a-h-G"'); // Hostile Ground Contact
    expect(xml).toContain('Hostile Scout Patrol');

    const parsed = parseCoTEvent(xml);
    expect(parsed).not.toBeNull();
    expect(parsed?.uid).toBe('SPOTREP-marker_spotrep_1');
    expect(parsed?.point.lat).toBeCloseTo(54.415, 4);
    expect(parsed?.point.lon).toBeCloseTo(18.532, 4);
    expect(parsed?.callsign).toBe('Hostile Scout Patrol');
  });

  it('exports entire battlespace to multi-event CoT stream', () => {
    const peers: BlueForcePeer[] = [
      {
        id: 'peer_1',
        callsign: 'Leader-1',
        squad: 'squad_alpha',
        role: 'LEADER',
        lat: 54.402,
        lon: 18.542,
        battery: 95,
        status: 'ACTIVE',
        hlc: 't1',
        updatedAt: Date.now(),
      },
    ];

    const stream = exportBattlespaceToCoT({ peers });
    expect(stream).toContain('<event version="2.0"');
    expect(stream).toContain('Leader-1');
  });
});

describe('Version 2.0: Tactical Environment & Electronic Warfare (EW)', () => {
  it('computes weather conditions and realistic infantry speed penalties', () => {
    const clearWeather = computeWeatherState('CLEAR');
    expect(clearWeather.movementSpeedModifier).toBe(1.0);
    expect(clearWeather.rfWetCanopyExtraLossDbPerMeter).toBe(0.0);

    const rainWeather = computeWeatherState('RAIN');
    expect(rainWeather.movementSpeedModifier).toBe(0.8);
    expect(rainWeather.precipitationMmPerHour).toBeGreaterThan(5);

    const heavyRain = computeWeatherState('HEAVY_RAIN');
    expect(heavyRain.movementSpeedModifier).toBe(0.65);
    expect(heavyRain.visibilityMeters).toBeLessThan(1000);
  });

  it('evaluates EW jamming zone interference on RF packet loss and GPS accuracy', () => {
    const jammingZones = [
      {
        id: 'ew_jammer_1',
        name: 'Krasukha-4 Jammer Node',
        centerLat: 54.41,
        centerLon: 18.54,
        radiusMeters: 300,
        band: 'BROADBAND' as const,
        powerDbm: 30,
        active: true,
      },
    ];

    // Inside jamming zone (50m from center)
    const inside = evaluateEWInterference(54.4103, 18.5404, jammingZones, 'LORA_868', 2.5);
    expect(inside.isJammed).toBe(true);
    expect(inside.packetLossRate).toBeGreaterThan(0.5);
    expect(inside.effectiveGpsErrorMeters).toBeGreaterThan(20);

    // Outside jamming zone (1500m away)
    const outside = evaluateEWInterference(54.425, 18.55, jammingZones, 'LORA_868', 2.5);
    expect(outside.isJammed).toBe(false);
    expect(outside.packetLossRate).toBe(0);
    expect(outside.effectiveGpsErrorMeters).toBe(2.5);
  });

  it('calculates smoke screen dispersion with wind drift vectors', () => {
    const now = Date.now();
    const smoke = {
      id: 'smoke_1',
      sourceLat: 54.405,
      sourceLon: 18.535,
      deployedAt: now - 30000, // 30s ago
      durationSeconds: 120,
      initialRadiusMeters: 20,
      maxRadiusMeters: 80,
    };

    // Wind blowing from 180° (South) at 5 m/s -> smoke drifts North
    const dispersion = calculateSmokeDispersion(smoke, 5.0, 180, now);
    expect(dispersion.active).toBe(true);
    expect(dispersion.radiusMeters).toBeGreaterThan(20);
    expect(dispersion.radiusMeters).toBeLessThan(80);
    // Smoke centroid should drift North (lat increased)
    expect(dispersion.currentLat).toBeGreaterThan(smoke.sourceLat);
  });
});

describe('Version 2.0: Autonomous OPFOR Bots & Procedural Scenarios', () => {
  it('ticks OPFOR bots along waypoints and detects Blue Force contact', () => {
    const bot = {
      id: 'bot_red_1',
      callsign: 'Red-Sentry-1',
      role: 'SENTRY' as const,
      lat: 54.4095,
      lon: 18.541,
      heading: 0,
      speedMps: 2.0,
      patrolWaypoints: [
        [18.541, 54.4095] as [number, number],
        [18.543, 54.411] as [number, number],
      ],
      currentWaypointIndex: 0,
      state: 'PATROLLING' as const,
      detectionRadiusMeters: 60,
      healthPercent: 100,
    };

    // Blue force operator 35m away
    const bluePeer: BlueForcePeer = {
      id: 'op_blue_1',
      callsign: 'Viper-1',
      squad: 'squad_alpha',
      role: 'POINTMAN',
      lat: 54.4097,
      lon: 18.5413,
      battery: 90,
      status: 'ACTIVE',
      hlc: 't1',
      updatedAt: Date.now(),
    };

    const sim = tickOpforSimulation({
      bots: [bot],
      deltaSeconds: 2,
      blueForcePeers: [bluePeer],
    });

    expect(sim.contactAlerts.length).toBe(1);
    expect(sim.contactAlerts[0].botCallsign).toBe('Red-Sentry-1');
    expect(sim.contactAlerts[0].targetCallsign).toBe('Viper-1');
    expect(sim.updatedBots[0].state).toBe('ENGAGING');
  });

  it('generates a procedural balanced scenario with valid DAG and patrolling bots', () => {
    const scenario = generateProceduralScenario(54.4095, 18.541, 'RAID');

    expect(scenario.scenarioId).toContain('OP_RAID');
    expect(Object.keys(scenario.graph.nodes).length).toBe(4);
    expect(scenario.opforBots.length).toBeGreaterThanOrEqual(2);
    expect(scenario.opforBots.every((b) => b.patrolWaypoints.length >= 2)).toBe(true);
  });
});

describe('Version 2.0: Tactical Acoustic Voice Burst Protocol', () => {
  it('creates and parses tactical quick-shout binary frames', () => {
    const frame = createQuickShoutFrame('op_lead_1', 'Ghost-1', 'squad_alpha', 'CONTACT_FRONT', 1234);

    expect(frame.magic).toBe(0x5642);
    expect(frame.sequenceId).toBe(1234);
    expect(frame.quickShout).toBe('CONTACT_FRONT');
    expect(frame.textMessage).toContain('CONTACT FRONT');
    expect(frame.rawBytes.length).toBeLessThan(64);

    const parsed = parseVoiceBurstFrame(frame.rawBytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.operatorId).toBe('op_lead_1');
    expect(parsed?.callsign).toBe('Ghost-1');
    expect(parsed?.squad).toBe('squad_alpha');
    expect(parsed?.quickShout).toBe('CONTACT_FRONT');
    expect(parsed?.textMessage).toContain('SUPPRESSING FIRE');
  });
});


