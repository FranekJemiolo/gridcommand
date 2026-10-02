/**
 * ATAK / CivTAK Cursor-on-Target (CoT) XML Gateway
 * Implements MIL-STD-2525 and MITRE Cursor-on-Target XML schema conversion
 * for bidirectional integration between GridCommand and ATAK / WinTAK / QGIS.
 */

import { BlueForcePeer, TacticalMarker, MissionGraph } from './types';

export interface CoTPoint {
  lat: number;
  lon: number;
  hae: number; // Height above ellipsoid in meters
  ce: number;  // Circular error in meters (accuracy)
  le: number;  // Linear error in meters
}

export interface CoTEvent {
  uid: string;
  type: string; // MIL-STD-2525 symbol code (e.g. 'a-f-G-U-C' for friendly combat unit)
  time: string; // ISO 8601 UTC
  start: string;
  stale: string;
  how: 'm-g' | 'h-e' | 'm-r' | 'non-CoT'; // 'm-g' = machine GPS, 'h-e' = human entered
  point: CoTPoint;
  callsign: string;
  group?: string;
  remarks?: string;
  battery?: number;
}

/**
 * Maps GridCommand BlueForce squad role to standard MIL-STD-2525 CoT type.
 * 'a-f-G-U-C' = Atom - Friendly - Ground - Unit - Combat
 */
export function roleToCoTType(role?: string): string {
  switch (role) {
    case 'MEDIC':
      return 'a-f-G-U-C-M'; // Friendly Medical
    case 'RTO':
      return 'a-f-G-U-C-S'; // Friendly Signal / Comms
    case 'MARKSMAN':
      return 'a-f-G-U-C-I'; // Friendly Infantry Marksman
    case 'LEADER':
      return 'a-f-G-U-C-H'; // Friendly HQ / Command
    default:
      return 'a-f-G-U-C';   // Standard Friendly Infantry
  }
}

/**
 * Converts a GridCommand BlueForce peer node into an ATAK CoT Event XML string.
 */
export function peerToCoTEvent(peer: BlueForcePeer, staleDurationSeconds = 120): string {
  const now = new Date();
  const timeStr = now.toISOString();
  const staleStr = new Date(now.getTime() + staleDurationSeconds * 1000).toISOString();
  const cotType = roleToCoTType(peer.role);
  const batteryPct = peer.battery ?? 100;
  const elevation = peer.alt ?? 110;

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<event version="2.0" uid="GRIDCOMMAND-${peer.id}" type="${cotType}" time="${timeStr}" start="${timeStr}" stale="${staleStr}" how="m-g">\n` +
    `  <point lat="${peer.lat.toFixed(6)}" lon="${peer.lon.toFixed(6)}" hae="${elevation.toFixed(1)}" ce="2.5" le="5.0"/>\n` +
    `  <detail>\n` +
    `    <contact callsign="${peer.callsign}" endpoint="mesh:gridcommand"/>\n` +
    `    <group name="${peer.squad.toUpperCase()}" role="${peer.role ?? 'OPERATOR'}"/>\n` +
    `    <status battery="${batteryPct}"/>\n` +
    `    <precisionlocation geopointsrc="GPS" altsrc="DTED2"/>\n` +
    `  </detail>\n` +
    `</event>`
  );
}

/**
 * Converts a GridCommand Tactical SPOTREP Marker into an ATAK CoT XML event.
 */
export function markerToCoTEvent(marker: TacticalMarker, staleDurationSeconds = 600): string {
  const timeStr = new Date(marker.createdAt).toISOString();
  const staleStr = new Date(marker.createdAt + staleDurationSeconds * 1000).toISOString();

  // CoT marker types:
  // 'b-m-p-s-p-loc' = Spotrep
  // 'b-r-f-h-c' = Hazard
  // 'b-a-o-pan' = Objective
  let cotType = 'b-m-p-s-p-loc';
  if (marker.type === 'HAZARD') cotType = 'b-r-f-h-c';
  if (marker.type === 'HOSTILE') cotType = 'a-h-G'; // Hostile Ground Contact

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<event version="2.0" uid="SPOTREP-${marker.id}" type="${cotType}" time="${timeStr}" start="${timeStr}" stale="${staleStr}" how="h-e">\n` +
    `  <point lat="${marker.lat.toFixed(6)}" lon="${marker.lon.toFixed(6)}" hae="100.0" ce="10.0" le="10.0"/>\n` +
    `  <detail>\n` +
    `    <contact callsign="${marker.title}"/>\n` +
    `    <remarks>${marker.notes || marker.title} [Squad ${marker.squad.toUpperCase()}]</remarks>\n` +
    `  </detail>\n` +
    `</event>`
  );
}

