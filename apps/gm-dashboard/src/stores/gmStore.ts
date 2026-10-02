import { create } from 'zustand';
import {
  MissionGraph,
  CRDTEventValue,
  HLC,
  reduceGameState,
  BlueForcePeer,
  TacticalMarker,
} from '@gridcommand/crdt-core';
import { TacticalAudioEngine } from '@gridcommand/ui-theme';

export interface TickerEvent {
  id: string;
  hlc: string;
  timeStr: string;
  type: 'CAPT' | 'OVER' | 'HAZ' | 'SOS' | 'FREEZE' | 'SPOTREP' | 'BFT';
  squad: string;
  message: string;
  verified: boolean;
}

export interface TacticalHex {
  id: string;
  coordinates: [number, number]; // [lon, lat]
  elevation: number;
  owner: 'squad_alpha' | 'squad_bravo' | 'uncontested' | 'hazard' | 'contested';
  nodeId?: string;
  label?: string;
}

interface GMState {
  matchId: string;
  clock: HLC;
  isLive: boolean;
  scrubPosition: number; // 0 to 100 percentage
  globalFreeze: boolean;
  graph: MissionGraph;
  events: Record<string, CRDTEventValue>;
  ticker: TickerEvent[];
  hexes: TacticalHex[];
  peers: Record<string, BlueForcePeer>;
  markers: Record<string, TacticalMarker>;
  activeHazard: { name: string; remainingSeconds: number } | null;

  // Actions
  setIsLive: (live: boolean) => void;
  setScrubPosition: (pos: number) => void;
  toggleGlobalFreeze: () => void;
  forceResolve: (nodeId: string, squad: 'squad_alpha' | 'squad_bravo') => void;
  injectHazard: (name: string, durationSeconds: number) => void;
}

const INITIAL_GRAPH: MissionGraph = {
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
    },
  },
};

// Generate initial tactical hex grid over simulated operations area in Gdańsk
const INITIAL_HEXES: TacticalHex[] = [
  { id: 'hex_a1', coordinates: [18.541, 54.4095], elevation: 120, owner: 'uncontested', nodeId: 'bunker_01', label: 'BUNKER PACHOŁEK' },
  { id: 'hex_a2', coordinates: [18.5365, 54.4065], elevation: 145, owner: 'squad_alpha', label: 'RIDGE OLIWA' },
  { id: 'hex_a3', coordinates: [18.528, 54.402], elevation: 110, owner: 'uncontested', nodeId: 'bunker_02', label: 'REDOUBT 02' },
  { id: 'hex_b1', coordinates: [18.545, 54.411], elevation: 85, owner: 'squad_alpha', label: 'DROPZONE ALPHA' },
  { id: 'hex_b2', coordinates: [18.523, 54.3995], elevation: 130, owner: 'squad_bravo', label: 'OUTPOST BRAVO' },
  { id: 'hex_b3', coordinates: [18.519, 54.398], elevation: 165, owner: 'uncontested', nodeId: 'radar_hq', label: 'RADAR TRZY SZCZYTY' },
  { id: 'hex_c1', coordinates: [18.531, 54.404], elevation: 155, owner: 'contested', label: 'SECTOR RADOŚĆ' },
  { id: 'hex_c2', coordinates: [18.552, 54.413], elevation: 75, owner: 'uncontested', nodeId: 'exfil_point', label: 'EXFIL DELTA' },
];

