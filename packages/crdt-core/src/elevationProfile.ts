/**
 * Tactical Line-of-Sight (LOS) & Terrain Elevation Profile Engine
 * Computes topographical cross-sections, ridge obstructions, and Fresnel radio clearance.
 */

export interface ElevationPoint {
  distanceMeters: number;
  lat: number;
  lon: number;
  groundElevation: number; // meters above sea level
  rayElevation: number; // direct optical line of sight ray
  clearance: number; // rayElevation - groundElevation
  isObstructed: boolean;
}

export interface LOSAnalysis {
  distanceMeters: number;
  bearingDeg: number;
  isClear: boolean;
  minElevation: number;
  maxElevation: number;
  netAscent: number;
  netDescent: number;
  startElevation: number;
  targetElevation: number;
  maxObstructionMeters: number;
  obstructionPoint: ElevationPoint | null;
  fresnelRadiusMidpointMeters: number; // 868 MHz LoRa radio clearance boundary
  profile: ElevationPoint[];
}

/**
 * Analytical Digital Elevation Model (DEM) for Oliwa / Trójmiejski Park Krajobrazowy
 * Models moraine hills, ridges (Pachołek, Góra Kościuszki, Trzy Szczyty), and valleys (Dolina Radości).
 */
export function getTerrainElevation(lat: number, lon: number): number {
  // Center coordinates around Oliwa moraine hills (~54.405 N, 18.535 E)
  const dLat = (lat - 54.405) * 111000;
  const dLon = (lon - 18.535) * 65000;

  // Base coastal elevation
  const base = 45;

  // Main Oliwa moraine ridge (stretching NW-SE)
  const ridge1 = 85 * Math.exp(-((dLat * 0.7 - dLon * 0.4) ** 2) / (600 ** 2));

  // Pachołek peak hill (~54.4095 N, 18.5410 E)
  const distPacholekSq = (lat - 54.4095) ** 2 * 111000 ** 2 + (lon - 18.541) ** 2 * 65000 ** 2;
  const pacholekHill = 62 * Math.exp(-distPacholekSq / (280 ** 2));

  // Trzy Szczyty ridge (~54.398 N, 18.519 E)
  const distTrzySzczytySq = (lat - 54.398) ** 2 * 111000 ** 2 + (lon - 18.519) ** 2 * 65000 ** 2;
  const trzySzczyty = 90 * Math.exp(-distTrzySzczytySq / (400 ** 2));

  // Dolina Radości depression
  const valleyDist = Math.abs(dLat * 0.3 + dLon * 0.9);
  const valleyDamping = 1 - 0.4 * Math.exp(-(valleyDist ** 2) / (350 ** 2));

  // Secondary undulations
  const microUndulation = 6 * Math.sin(dLat / 120) * Math.cos(dLon / 140);

  const elev = (base + ridge1 + pacholekHill + trzySzczyty + microUndulation) * valleyDamping;
  return Math.max(12, Math.round(elev * 10) / 10);
}

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  const theta = Math.atan2(y, x);

  return ((theta * 180) / Math.PI + 360) % 360;
}

export function computeElevationProfile(
  start: { lat: number; lon: number; alt?: number },
  target: { lat: number; lon: number; alt?: number },
  samples = 32,
  demProvider: (lat: number, lon: number) => number = getTerrainElevation
): LOSAnalysis {
  const totalDist = calculateDistanceMeters(start.lat, start.lon, target.lat, target.lon);
  const bearing = calculateBearingDeg(start.lat, start.lon, target.lat, target.lon);

  // Operator eye level / antenna height (+1.8m for chest-mounted antenna)
  const startAlt = (start.alt !== undefined ? start.alt : demProvider(start.lat, start.lon)) + 1.8;
  // Target objective height (+1.5m above ground)
  const targetAlt = (target.alt !== undefined ? target.alt : demProvider(target.lat, target.lon)) + 1.5;

  const profile: ElevationPoint[] = [];
  let minElev = Infinity;
  let maxElev = -Infinity;
  let netAscent = 0;
  let netDescent = 0;
  let prevGround = startAlt;

  let isClear = true;
  let maxObstruction = 0;
  let worstPoint: ElevationPoint | null = null;

  for (let i = 0; i <= samples; i++) {
    const fraction = i / samples;
    const curLat = start.lat + (target.lat - start.lat) * fraction;
    const curLon = start.lon + (target.lon - start.lon) * fraction;
    const distanceMeters = totalDist * fraction;

    const groundElevation = demProvider(curLat, curLon);
    const rayElevation = startAlt + (targetAlt - startAlt) * fraction;
    const clearance = rayElevation - groundElevation;
    const isObstructed = clearance < 0;

    if (isObstructed) {
      isClear = false;
      const obstructionDepth = Math.abs(clearance);
      if (obstructionDepth > maxObstruction) {
        maxObstruction = obstructionDepth;
        worstPoint = {
          distanceMeters,
          lat: curLat,
          lon: curLon,
          groundElevation,
          rayElevation,
          clearance,
          isObstructed: true,
        };
      }
    }

    if (groundElevation < minElev) minElev = groundElevation;
    if (groundElevation > maxElev) maxElev = groundElevation;

    if (i > 0) {
      const diff = groundElevation - prevGround;
      if (diff > 0) netAscent += diff;
      else netDescent += Math.abs(diff);
    }
    prevGround = groundElevation;

    profile.push({
      distanceMeters,
      lat: curLat,
      lon: curLon,
      groundElevation,
      rayElevation,
      clearance,
      isObstructed,
    });
  }

  // 1st Fresnel zone radius at midpoint for 868 MHz (wavelength lambda = ~0.345m)
  // r = sqrt( (lambda * D) / 4 ) = sqrt( (0.345 * totalDist) / 4 )
  const fresnelRadiusMidpointMeters =
    totalDist > 0 ? Math.round(Math.sqrt((0.345 * totalDist) / 4) * 10) / 10 : 0;

  return {
    distanceMeters: Math.round(totalDist),
    bearingDeg: Math.round(bearing),
    isClear,
    minElevation: Math.round(minElev),
    maxElevation: Math.round(maxElev),
    netAscent: Math.round(netAscent),
    netDescent: Math.round(netDescent),
    startElevation: Math.round(startAlt),
    targetElevation: Math.round(targetAlt),
    maxObstructionMeters: Math.round(maxObstruction * 10) / 10,
    obstructionPoint: worstPoint,
    fresnelRadiusMidpointMeters,
    profile,
  };
}
