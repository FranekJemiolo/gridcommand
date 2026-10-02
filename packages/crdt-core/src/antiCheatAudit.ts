import { CRDTEventValue, MissionGraph, OperatorRosterEntry } from './types';
import { verify } from '@gridcommand/crypto';

export type AuditAnomalyType =
  | 'SPEED_ANOMALY'
  | 'TELEPORTATION'
  | 'CLOCK_SKEW_FUTURE'
  | 'CLOCK_ROLLBACK'
  | 'GEOFENCE_VIOLATION'
  | 'INVALID_SIGNATURE'
  | 'REVOKED_OPERATOR';

export interface AuditAnomaly {
  id: string;
  type: AuditAnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operatorId: string;
  callsign?: string;
  timestamp: number;
  description: string;
  evidence: Record<string, any>;
}

export interface AuditReport {
  missionId: string;
  auditedAt: number;
  totalEventsInspected: number;
  anomaliesFound: number;
  passed: boolean;
  integrityScore: number; // 0 to 100
  anomalies: AuditAnomaly[];
  summary: string;
}

/**
 * Calculates distance in meters between two lat/lon coordinates.
 */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Analyzes CRDT event ledger and validates all events against physical and cryptographic invariants.
 */
export function runAntiCheatAudit(options: {
  missionId?: string;
  events: Record<string, CRDTEventValue>;
  roster?: OperatorRosterEntry[];
  graph?: MissionGraph;
  maxSpeedMps?: number; // Default 10 m/s (~36 km/h) for dismounted infantry
  currentTime?: number;
}): AuditReport {
  const {
    missionId = 'MISSION_AUDIT',
    events,
    roster = [],
    graph,
    maxSpeedMps = 10,
    currentTime = Date.now(),
  } = options;

  const anomalies: AuditAnomaly[] = [];
  const eventEntries = Object.entries(events);

  // Group events by operator for sequential motion and clock analysis
  const eventsByOperator: Record<
    string,
    Array<{ hlcStr: string; time: number; event: CRDTEventValue }>
  > = {};

  const rosterMap = new Map<string, OperatorRosterEntry>();
  roster.forEach((r) => rosterMap.set(r.id, r));

  for (const [hlcStr, evt] of eventEntries) {
    const operatorId = evt.opr;
    if (!operatorId) continue;

    // Parse HLC physical timestamp
    const parts = hlcStr.split('-');
    const physicalIso = parts[0] ? parts[0] + (parts[1] ? `-${parts[1]}` : '') + (parts[2] ? `-${parts[2]}` : '') : '';
    const isoClean = physicalIso.split('Z')[0] + 'Z';
    const timestamp = Date.parse(isoClean) || currentTime;

    if (!eventsByOperator[operatorId]) {
      eventsByOperator[operatorId] = [];
    }
    eventsByOperator[operatorId].push({ hlcStr, time: timestamp, event: evt });

    // Check 1: Clock skew in future
    if (timestamp > currentTime + 60000) {
      anomalies.push({
        id: `anom_future_${hlcStr}`,
        type: 'CLOCK_SKEW_FUTURE',
        severity: 'HIGH',
        operatorId,
        timestamp,
        description: `Event timestamp is ${(timestamp - currentTime) / 1000}s ahead of physical wall-clock time.`,
        evidence: { claimedTime: timestamp, currentTime, hlc: hlcStr },
      });
    }

    // Check 2: Revoked operator submitting events
    const opRecord = rosterMap.get(operatorId);
    if (opRecord && opRecord.revoked) {
      anomalies.push({
        id: `anom_revoked_${hlcStr}`,
        type: 'REVOKED_OPERATOR',
        severity: 'CRITICAL',
        operatorId,
        callsign: opRecord.callsign,
        timestamp,
        description: `Action submitted by revoked operator "${opRecord.callsign}".`,
        evidence: { operatorId, hlc: hlcStr },
      });
    }

    // Check 3: Cryptographic proof validation for CAPT events
    if (evt.t === 'CAPT' && evt.dat?.prf && evt.dat?.o && opRecord?.publicKey) {
      const proofStr = String(evt.dat.prf);
      const isSigValid = verify(proofStr, evt.dat.o, opRecord.publicKey);
      if (!isSigValid) {
        anomalies.push({
          id: `anom_sig_${hlcStr}`,
          type: 'INVALID_SIGNATURE',
          severity: 'CRITICAL',
          operatorId,
          callsign: opRecord.callsign,
          timestamp,
          description: `Invalid cryptographic signature on capture event for objective "${evt.dat.o}".`,
          evidence: { objective: evt.dat.o, proof: proofStr, pubKey: opRecord.publicKey },
        });
      }
    }

    // Check 4: Geofence violation for CAPT events
    if (evt.t === 'CAPT' && graph && evt.dat?.o && graph.nodes[evt.dat.o]) {
      const node = graph.nodes[evt.dat.o];
      const opLat = evt.dat.lat;
      const opLon = evt.dat.lon;
      const radius = node.geofenceRadiusMeters || 50;

      if (opLat !== undefined && opLon !== undefined && node.lat !== undefined && node.lon !== undefined) {
        const dist = haversineMeters(opLat, opLon, node.lat, node.lon);
        if (dist > radius) {
          anomalies.push({
            id: `anom_geo_${hlcStr}`,
            type: 'GEOFENCE_VIOLATION',
            severity: 'HIGH',
            operatorId,
            timestamp,
            description: `Capture claimed at distance ${Math.round(dist)}m exceeding geofence limit of ${radius}m.`,
            evidence: { distanceMeters: Math.round(dist), geofenceRadius: radius, objectiveId: node.id },
          });
        }
      }
    }
  }

  // Check 5 & 6: Sequential Movement and Speed Verification per operator
  for (const [operatorId, opEvents] of Object.entries(eventsByOperator)) {
    // Sort events by timestamp
    opEvents.sort((a, b) => a.time - b.time);

    for (let i = 0; i < opEvents.length - 1; i++) {
      const e1 = opEvents[i];
      const e2 = opEvents[i + 1];

      // Clock rollback
      if (e2.time < e1.time) {
        anomalies.push({
          id: `anom_rollback_${e2.hlcStr}`,
          type: 'CLOCK_ROLLBACK',
          severity: 'HIGH',
          operatorId,
          timestamp: e2.time,
          description: `Logical timestamp rolled backwards by ${(e1.time - e2.time) / 1000}s.`,
          evidence: { prevTime: e1.time, nextTime: e2.time },
        });
      }

      // Movement bounds (BFT telemetry check)
      if (e1.event.t === 'BFT' && e2.event.t === 'BFT') {
        const p1Lat = e1.event.dat?.lat;
        const p1Lon = e1.event.dat?.lon;
        const p2Lat = e2.event.dat?.lat;
        const p2Lon = e2.event.dat?.lon;

        if (p1Lat !== undefined && p1Lon !== undefined && p2Lat !== undefined && p2Lon !== undefined) {
          const dist = haversineMeters(p1Lat, p1Lon, p2Lat, p2Lon);
          const dtSeconds = Math.max((e2.time - e1.time) / 1000, 0.5);
          const speedMps = dist / dtSeconds;

          // Teleportation (> 200m in < 3s)
          if (dist > 200 && dtSeconds <= 3) {
            anomalies.push({
              id: `anom_teleport_${e2.hlcStr}`,
              type: 'TELEPORTATION',
              severity: 'CRITICAL',
              operatorId,
              timestamp: e2.time,
              description: `Instantaneous displacement of ${Math.round(dist)}m in ${dtSeconds.toFixed(1)}s (teleportation anomaly).`,
              evidence: { distanceMeters: Math.round(dist), dtSeconds, speedMps: Math.round(speedMps) },
            });
          } else if (speedMps > maxSpeedMps) {
            anomalies.push({
              id: `anom_speed_${e2.hlcStr}`,
              type: 'SPEED_ANOMALY',
              severity: 'MEDIUM',
              operatorId,
              timestamp: e2.time,
              description: `Operator speed ${speedMps.toFixed(1)} m/s (${Math.round(speedMps * 3.6)} km/h) exceeds physical dismounted limit (${maxSpeedMps} m/s).`,
              evidence: { distanceMeters: Math.round(dist), dtSeconds, speedMps: Math.round(speedMps * 10) / 10 },
            });
          }
        }
      }
    }
  }

  // Calculate integrity score (100 minus weighted penalties)
  let penalty = 0;
  for (const anom of anomalies) {
    if (anom.severity === 'CRITICAL') penalty += 35;
    else if (anom.severity === 'HIGH') penalty += 20;
    else if (anom.severity === 'MEDIUM') penalty += 10;
    else penalty += 5;
  }
  const integrityScore = Math.max(0, 100 - penalty);
  const passed = integrityScore >= 80 && !anomalies.some((a) => a.severity === 'CRITICAL');

  const summary = passed
    ? `AUDIT PASSED: ${eventEntries.length} events inspected. Integrity score ${integrityScore}/100. No critical security breaches or sensor invariant violations detected.`
    : `AUDIT FAILED: ${anomalies.length} anomaly flags identified across ${eventEntries.length} events. Integrity score ${integrityScore}/100. Critical or suspicious behavior requires GM review.`;

  return {
    missionId,
    auditedAt: currentTime,
    totalEventsInspected: eventEntries.length,
    anomaliesFound: anomalies.length,
    passed,
    integrityScore,
    anomalies,
    summary,
  };
}