/**
 * Converts GridCommand mission objective nodes into ATAK Waypoints/Targets.
 */
export function objectiveToCoTEvent(nodeId: string, node: any, staleDurationSeconds = 86400): string {
  const now = new Date();
  const timeStr = now.toISOString();
  const staleStr = new Date(now.getTime() + staleDurationSeconds * 1000).toISOString();
  const lat = node.lat ?? 54.4095;
  const lon = node.lon ?? 18.541;

  // Objective state determines CoT atom status
  const cotType = node.status === 'RESOLVED' ? 'b-m-p-s-p-op-comp' : 'a-u-G';

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<event version="2.0" uid="OBJ-${nodeId}" type="${cotType}" time="${timeStr}" start="${timeStr}" stale="${staleStr}" how="h-e">\n` +
    `  <point lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}" hae="115.0" ce="5.0" le="5.0"/>\n` +
    `  <detail>\n` +
    `    <contact callsign="${node.name}"/>\n` +
    `    <remarks>Objective: ${node.name} [Points: ${node.points}, Status: ${node.status}, Owner: ${node.owner || 'NONE'}]</remarks>\n` +
    `  </detail>\n` +
    `</event>`
  );
}

/**
 * Exports complete tactical battlespace into a multi-event ATAK CoT XML package.
 */
export function exportBattlespaceToCoT(options: {
  peers?: BlueForcePeer[];
  graph?: MissionGraph;
  markers?: TacticalMarker[];
}): string {
  const { peers = [], graph, markers = [] } = options;
  const cotEvents: string[] = [];

  peers.forEach((peer) => {
    cotEvents.push(peerToCoTEvent(peer));
  });

  markers.forEach((marker) => {
    cotEvents.push(markerToCoTEvent(marker));
  });

  if (graph && graph.nodes) {
    Object.entries(graph.nodes).forEach(([id, node]) => {
      cotEvents.push(objectiveToCoTEvent(id, node));
    });
  }

  return cotEvents.join('\n\n');
}

/**
 * Parses an incoming ATAK CoT XML string into a structured CoTEvent.
 */
export function parseCoTEvent(xmlStr: string): CoTEvent | null {
  try {
    const uidMatch = xmlStr.match(/uid=["']([^"']+)["']/);
    const typeMatch = xmlStr.match(/type=["']([^"']+)["']/);
    const timeMatch = xmlStr.match(/time=["']([^"']+)["']/);
    const startMatch = xmlStr.match(/start=["']([^"']+)["']/);
    const staleMatch = xmlStr.match(/stale=["']([^"']+)["']/);
    const howMatch = xmlStr.match(/how=["']([^"']+)["']/);

    const latMatch = xmlStr.match(/lat=["']([^"']+)["']/);
    const lonMatch = xmlStr.match(/lon=["']([^"']+)["']/);
    const haeMatch = xmlStr.match(/hae=["']([^"']+)["']/);
    const ceMatch = xmlStr.match(/ce=["']([^"']+)["']/);
    const leMatch = xmlStr.match(/le=["']([^"']+)["']/);

    const callsignMatch = xmlStr.match(/callsign=["']([^"']+)["']/);
    const groupMatch = xmlStr.match(/group\s+name=["']([^"']+)["']/);
    const remarksMatch = xmlStr.match(/<remarks>([^<]+)<\/remarks>/);

    if (!uidMatch || !typeMatch || !latMatch || !lonMatch) {
      return null;
    }

    return {
      uid: uidMatch[1],
      type: typeMatch[1],
      time: timeMatch ? timeMatch[1] : new Date().toISOString(),
      start: startMatch ? startMatch[1] : new Date().toISOString(),
      stale: staleMatch ? staleMatch[1] : new Date().toISOString(),
      how: (howMatch ? howMatch[1] : 'm-g') as any,
      point: {
        lat: parseFloat(latMatch[1]),
        lon: parseFloat(lonMatch[1]),
        hae: haeMatch ? parseFloat(haeMatch[1]) : 0,
        ce: ceMatch ? parseFloat(ceMatch[1]) : 0,
        le: leMatch ? parseFloat(leMatch[1]) : 0,
      },
      callsign: callsignMatch ? callsignMatch[1] : uidMatch[1],
      group: groupMatch ? groupMatch[1] : undefined,
      remarks: remarksMatch ? remarksMatch[1] : undefined,
    };
  } catch {
    return null;
  }
}
