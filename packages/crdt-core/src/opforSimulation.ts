/**
 * Autonomous AI OPFOR (Red-Team) Bot Simulation & Procedural Scenario Generator
 * Simulates adversarial ground combatants with patrol waypoint AI, proximity engagement detection,
 * and generates procedural military scenarios over physical terrain.
 */

import { BlueForcePeer, MissionGraph } from './types';
import { latLonToMGRS } from './mgrs';

export type OpforState = 'PATROLLING' | 'SENTRY' | 'INVESTIGATING' | 'ENGAGING';
export type OpforRole = 'PATROL' | 'SENTRY' | 'SNIPER' | 'QRF';

export interface OpforBot {
  id: string;
  callsign: string;
  role: OpforRole;
  lat: number;
  lon: number;
  heading: number;
  speedMps: number;
  patrolWaypoints: [number, number][]; // [lon, lat]
  currentWaypointIndex: number;
  state: OpforState;
  detectionRadiusMeters: number;
  healthPercent: number;
  lastContactAt?: number;
}

export interface OpforContactAlert {
  id: string;
  botId: string;
  botCallsign: string;
  targetPeerId: string;
  targetCallsign: string;
  distanceMeters: number;
  coordinates: [number, number]; // [lon, lat]
  mgrs: string;
  timestamp: number;
  description: string;
}

