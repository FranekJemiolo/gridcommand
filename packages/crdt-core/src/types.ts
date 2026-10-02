/**
 * GridCommand Core Types and Interfaces
 */

export type NodeStatus = 'HIDDEN' | 'LOCKED' | 'ACTIVE' | 'RESOLVED';

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
}

export interface MissionGraph {
  nodes: Record<string, MissionNode>;
}

export type EventType = 'CAPT' | 'OVER' | 'HAZ' | 'SOS' | 'MULE' | 'FREEZE';

export interface EventData {
  o?: string; // Objective Node ID (for CAPT and OVER)
  prf?: string; // Cryptographic tag signature or GM master signature
  lat?: number; // GPS Latitude
  lon?: number; // GPS Longitude
  acc?: number; // GPS Accuracy in meters
  st?: NodeStatus; // New status (for OVER)
  poly?: [number, number][]; // Polygon coordinates for HAZ
  ttl?: number; // Countdown seconds for HAZ evacuation
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
