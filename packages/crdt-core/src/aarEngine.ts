import { CRDTEventValue, BlueForcePeer } from './types';

export interface OperatorTrajectory {
  operatorId: string;
  callsign: string;
  squad: string;
  // Coordinates as [lon, lat, timestampOffsetSeconds]
  path: [number, number, number][];
  timestamps: number[];
  totalDistanceMeters: number;
  maxSpeedMps: number;
}

export interface AAREventBookmark {
  id: string;
  timestamp: number;
  timeOffsetSeconds: number;
  timeStr: string;
  type: 'CAPT' | 'HAZ' | 'CONTACT' | 'FREEZE' | 'SOS';
  title: string;
  squad: string;
  coordinates?: [number, number]; // [lon, lat]
}

export interface ScoreDataPoint {
  timeOffsetSeconds: number;
  alphaScore: number;
  bravoScore: number;
}

export interface AARMissionReplay {
  missionId: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  trajectories: OperatorTrajectory[];
  bookmarks: AAREventBookmark[];
  scoreTimeline: ScoreDataPoint[];
}

/**
 * Calculates distance in meters between two lat/lon points.
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
 * Generates an AAR Mission Replay package with synthesized tactical trajectories
 * over the Gdańsk Oliwa terrain from mission start to finish.
 */
export function generateAARMissionReplay(
  missionId = 'GDANSK_ALPHA_2026',
  durationSeconds = 1800 // 30 minutes
): AARMissionReplay {
  const startTime = Date.now() - durationSeconds * 1000;
  const endTime = Date.now();

  // Synthetic squad waypoints around Oliwa moraine hills
  const alphaWaypoints: [number, number][] = [
    [18.545, 54.411], // Dropzone Alpha
    [18.542, 54.410],
    [18.541, 54.4095], // Bunker Pachołek
    [18.5365, 54.4065], // Ridge Oliwa
    [18.531, 54.404], // Sector Radość
    [18.528, 54.402], // Redoubt 02
  ];

  const bravoWaypoints: [number, number][] = [
    [18.523, 54.3995], // Outpost Bravo
    [18.521, 54.4005],
    [18.525, 54.4015],
    [18.528, 54.402], // Contested Bunker 02
    [18.530, 54.403],
    [18.519, 54.398], // Radar Trzy Szczyty
  ];

  function interpolatePath(
    waypoints: [number, number][],
    operatorId: string,
    callsign: string,
    squad: string,
    jitterSeed: number
  ): OperatorTrajectory {
    const steps = 60; // 60 position samples
    const path: [number, number, number][] = [];
    const timestamps: number[] = [];
    let totalDist = 0;
    let maxSpeed = 0;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const totalParam = progress * (waypoints.length - 1);
      const wpIndex = Math.min(Math.floor(totalParam), waypoints.length - 2);
      const subProgress = Math.min(Math.max(totalParam - wpIndex, 0), 1);

      const p1 = waypoints[wpIndex];
      const p2 = waypoints[wpIndex + 1];

      // Add gentle jitter for realistic trail spread
      const jitterLat = Math.sin(i * 0.4 + jitterSeed) * 0.00003;
      const jitterLon = Math.cos(i * 0.4 + jitterSeed) * 0.00004;

      const lon = p1[0] + (p2[0] - p1[0]) * subProgress + jitterLon;
      const lat = p1[1] + (p2[1] - p1[1]) * subProgress + jitterLat;
      const timeOffset = Math.round(progress * durationSeconds);

      path.push([lon, lat, timeOffset]);
      timestamps.push(startTime + timeOffset * 1000);

      if (i > 0) {
        const prev = path[i - 1];
        const dist = haversineMeters(prev[1], prev[0], lat, lon);
        const dt = Math.max(timeOffset - prev[2], 1);
        const speed = dist / dt;
        totalDist += dist;
        if (speed > maxSpeed) maxSpeed = speed;
      }
    }

    return {
      operatorId,
      callsign,
      squad,
      path,
      timestamps,
      totalDistanceMeters: Math.round(totalDist),
      maxSpeedMps: Math.round(maxSpeed * 10) / 10,
    };
  }

  const trajectories: OperatorTrajectory[] = [
    interpolatePath(alphaWaypoints, 'alpha_lead', 'Viper Actual', 'squad_alpha', 0.1),
    interpolatePath(alphaWaypoints, 'alpha_medic', 'Viper-2 (Doc)', 'squad_alpha', 0.5),
    interpolatePath(bravoWaypoints, 'bravo_scout', 'Coyote-1', 'squad_bravo', 1.2),
    interpolatePath(bravoWaypoints, 'bravo_rto', 'Coyote-2 (RTO)', 'squad_bravo', 1.8),
  ];

  const bookmarks: AAREventBookmark[] = [
    {
      id: 'bm-1',
      timestamp: startTime + 300 * 1000,
      timeOffsetSeconds: 300,
      timeStr: '00:05:00',
      type: 'CAPT',
      title: 'Squad Alpha captures Bunker Pachołek (+100 pts)',
      squad: 'squad_alpha',
      coordinates: [18.541, 54.4095],
    },
    {
      id: 'bm-2',
      timestamp: startTime + 720 * 1000,
      timeOffsetSeconds: 720,
      timeStr: '00:12:00',
      type: 'HAZ',
      title: 'Artillery Barrage in Sector Radość',
      squad: 'GAME MASTER',
      coordinates: [18.531, 54.404],
    },
    {
      id: 'bm-3',
      timestamp: startTime + 1150 * 1000,
      timeOffsetSeconds: 1150,
      timeStr: '00:19:10',
      type: 'CONTACT',
      title: 'Skirmish at Redoubt Dolina Radości (Contested)',
      squad: 'squad_alpha',
      coordinates: [18.528, 54.402],
    },
    {
      id: 'bm-4',
      timestamp: startTime + 1440 * 1000,
      timeOffsetSeconds: 1440,
      timeStr: '00:24:00',
      type: 'CAPT',
      title: 'Squad Bravo Secures Radar HQ Trzy Szczyty (+500 pts)',
      squad: 'squad_bravo',
      coordinates: [18.519, 54.398],
    },
  ];

  const scoreTimeline: ScoreDataPoint[] = [
    { timeOffsetSeconds: 0, alphaScore: 0, bravoScore: 0 },
    { timeOffsetSeconds: 300, alphaScore: 100, bravoScore: 0 },
    { timeOffsetSeconds: 600, alphaScore: 100, bravoScore: 0 },
    { timeOffsetSeconds: 900, alphaScore: 100, bravoScore: 0 },
    { timeOffsetSeconds: 1200, alphaScore: 350, bravoScore: 0 },
    { timeOffsetSeconds: 1440, alphaScore: 350, bravoScore: 500 },
    { timeOffsetSeconds: 1800, alphaScore: 350, bravoScore: 500 },
  ];

  return {
    missionId,
    startTime,
    endTime,
    durationSeconds,
    trajectories,
    bookmarks,
    scoreTimeline,
  };
}

