/**
 * GridCommand Core Types and Interfaces
 */

export type NodeStatus = 'HIDDEN' | 'LOCKED' | 'ACTIVE' | 'RESOLVED';

export type CaptureMechanism = 'INSTANT_NFC' | 'TIMED_HOLD' | 'SYNC_CAPTURE';

export interface MissionNode {
  id: string;
  name: string;
  prerequisites: string[];
  status: NodeStatus;
  owner: string | null;
  points: number;
  decayRatePerMin: number;
  activatedAtHLC?: string;
  lat?: number;
  lon?: number;
  pin?: string;
  geofenceRadiusMeters?: number; // 10m to 500m geofence perimeter
  captureMechanism?: CaptureMechanism;
  holdDurationSeconds?: number; // Duration required for TIMED_HOLD (e.g. 180s)
  requiredOperators?: number; // Number of simultaneous operators for SYNC_CAPTURE
}

export interface MissionGraph {
  nodes: Record<string, MissionNode>;
}

export interface OperatorRosterEntry {
  id: string;
  callsign: string;
  squad: 'squad_alpha' | 'squad_bravo';
  role: BlueForceRole;
  publicKey: string; // Ed25519 hex public key
  revoked: boolean;
  assignedAt: number;
}

export interface MissionManifest {
  manifestVersion: '1.0';
  missionId: string;
  title: string;
  description: string;
  createdAt: number;
  authorPublicKey: string;
  graph: MissionGraph;
  roster: OperatorRosterEntry[];
  signature?: string; // Ed25519 signature of canonical JSON
}

export type EventType = 'CAPT' | 'OVER' | 'HAZ' | 'SOS' | 'MULE' | 'FREEZE' | 'SPOTREP' | 'BFT';

export type BlueForceRole = 'LEADER' | 'POINTMAN' | 'MEDIC' | 'RTO' | 'MARKSMAN';

export interface BlueForcePeer {
  id: string; // Operator identifier / pubkey fingerprint
  callsign: string; // Tactical call-sign, e.g. "Viper-1"
  squad: string; // Squad ID, e.g. "squad_alpha"
  role: BlueForceRole;
  lat: number;
  lon: number;
  alt?: number;
  heading?: number;
  battery: number; // Percentage 0-100
  status: 'ACTIVE' | 'ENGAGING' | 'CASUALTY' | 'RTB';
  hlc: string;
  updatedAt: number;
}

export type TacticalMarkerType = 'HOSTILE' | 'HAZARD' | 'MEDEVAC' | 'SUPPLY' | 'RALLY';

export interface TacticalMarker {
  id: string;
  type: TacticalMarkerType;
  lat: number;
  lon: number;
  reportedBy: string; // Callsign
  squad: string;
  title: string;
  notes?: string;
  hlc: string;
  createdAt: number;
  expiresAt: number;
  active: boolean;
}

export interface EventData {
  o?: string; // Objective Node ID (for CAPT and OVER)
  prf?: string; // Cryptographic tag signature or GM master signature
  lat?: number; // GPS Latitude
  lon?: number; // GPS Longitude
  acc?: number; // GPS Accuracy in meters
  st?: NodeStatus; // New status (for OVER)
  poly?: [number, number][]; // Polygon coordinates for HAZ
  ttl?: number; // Countdown seconds for HAZ evacuation
  // BFT and SPOTREP fields
  peer?: Partial<BlueForcePeer>;
  marker?: Partial<TacticalMarker>;
  [key: string]: unknown;
}

export interface CRDTEventValue {
  t: EventType;
  sq: string; // Squad ID (e.g. 'squad_alpha')
  opr: string; // Operator alias or public key fingerprint
  dat: EventData;
}

export interface PhysicalTagPayload {
  o: string; // Objective Node ID (e.g., 'bunker_01')
  m: string; // Match ID
  v: number; // Tag version / generation sequence
  sig: string; // Ed25519 signature
}

export interface TelemetryBreadcrumb {
  match_id: string;
  squad_id: string;
  operator_id: string;
  hlc: string;
  loc: {
    lat: number;
    lon: number;
    alt?: number;
    acc: number;
    heading?: number;
    sen: boolean; // Physical sensor movement verified
  };
}
