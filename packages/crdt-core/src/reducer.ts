import { MissionGraph, CRDTEventValue } from './types';

export type SignatureVerifier = (proof: string, publicKey?: Uint8Array) => boolean;

export function reduceGameState(
  initialGraph: MissionGraph,
  events: Map<string, CRDTEventValue> | Record<string, CRDTEventValue>,
  verifySignature?: SignatureVerifier,
  gmPublicKey?: Uint8Array
): MissionGraph {
  // Convert map or record to array of [HLC, CRDTEventValue]
  const entries: [string, CRDTEventValue][] =
    events instanceof Map
      ? Array.from(events.entries())
      : Object.entries(events);

  // 1. Strict Lexicographical Chronological Sort by HLC
  const sortedEvents = entries.sort(([hlcA], [hlcB]) => hlcA.localeCompare(hlcB));

  // Deep clone graph
  const state: MissionGraph = JSON.parse(JSON.stringify(initialGraph));

  for (const [hlc, evt] of sortedEvents) {
    if (!evt || !evt.dat) continue;

    switch (evt.t) {
      case 'CAPT': {
        const objectiveId = evt.dat.o;
        if (!objectiveId) break;

        const node = state.nodes[objectiveId];
        // Zero-trust verification: node must be ACTIVE
        if (node && node.status === 'ACTIVE') {
          const isValidSig = verifySignature
            ? verifySignature(evt.dat.prf || '', gmPublicKey)
            : true;

          if (isValidSig) {
            node.status = 'RESOLVED';
            node.owner = evt.sq;

            // Evaluate cascading unlocks across the DAG
            for (const otherId in state.nodes) {
              const other = state.nodes[otherId];
              if (other.status === 'LOCKED') {
                const allMet = other.prerequisites.length > 0 && other.prerequisites.every(
                  (prereq) =>
                    state.nodes[prereq]?.status === 'RESOLVED' &&
                    state.nodes[prereq]?.owner === evt.sq
                );
                if (allMet) {
                  other.status = 'ACTIVE';
                  other.activatedAtHLC = hlc;
                }
              }
            }
          }
        }
        break;
      }

      case 'OVER': {
        // GM Administrative God-Mode Override
        const objectiveId = evt.dat.o;
        if (!objectiveId) break;

        const node = state.nodes[objectiveId];
        const isValidSig = verifySignature
          ? verifySignature(evt.dat.prf || '', gmPublicKey)
          : true;

        if (node && isValidSig) {
          if (evt.dat.st) {
            node.status = evt.dat.st;
          }
          if (evt.sq !== undefined) {
            node.owner = evt.sq;
          }
        }
        break;
      }

      case 'FREEZE': {
        // Safety halt event: recorded in event stream
        break;
      }
    }
  }

  return state;
}

export function reducePeers(
  events: Map<string, CRDTEventValue> | Record<string, CRDTEventValue>
): Map<string, import('./types').BlueForcePeer> {
  const entries: [string, CRDTEventValue][] =
    events instanceof Map
      ? Array.from(events.entries())
      : Object.entries(events);

  // Sort chronologically by HLC
  const sorted = entries.sort(([hlcA], [hlcB]) => hlcA.localeCompare(hlcB));
  const peers = new Map<string, import('./types').BlueForcePeer>();

  for (const [hlc, evt] of sorted) {
    if (!evt || evt.t !== 'BFT' || !evt.dat?.peer) continue;
    const peerData = evt.dat.peer;
    const peerId = peerData.id || evt.opr;
    if (!peerId) continue;

    const existing = peers.get(peerId);
    const updated: import('./types').BlueForcePeer = {
      id: peerId,
      callsign: peerData.callsign || existing?.callsign || evt.opr,
      squad: peerData.squad || evt.sq || 'squad_alpha',
      role: peerData.role || existing?.role || 'POINTMAN',
      lat: peerData.lat !== undefined ? peerData.lat : (existing?.lat ?? 0),
      lon: peerData.lon !== undefined ? peerData.lon : (existing?.lon ?? 0),
      alt: peerData.alt ?? existing?.alt,
      heading: peerData.heading ?? existing?.heading,
      battery: peerData.battery ?? existing?.battery ?? 100,
      status: peerData.status || existing?.status || 'ACTIVE',
      hlc,
      updatedAt: peerData.updatedAt || Date.now(),
    };
    peers.set(peerId, updated);
  }

  return peers;
}

export function reduceTacticalMarkers(
  events: Map<string, CRDTEventValue> | Record<string, CRDTEventValue>,
  currentTimeMs: number = Date.now()
): Map<string, import('./types').TacticalMarker> {
  const entries: [string, CRDTEventValue][] =
    events instanceof Map
      ? Array.from(events.entries())
      : Object.entries(events);

  const sorted = entries.sort(([hlcA], [hlcB]) => hlcA.localeCompare(hlcB));
  const markers = new Map<string, import('./types').TacticalMarker>();

  for (const [hlc, evt] of sorted) {
    if (!evt || evt.t !== 'SPOTREP' || !evt.dat?.marker) continue;
    const m = evt.dat.marker;
    if (!m.id || m.lat === undefined || m.lon === undefined) continue;

    const expiresAt = m.expiresAt || (currentTimeMs + 15 * 60 * 1000);
    const isActive = m.active !== false && expiresAt > currentTimeMs;

    const marker: import('./types').TacticalMarker = {
      id: m.id,
      type: m.type || 'HOSTILE',
      lat: m.lat,
      lon: m.lon,
      reportedBy: m.reportedBy || evt.opr,
      squad: m.squad || evt.sq,
      title: m.title || 'CONTACT REPORT',
      notes: m.notes,
      hlc,
      createdAt: m.createdAt || currentTimeMs,
      expiresAt,
      active: isActive,
    };

    if (m.active === false) {
      markers.delete(m.id);
    } else {
      markers.set(m.id, marker);
    }
  }

  return markers;
}