/**
 * Samples the tactical state at a specific time offset during AAR playback.
 */
export function sampleAARStateAtTime(
  replay: AARMissionReplay,
  timeOffsetSeconds: number
): {
  activePositions: Record<string, [number, number]>;
  currentScores: { alpha: number; bravo: number };
  passedBookmarks: AAREventBookmark[];
} {
  const activePositions: Record<string, [number, number]> = {};

  for (const traj of replay.trajectories) {
    if (traj.path.length === 0) continue;

    // Find interpolation segment
    let pos: [number, number] = [traj.path[0][0], traj.path[0][1]];
    for (let i = 0; i < traj.path.length - 1; i++) {
      const p1 = traj.path[i];
      const p2 = traj.path[i + 1];
      if (timeOffsetSeconds >= p1[2] && timeOffsetSeconds <= p2[2]) {
        const factor = (timeOffsetSeconds - p1[2]) / Math.max(p2[2] - p1[2], 1);
        pos = [
          p1[0] + (p2[0] - p1[0]) * factor,
          p1[1] + (p2[1] - p1[1]) * factor,
        ];
        break;
      } else if (timeOffsetSeconds > p2[2]) {
        pos = [p2[0], p2[1]];
      }
    }
    activePositions[traj.operatorId] = pos;
  }

  // Find score at time
  let alphaScore = 0;
  let bravoScore = 0;
  for (const point of replay.scoreTimeline) {
    if (point.timeOffsetSeconds <= timeOffsetSeconds) {
      alphaScore = point.alphaScore;
      bravoScore = point.bravoScore;
    }
  }

  const passedBookmarks = replay.bookmarks.filter(
    (b) => b.timeOffsetSeconds <= timeOffsetSeconds
  );

  return {
    activePositions,
    currentScores: { alpha: alphaScore, bravo: bravoScore },
    passedBookmarks,
  };
}