export interface ProceduralScenario {
  scenarioId: string;
  name: string;
  description: string;
  centerCoordinates: [number, number];
  graph: MissionGraph;
  opforBots: OpforBot[];
  recommendedDurationMinutes: number;
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
 * Advances OPFOR bot simulation by deltaSeconds, updating patrol positions and checking
 * for proximity contacts against Blue Force peers.
 */
export function tickOpforSimulation(options: {
  bots: OpforBot[];
  deltaSeconds: number;
  blueForcePeers?: BlueForcePeer[];
  currentTimeMs?: number;
}): { updatedBots: OpforBot[]; contactAlerts: OpforContactAlert[] } {
  const { bots, deltaSeconds, blueForcePeers = [], currentTimeMs = Date.now() } = options;
  const contactAlerts: OpforContactAlert[] = [];

  const updatedBots = bots.map((bot) => {
    let lat = bot.lat;
    let lon = bot.lon;
    let heading = bot.heading;
    let currentWaypointIndex = bot.currentWaypointIndex;
    let state = bot.state;
    let lastContactAt = bot.lastContactAt;

    // Check proximity to Blue Force peers
    let engagedPeer: BlueForcePeer | null = null;
    let closestDistance = Infinity;

    for (const peer of blueForcePeers) {
      const dist = haversineMeters(lat, lon, peer.lat, peer.lon);
      if (dist < bot.detectionRadiusMeters && dist < closestDistance) {
        closestDistance = dist;
        engagedPeer = peer;
      }
    }

    if (engagedPeer) {
      state = 'ENGAGING';
      lastContactAt = currentTimeMs;

      // Create contact alert
      contactAlerts.push({
        id: `alert-${bot.id}-${Date.now()}`,
        botId: bot.id,
        botCallsign: bot.callsign,
        targetPeerId: engagedPeer.id,
        targetCallsign: engagedPeer.callsign,
        distanceMeters: Math.round(closestDistance),
        coordinates: [lon, lat],
        mgrs: latLonToMGRS(lat, lon).formatted,
        timestamp: currentTimeMs,
        description: `Visual skirmish: ${bot.callsign} (${bot.role}) engaged ${engagedPeer.callsign} at ${Math.round(closestDistance)}m.`,
      });

      // Turn towards engaged peer
      const dLat = engagedPeer.lat - lat;
      const dLon = engagedPeer.lon - lon;
      heading = ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
    } else {
      // Normal patrol movement along waypoints
      if (bot.patrolWaypoints.length > 0) {
        state = 'PATROLLING';
        const targetWp = bot.patrolWaypoints[currentWaypointIndex]; // [lon, lat]
        const distToWp = haversineMeters(lat, lon, targetWp[1], targetWp[0]);

        if (distToWp < 10) {
          // Reached waypoint, advance to next in loop
          currentWaypointIndex = (currentWaypointIndex + 1) % bot.patrolWaypoints.length;
        } else {
          // Move towards target waypoint
          const dLat = targetWp[1] - lat;
          const dLon = targetWp[0] - lon;
          heading = ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;

          const travelDistMeters = Math.min(bot.speedMps * deltaSeconds, distToWp);
          const radHeading = (heading * Math.PI) / 180;
          lat += (travelDistMeters * Math.cos(radHeading)) / 111000;
          lon += (travelDistMeters * Math.sin(radHeading)) / (111000 * Math.cos((lat * Math.PI) / 180));
        }
      }
    }

    return {
      ...bot,
      lat: parseFloat(lat.toFixed(6)),
      lon: parseFloat(lon.toFixed(6)),
      heading: Math.round(heading),
      currentWaypointIndex,
      state,
      lastContactAt,
    };
  });

  return { updatedBots, contactAlerts };
}

/**
 * Procedurally generates a balanced military simulation scenario based on terrain center coordinates.
 */
export function generateProceduralScenario(
  centerLat = 54.4095,
  centerLon = 18.541,
  type: 'PATROL' | 'RAID' | 'DEFENSE' = 'RAID'
): ProceduralScenario {
  const scenarioId = `OP_${type}_${Date.now().toString(36).toUpperCase()}`;

  // Procedural Objectives based on distance offsets
  const nodes: Record<string, any> = {
    insertion_dz: {
      id: 'insertion_dz',
      name: 'Dropzone Alpha (Infiltration)',
      prerequisites: [],
      status: 'RESOLVED',
      owner: 'squad_alpha',
      points: 50,
      lat: centerLat - 0.008,
      lon: centerLon - 0.006,
      geofenceRadiusMeters: 40,
      captureMechanism: 'INSTANT_NFC',
    },
    relay_crest: {
      id: 'relay_crest',
      name: 'Radar Ridge (Relay Station)',
      prerequisites: ['insertion_dz'],
      status: 'ACTIVE',
      owner: null,
      points: 150,
      lat: centerLat - 0.002,
      lon: centerLon + 0.003,
      geofenceRadiusMeters: 55,
      captureMechanism: 'TIMED_HOLD',
      holdDurationSeconds: 120,
    },
    bunker_complex: {
      id: 'bunker_complex',
      name: 'Subterranean Bunker Redoubt',
      prerequisites: ['relay_crest'],
      status: 'LOCKED',
      owner: null,
      points: 300,
      lat: centerLat + 0.005,
      lon: centerLon - 0.002,
      geofenceRadiusMeters: 65,
      captureMechanism: 'SYNC_CAPTURE',
      requiredOperators: 2,
    },
    extraction_lz: {
      id: 'extraction_lz',
      name: 'Exfiltration LZ Echo',
      prerequisites: ['bunker_complex'],
      status: 'LOCKED',
      owner: null,
      points: 500,
      lat: centerLat + 0.01,
      lon: centerLon + 0.008,
      geofenceRadiusMeters: 75,
      captureMechanism: 'TIMED_HOLD',
      holdDurationSeconds: 180,
    },
  };

  // Procedural OPFOR Red-Team Bots patrolling around key objectives
  const opforBots: OpforBot[] = [
    {
      id: 'opfor_sentry_1',
      callsign: 'Red-Sentry-1',
      role: 'SENTRY',
      lat: centerLat - 0.001,
      lon: centerLon + 0.003,
      heading: 180,
      speedMps: 1.2,
      patrolWaypoints: [
        [centerLon + 0.002, centerLat - 0.001],
        [centerLon + 0.004, centerLat - 0.001],
        [centerLon + 0.003, centerLat - 0.003],
      ],
      currentWaypointIndex: 0,
      state: 'PATROLLING',
      detectionRadiusMeters: 65,
      healthPercent: 100,
    },
    {
      id: 'opfor_patrol_2',
      callsign: 'Red-Patrol-2',
      role: 'PATROL',
      lat: centerLat + 0.004,
      lon: centerLon - 0.001,
      heading: 90,
      speedMps: 2.0,
      patrolWaypoints: [
        [centerLon - 0.003, centerLat + 0.004],
        [centerLon - 0.001, centerLat + 0.006],
        [centerLon + 0.001, centerLat + 0.004],
      ],
      currentWaypointIndex: 0,
      state: 'PATROLLING',
      detectionRadiusMeters: 75,
      healthPercent: 100,
    },
    {
      id: 'opfor_qrf_3',
      callsign: 'Red-QRF-3',
      role: 'QRF',
      lat: centerLat + 0.009,
      lon: centerLon + 0.007,
      heading: 270,
      speedMps: 3.5,
      patrolWaypoints: [
        [centerLon + 0.006, centerLat + 0.009],
        [centerLon + 0.009, centerLat + 0.011],
      ],
      currentWaypointIndex: 0,
      state: 'PATROLLING',
      detectionRadiusMeters: 90,
      healthPercent: 100,
    },
  ];

  return {
    scenarioId,
    name: `Operation ${type === 'RAID' ? 'Iron Moraine' : type === 'DEFENSE' ? 'Baltic Citadel' : 'Pine Recon'}`,
    description: `Procedural ${type} tactical simulation generated over MGRS sector ${latLonToMGRS(centerLat, centerLon).formatted}.`,
    centerCoordinates: [centerLon, centerLat],
    graph: { nodes },
    opforBots,
    recommendedDurationMinutes: 45,
  };
}
