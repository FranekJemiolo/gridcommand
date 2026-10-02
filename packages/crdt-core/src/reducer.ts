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
