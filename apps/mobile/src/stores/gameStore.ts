import { create } from 'zustand';
import { MissionGraph, CRDTEventValue, HLC, reduceGameState } from '@gridcommand/crdt-core';

export const INITIAL_MISSION_GRAPH: MissionGraph = {
  nodes: {
    bunker_01: {
      id: 'bunker_01',
      name: 'Bunker Alpha (01)',
      prerequisites: [],
      status: 'ACTIVE',
      owner: null,
      points: 100,
      decayRatePerMin: 0,
      lat: 52.1245,
      lon: 21.2185,
      pin: '849211',
    },
    bunker_02: {
      id: 'bunker_02',
      name: 'Bunker Bravo (02)',
      prerequisites: ['bunker_01'],
      status: 'LOCKED',
      owner: null,
      points: 250,
      decayRatePerMin: 0,
      lat: 52.129,
      lon: 21.226,
      pin: '439102',
    },
    radar_hq: {
      id: 'radar_hq',
      name: 'Primary Radar Site',
      prerequisites: ['bunker_02'],
      status: 'LOCKED',
      owner: null,
      points: 500,
      decayRatePerMin: 0,
      lat: 52.135,
      lon: 21.233,
      pin: '901774',
    },
    exfil_point: {
      id: 'exfil_point',
      name: 'Extraction Delta',
      prerequisites: ['radar_hq'],
      status: 'LOCKED',
      owner: null,
      points: 1000,
      decayRatePerMin: 0,
      lat: 52.141,
      lon: 21.242,
      pin: '110943',
    },
  },
};

interface GameState {
  deviceId: string;
  squadId: string;
  operatorId: string;
  clock: HLC;
  graph: MissionGraph;
  events: Record<string, CRDTEventValue>;
  redMode: boolean;
  rainLock: boolean;
  rigPitch: boolean;
  heading: number;
  location: { lat: number; lon: number };
  activeObjectiveId: string;
  isBreached: boolean;

  // Actions
  toggleRedMode: () => void;
  toggleRainLock: () => void;
  toggleRigPitch: () => void;
  setHeading: (deg: number) => void;
  setLocation: (loc: { lat: number; lon: number }) => void;
  captureObjective: (nodeId: string, proof?: string) => boolean;
  verifyPin: (pin: string) => boolean;
}

export const useGameStore = create<GameState>((set, get) => {
  const clock = new HLC('devAlphaPointman');

  return {
    deviceId: 'devAlphaPointman',
    squadId: 'squad_alpha',
    operatorId: 'alpha_pointman',
    clock,
    graph: INITIAL_MISSION_GRAPH,
    events: {},
    redMode: false,
    rainLock: false,
    rigPitch: true,
    heading: 42,
    location: { lat: 52.1235, lon: 21.2168 },
    activeObjectiveId: 'bunker_01',
    isBreached: false,

    toggleRedMode: () => set((s) => ({ redMode: !s.redMode })),
    toggleRainLock: () => set((s) => ({ rainLock: !s.rainLock })),
    toggleRigPitch: () => set((s) => ({ rigPitch: !s.rigPitch })),
    setHeading: (heading) => set({ heading }),
    setLocation: (location) => {
      const activeObj = get().graph.nodes[get().activeObjectiveId];
      let isBreached = false;
      if (activeObj && activeObj.lat && activeObj.lon) {
        // Approximate distance
        const dLat = (activeObj.lat - location.lat) * 111000;
        const dLon = (activeObj.lon - location.lon) * 111000 * Math.cos((location.lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        isBreached = dist <= 35; // 35m breach threshold
      }
      set({ location, isBreached });
    },

    captureObjective: (nodeId: string, proof = 'SIG_VERIFIED_ED25519') => {
      const { graph, clock, events, squadId, operatorId } = get();
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
          acc: 3.2,
        },
      };

      const updatedEvents = { ...events, [hlcKey]: newEvent };
      const updatedGraph = reduceGameState(INITIAL_MISSION_GRAPH, updatedEvents);

      // Find next active objective
      let nextActive = '';
      for (const id in updatedGraph.nodes) {
        if (updatedGraph.nodes[id].status === 'ACTIVE') {
          nextActive = id;
          break;
        }
      }

      set({
        events: updatedEvents,
        graph: updatedGraph,
        activeObjectiveId: nextActive || nodeId,
        isBreached: false,
      });

      return true;
    },

    verifyPin: (enteredPin: string) => {
      const { activeObjectiveId, graph, captureObjective } = get();
      const activeNode = graph.nodes[activeObjectiveId];
      if (activeNode && activeNode.pin === enteredPin) {
        return captureObjective(activeObjectiveId, `MANUAL_PIN_OVER_${enteredPin}`);
      }
      return false;
    },
  };
});
