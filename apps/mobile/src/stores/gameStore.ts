import { create } from 'zustand';
import {
  MissionGraph,
  CRDTEventValue,
  HLC,
  reduceGameState,
  BlueForcePeer,
  TacticalMarker,
  TacticalMarkerType,
  reducePeers,
  reduceTacticalMarkers,
} from '@gridcommand/crdt-core';
import { TacticalAudioEngine } from '@gridcommand/ui-theme';

export const INITIAL_MISSION_GRAPH: MissionGraph = {
  nodes: {
    bunker_01: {
      id: 'bunker_01',
      name: 'Bunker Pachołek (01)',
      prerequisites: [],
      status: 'ACTIVE',
      owner: null,
      points: 100,
      decayRatePerMin: 0,
      lat: 54.4095,
      lon: 18.541,
      pin: '849211',
    },
    bunker_02: {
      id: 'bunker_02',
      name: 'Redoubt Dolina Radości (02)',
      prerequisites: ['bunker_01'],
      status: 'LOCKED',
      owner: null,
      points: 250,
      decayRatePerMin: 0,
      lat: 54.402,
      lon: 18.528,
      pin: '439102',
    },
    radar_hq: {
      id: 'radar_hq',
      name: 'Radar HQ Trzy Szczyty',
      prerequisites: ['bunker_02'],
      status: 'LOCKED',
      owner: null,
      points: 500,
      decayRatePerMin: 0,
      lat: 54.398,
      lon: 18.519,
      pin: '901774',
    },
    exfil_point: {
      id: 'exfil_point',
      name: 'Extraction Delta Oliwa',
      prerequisites: ['radar_hq'],
      status: 'LOCKED',
      owner: null,
      points: 1000,
      decayRatePerMin: 0,
      lat: 54.413,
      lon: 18.552,
      pin: '110943',
    },
  },
};

export interface MeshNeighbor {
  id: string;
  alias: string;
  role: 'Pointman' | 'Squad Leader' | 'Data Mule' | 'Basecamp GM';
  squad: string;
  rssi: number; // dBm (-40 to -95)
  hops: number;
  lastSeenSec: number;
  loraActive: boolean;
}

interface GameState {
  deviceId: string;
  squadId: string;
  operatorId: string;
  callsign: string;
  clock: HLC;
  graph: MissionGraph;
  events: Record<string, CRDTEventValue>;
  peers: Record<string, BlueForcePeer>;
  markers: Record<string, TacticalMarker>;
  redMode: boolean;
  rainLock: boolean;
  rigPitch: boolean;
  audioEnabled: boolean;
  heading: number;
  location: { lat: number; lon: number };
  activeObjectiveId: string;
  isBreached: boolean;
  activeTab: 'hud' | 'mesh' | 'objectives' | 'roster' | 'diagnostics';
  meshNeighbors: MeshNeighbor[];
  totalUpdatesTransferred: number;

  // Actions
  setActiveTab: (tab: 'hud' | 'mesh' | 'objectives' | 'roster' | 'diagnostics') => void;
  toggleRedMode: () => void;
  toggleRainLock: () => void;
  toggleRigPitch: () => void;
  toggleAudio: () => void;
  setHeading: (deg: number) => void;
  setLocation: (loc: { lat: number; lon: number }) => void;
  captureObjective: (nodeId: string, proof?: string) => boolean;
  verifyPin: (pin: string) => boolean;
  dropMarker: (marker: { type: TacticalMarkerType; title: string; notes?: string }) => void;
  removeMarker: (markerId: string) => void;
  forceMeshSync: () => void;
  exportSneakernetCRDT: () => string;
}