export const useGMStore = create<GMState>((set, get) => {
  const clock = new HLC('devBasecampGM');

  return {
    matchId: 'GDANSK_ALPHA_2026',
    clock,
    isLive: true,
    scrubPosition: 100,
    globalFreeze: false,
    graph: INITIAL_GRAPH,
    events: {},
    hexes: INITIAL_HEXES,
    activeHazard: null,
    ticker: [
      {
        id: 't-1',
        hlc: '2026-10-02T14:00:00.000Z-0000-devGM',
        timeStr: '14:00:00',
        type: 'OVER',
        squad: 'GAME MASTER',
        message: 'Simulation initiated. 3 squads deployed into zero-connectivity forest grid.',
        verified: true,
      },
      {
        id: 't-2',
        hlc: '2026-10-02T14:10:22.000Z-0001-devAlpha',
        timeStr: '14:10:22',
        type: 'CAPT',
        squad: 'squad_alpha',
        message: 'Pointman Alpha breached Bunker 01 geofence (GPS ±2.8m).',
        verified: true,
      },
      {
        id: 't-3',
        hlc: '2026-10-02T14:12:05.000Z-0002-devAlpha',
        timeStr: '14:12:05',
        type: 'CAPT',
        squad: 'squad_alpha',
        message: 'Bunker 01 captured via NTAG215 NFC token. Ed25519 signature validated.',
        verified: true,
      },
      {
        id: 't-4',
        hlc: '2026-10-02T14:13:30.000Z-0003-devAlpha2',
        timeStr: '14:13:30',
        type: 'SPOTREP',
        squad: 'squad_alpha',
        message: 'SPOTREP: Barbed Wire Obstacle tagged by Viper-2 (Doc).',
        verified: true,
      },
    ],
    peers: {
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
    },
    markers: {
      marker_init_01: {
        id: 'marker_init_01',
        type: 'HAZARD',
        lat: 54.4055,
        lon: 18.534,
        reportedBy: 'Viper-2 (Doc)',
        squad: 'squad_alpha',
        title: 'Barbed Wire Obstacle',
        notes: 'Dense wire entanglement, passable only single-file',
        hlc: '2026-10-02T14:00:05.000Z-0000-devAlpha2',
        createdAt: Date.now() - 180000,
        expiresAt: Date.now() + 12 * 60 * 1000,
        active: true,
      },
    },

    setIsLive: (isLive) => set({ isLive }),
    setScrubPosition: (scrubPosition) => set({ scrubPosition }),

    toggleGlobalFreeze: () => {
      const { globalFreeze, clock, ticker } = get();
      const nextState = !globalFreeze;
      const hlc = clock.now();
      const newEvent: TickerEvent = {
        id: `t-${Date.now()}`,
        hlc,
        timeStr: new Date().toLocaleTimeString(),
        type: 'FREEZE',
        squad: 'GAME MASTER',
        message: nextState
          ? 'EMERGENCY GLOBAL FREEZE TRIGGERED. All operator HUDs locked.'
          : 'GLOBAL FREEZE LIFTED. Simulation resumed.',
        verified: true,
      };
      TacticalAudioEngine.play(nextState ? 'FREEZE' : 'PING');
      set({
        globalFreeze: nextState,
        ticker: [newEvent, ...ticker],
      });
    },

    forceResolve: (nodeId, squad) => {
      const { graph, clock, events, ticker, hexes } = get();
      const node = graph.nodes[nodeId];
      if (!node) return;

      const hlc = clock.now();
      const crdtEvt: CRDTEventValue = {
        t: 'OVER',
        sq: squad,
        opr: 'gm_master',
        dat: { o: nodeId, st: 'RESOLVED', prf: 'GM_MASTER_ED25519_KEY' },
      };

      const updatedEvents = { ...events, [hlc]: crdtEvt };
      const updatedGraph = reduceGameState(INITIAL_GRAPH, updatedEvents);

      // Update hex ownership
      const updatedHexes = hexes.map((hex) =>
        hex.nodeId === nodeId ? { ...hex, owner: squad } : hex
      );

      const newTicker: TickerEvent = {
        id: `t-${Date.now()}`,
        hlc,
        timeStr: new Date().toLocaleTimeString(),
        type: 'OVER',
        squad: 'GAME MASTER',
        message: `God-Mode override: ${node.name} force-resolved to ${squad.toUpperCase()}.`,
        verified: true,
      };

      set({
        events: updatedEvents,
        graph: updatedGraph,
        hexes: updatedHexes,
        ticker: [newTicker, ...ticker],
      });
    },

    injectHazard: (name, durationSeconds) => {
      const { clock, ticker, hexes } = get();
      const hlc = clock.now();

      // Convert a hex into hazard
      const updatedHexes = hexes.map((h, i) => (i === 6 ? { ...h, owner: 'hazard' as const } : h));

      const newTicker: TickerEvent = {
        id: `t-${Date.now()}`,
        hlc,
        timeStr: new Date().toLocaleTimeString(),
        type: 'HAZ',
        squad: 'GAME MASTER',
        message: `Hazard Injected: ${name} (Evacuation window: ${durationSeconds}s). Sockets alerted.`,
        verified: true,
      };

      set({
        hexes: updatedHexes,
        activeHazard: { name, remainingSeconds: durationSeconds },
        ticker: [newTicker, ...ticker],
      });
    },
  };
});