export const useGameStore = create<GameState>((set, get) => {
  const clock = new HLC('devAlphaPointman');

  const initialPeers: Record<string, BlueForcePeer> = {
    alpha_lead: {
      id: 'alpha_lead',
      callsign: 'Viper Actual',
      squad: 'squad_alpha',
      role: 'LEADER',
      lat: 54.4098,
      lon: 18.539,
      heading: 45,
      battery: 96,
      status: 'ACTIVE',
      hlc: '2026-10-02T14:00:00.000Z-0000-devAlpha1',
      updatedAt: Date.now() - 5000,
    },
    alpha_medic: {
      id: 'alpha_medic',
      callsign: 'Viper-2 (Doc)',
      squad: 'squad_alpha',
      role: 'MEDIC',
      lat: 54.4065,
      lon: 18.536,
      heading: 30,
      battery: 89,
      status: 'ACTIVE',
      hlc: '2026-10-02T14:00:10.000Z-0000-devAlpha2',
      updatedAt: Date.now() - 12000,
    },
    bravo_scout: {
      id: 'bravo_scout',
      callsign: 'Coyote-1',
      squad: 'squad_bravo',
      role: 'POINTMAN',
      lat: 54.402,
      lon: 18.53,
      heading: 210,
      battery: 84,
      status: 'ACTIVE',
      hlc: '2026-10-02T14:00:20.000Z-0000-devBravo1',
      updatedAt: Date.now() - 45000,
    },
  };

  const initialMarkers: Record<string, TacticalMarker> = {
    marker_init_01: {
      id: 'marker_init_01',
      type: 'HAZARD',
      lat: 54.4055,
      lon: 18.534,
      reportedBy: 'Viper-2 (Doc)',
      squad: 'squad_alpha',
      title: 'Barbed Wire & Trench Obstacle',
      notes: 'Dense wire entanglement, passable only on foot single-file',
      hlc: '2026-10-02T14:00:05.000Z-0000-devAlpha2',
      createdAt: Date.now() - 180000,
      expiresAt: Date.now() + 12 * 60 * 1000,
      active: true,
    },
  };

  return {
    deviceId: 'devAlphaPointman',
    squadId: 'squad_alpha',
    operatorId: 'alpha_pointman',
    callsign: 'Viper-Point',
    clock,
    graph: INITIAL_MISSION_GRAPH,
    events: {},
    peers: initialPeers,
    markers: initialMarkers,
    redMode: false,
    rainLock: false,
    rigPitch: true,
    audioEnabled: true,
    heading: 42,
    location: { lat: 54.408, lon: 18.5385 }, // Near Pachołek in Oliwa, Gdańsk
    activeObjectiveId: 'bunker_01',
    isBreached: false,
    activeTab: 'hud',
    totalUpdatesTransferred: 24,
    meshNeighbors: [
      {
        id: 'node_alpha_sl',
        alias: 'Viper Actual',
        role: 'Squad Leader',
        squad: 'squad_alpha',
        rssi: -58,
        hops: 1,
        lastSeenSec: 3,
        loraActive: true,
      },
      {
        id: 'node_alpha_mule',
        alias: 'Echo Courier',
        role: 'Data Mule',
        squad: 'squad_alpha',
        rssi: -67,
        hops: 1,
        lastSeenSec: 8,
        loraActive: true,
      },
      {
        id: 'node_basecamp_gw',
        alias: 'Basecamp Relay',
        role: 'Basecamp GM',
        squad: 'hq',
        rssi: -84,
        hops: 2,
        lastSeenSec: 22,
        loraActive: true,
      },
      {
        id: 'node_bravo_scout',
        alias: 'Ghost 01',
        role: 'Pointman',
        squad: 'squad_bravo',
        rssi: -91,
        hops: 2,
        lastSeenSec: 45,
        loraActive: false,
      },
    ],

    setActiveTab: (activeTab) => set({ activeTab }),
    toggleRedMode: () => set((s) => ({ redMode: !s.redMode })),
    toggleRainLock: () => set((s) => ({ rainLock: !s.rainLock })),
    toggleRigPitch: () => set((s) => ({ rigPitch: !s.rigPitch })),
    toggleAudio: () => {
      const nextState = !get().audioEnabled;
      TacticalAudioEngine.setEnabled(nextState);
      if (nextState) {
        TacticalAudioEngine.play('PING');
      }
      set({ audioEnabled: nextState });
    },
    setHeading: (heading) => set({ heading }),
    setLocation: (location) => {
      const activeObj = get().graph.nodes[get().activeObjectiveId];
      let isBreached = false;
      if (activeObj && activeObj.lat && activeObj.lon) {
        const dLat = (activeObj.lat - location.lat) * 111000;
        const dLon = (activeObj.lon - location.lon) * 111000 * Math.cos((location.lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        isBreached = dist <= 35; // 35m breach threshold
      }
      if (isBreached && !get().isBreached) {
        TacticalAudioEngine.play('CONTACT', { enableHaptics: true });
      }
      set({ location, isBreached });
    },

    captureObjective: (nodeId: string, proof = 'SIG_VERIFIED_ED25519') => {
      const { graph, clock, events, squadId, operatorId, totalUpdatesTransferred } = get();
      const node = graph.nodes[nodeId];
      if (!node || node.status !== 'ACTIVE') return false;

      const hlcKey = clock.now();
      const newEvent: CRDTEventValue = {
        t: 'CAPT',
        sq: squadId,
        opr: operatorId,
        dat: {
          o: nodeId,
          prf: proof,
          lat: node.lat,
          lon: node.lon,
          acc: 2.8,
        },
      };

      const updatedEvents = { ...events, [hlcKey]: newEvent };
      const updatedGraph = reduceGameState(INITIAL_MISSION_GRAPH, updatedEvents);

      let nextActive = '';
      for (const id in updatedGraph.nodes) {
        if (updatedGraph.nodes[id].status === 'ACTIVE') {
          nextActive = id;
          break;
        }
      }

      TacticalAudioEngine.play('CAPTURE', { enableHaptics: true });

      set({
        events: updatedEvents,
        graph: updatedGraph,
        activeObjectiveId: nextActive || nodeId,
        isBreached: false,
        totalUpdatesTransferred: totalUpdatesTransferred + 1,
      });

      return true;
    },

    verifyPin: (enteredPin: string) => {
      const { activeObjectiveId, graph, captureObjective } = get();
      const activeNode = graph.nodes[activeObjectiveId];
      if (activeNode && activeNode.pin === enteredPin) {
        return captureObjective(activeObjectiveId, `MANUAL_PIN_OVER_${enteredPin}`);
      }
      TacticalAudioEngine.play('FREEZE');
      return false;
    },

    dropMarker: ({ type, title, notes }) => {
      const { clock, location, operatorId, squadId, callsign, events, markers } = get();
      const markerId = `spotrep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      const newMarker: TacticalMarker = {
        id: markerId,
        type,
        lat: location.lat,
        lon: location.lon,
        reportedBy: callsign,
        squad: squadId,
        title,
        notes,
        hlc: clock.now(),
        createdAt: now,
        expiresAt: now + 15 * 60 * 1000,
        active: true,
      };

      const newEvent: CRDTEventValue = {
        t: 'SPOTREP',
        sq: squadId,
        opr: operatorId,
        dat: { marker: newMarker },
      };

      TacticalAudioEngine.play(
        type === 'HOSTILE' ? 'CONTACT' : type === 'HAZARD' ? 'ARTILLERY' : 'PING',
        { enableHaptics: true }
      );

      set({
        events: { ...events, [newMarker.hlc]: newEvent },
        markers: { ...markers, [markerId]: newMarker },
        totalUpdatesTransferred: get().totalUpdatesTransferred + 1,
      });
    },

    removeMarker: (markerId: string) => {
      const { clock, operatorId, squadId, events, markers } = get();
      const marker = markers[markerId];
      if (!marker) return;
      const hlcKey = clock.now();
      const newEvent: CRDTEventValue = {
        t: 'SPOTREP',
        sq: squadId,
        opr: operatorId,
        dat: { marker: { id: markerId, active: false } },
      };
      const updatedMarkers = { ...markers };
      delete updatedMarkers[markerId];
      set({
        events: { ...events, [hlcKey]: newEvent },
        markers: updatedMarkers,
        totalUpdatesTransferred: get().totalUpdatesTransferred + 1,
      });
    },

    forceMeshSync: () => {
      const { totalUpdatesTransferred } = get();
      TacticalAudioEngine.play('PING');
      set({ totalUpdatesTransferred: totalUpdatesTransferred + 4 });
    },

    exportSneakernetCRDT: () => {
      const { events, graph, matchId = 'GDANSK_ALPHA_2026' } = get() as any;
      const exportBlob = {
        version: '1.0.0',
        platform: 'GridCommand-Sneakernet-OTG',
        match_id: matchId,
        exported_at: new Date().toISOString(),
        events,
        graph_snapshot: graph,
      };
      return JSON.stringify(exportBlob, null, 2);
    },
  };
});
