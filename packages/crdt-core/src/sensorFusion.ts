/**
 * Sensor-Fusion Rig Calibration & Tilt-Compensated Digital Compass Algorithm
 * Calculates accurate true heading from 3-axis accelerometer and magnetometer telemetry,
 * with hard-iron calibration and relative bearing to tactical objectives.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CompassOrientation {
  pitchDegrees: number;
  rollDegrees: number;
  magneticHeadingDegrees: number;
  trueHeadingDegrees: number; // Corrected for regional magnetic declination
  cardinal: string; // 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'
}

export interface MagnetometerCalibration {
  bias: Vector3; // Hard-iron offset (Bx, By, Bz)
  scale: Vector3; // Soft-iron scaling factors
  samplesCollected: number;
  calibrationQualityScore: number; // 0 to 100%
  isCalibrated: boolean;
}

export interface TargetNavSolution {
  targetBearingDegrees: number;
  relativeBearingDegrees: number; // 0° = straight ahead, 90° = right, 180° = behind, 270° = left
  distanceMeters: number;
  distanceFormatted: string;
  clockPosition: number; // 1 to 12 o'clock
}

export const GDANSK_MAGNETIC_DECLINATION_DEGREES = 6.2; // ~6.2° East in Baltic Coast Poland

/**
 * Converts heading degrees (0–360) to 8-point NATO cardinal direction.
 */
export function degreesToCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return cardinals[index];
}

/**
 * Converts relative bearing (0–360) to military clock direction (1–12 o'clock).
 */
export function degreesToClockPosition(deg: number): number {
  const normalized = ((deg % 360) + 360) % 360;
  const clock = Math.round(normalized / 30);
  return clock === 0 ? 12 : clock;
}

/**
 * Computes tilt-compensated true heading from 3-axis accelerometer and magnetometer vectors.
 */
export function computeTiltCompensatedHeading(
  accel: Vector3,
  mag: Vector3,
  calibration?: MagnetometerCalibration,
  magneticDeclination = GDANSK_MAGNETIC_DECLINATION_DEGREES
): CompassOrientation {
  // Apply hard-iron offset and soft-iron scale if calibration available
  let mx = mag.x;
  let my = mag.y;
  let mz = mag.z;

  if (calibration && calibration.isCalibrated) {
    mx = (mx - calibration.bias.x) * calibration.scale.x;
    my = (my - calibration.bias.y) * calibration.scale.y;
    mz = (mz - calibration.bias.z) * calibration.scale.z;
  }

  // Calculate Pitch and Roll from accelerometer
  // Pitch: rotation around Y-axis, Roll: rotation around X-axis
  const ax = accel.x;
  const ay = accel.y;
  const az = accel.z;

  const pitchRad = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
  const rollRad = Math.atan2(ay, az);

  // Tilt compensation equations: project magnetometer vector onto horizontal plane
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);
  const cosRoll = Math.cos(rollRad);
  const sinRoll = Math.sin(rollRad);

  const Xh = mx * cosPitch + mz * sinPitch;
  const Yh = mx * sinRoll * sinPitch + my * cosRoll - mz * sinRoll * cosPitch;

  // Calculate magnetic heading
  let magneticHeadingRad = Math.atan2(-Yh, Xh);
  let magneticHeadingDeg = (magneticHeadingRad * 180) / Math.PI;
  magneticHeadingDeg = ((magneticHeadingDeg % 360) + 360) % 360;

  // Apply magnetic declination to obtain True Heading (referenced to True North)
  let trueHeadingDeg = magneticHeadingDeg + magneticDeclination;
  trueHeadingDeg = ((trueHeadingDeg % 360) + 360) % 360;

  return {
    pitchDegrees: parseFloat(((pitchRad * 180) / Math.PI).toFixed(1)),
    rollDegrees: parseFloat(((rollRad * 180) / Math.PI).toFixed(1)),
    magneticHeadingDegrees: parseFloat(magneticHeadingDeg.toFixed(1)),
    trueHeadingDegrees: parseFloat(trueHeadingDeg.toFixed(1)),
    cardinal: degreesToCardinal(trueHeadingDeg),
  };
}

/**
 * Calibrates magnetometer by analyzing a collection of 3D samples taken during
 * a figure-8 rotational sweep. Computes hard-iron bias and soft-iron ellipsoidal scaling.
 */
export function calibrateMagnetometer(samples: Vector3[]): MagnetometerCalibration {
  if (samples.length < 12) {
    return {
      bias: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      samplesCollected: samples.length,
      calibrationQualityScore: 0,
      isCalibrated: false,
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const s of samples) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
    if (s.z < minZ) minZ = s.z;
    if (s.z > maxZ) maxZ = s.z;
  }

  // Hard-iron bias: centroid offset of bounding box
  const biasX = (maxX + minX) / 2;
  const biasY = (maxY + minY) / 2;
  const biasZ = (maxZ + minZ) / 2;

  // Soft-iron chord diameters
  const deltaX = (maxX - minX) / 2 || 1;
  const deltaY = (maxY - minY) / 2 || 1;
  const deltaZ = (maxZ - minZ) / 2 || 1;
  const avgDelta = (deltaX + deltaY + deltaZ) / 3;

  const scaleX = avgDelta / deltaX;
  const scaleY = avgDelta / deltaY;
  const scaleZ = avgDelta / deltaZ;

  // Compute calibration quality: sample coverage and sphere fit residual
  const radii: number[] = [];
  for (const s of samples) {
    const cx = (s.x - biasX) * scaleX;
    const cy = (s.y - biasY) * scaleY;
    const cz = (s.z - biasZ) * scaleZ;
    radii.push(Math.sqrt(cx * cx + cy * cy + cz * cz));
  }
  const meanRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
  const variance = radii.reduce((sum, r) => sum + Math.pow(r - meanRadius, 2), 0) / radii.length;
  const stdDev = Math.sqrt(variance);
  const coeffOfVariation = meanRadius > 0 ? stdDev / meanRadius : 1;

  // Quality score: lower coefficient of variation -> higher sphere circularity (100% ideal)
  const quality = Math.min(100, Math.max(10, Math.round((1 - coeffOfVariation * 2) * 100)));

  return {
    bias: { x: parseFloat(biasX.toFixed(2)), y: parseFloat(biasY.toFixed(2)), z: parseFloat(biasZ.toFixed(2)) },
    scale: { x: parseFloat(scaleX.toFixed(3)), y: parseFloat(scaleY.toFixed(3)), z: parseFloat(scaleZ.toFixed(3)) },
    samplesCollected: samples.length,
    calibrationQualityScore: quality,
    isCalibrated: quality >= 50 && samples.length >= 20,
  };
}

/**
 * Calculates Great-Circle target navigation solution (True Bearing, Relative Bearing, Distance, Clock Position)
 * from current operator position and heading towards a target waypoint.
 */
export function calculateTargetNavSolution(
  operatorLat: number,
  operatorLon: number,
  currentHeadingDeg: number,
  targetLat: number,
  targetLon: number
): TargetNavSolution {
  const R = 6371000; // Earth radius in meters
  const lat1 = (operatorLat * Math.PI) / 180;
  const lat2 = (targetLat * Math.PI) / 180;
  const dLat = ((targetLat - operatorLat) * Math.PI) / 180;
  const dLon = ((targetLon - operatorLon) * Math.PI) / 180;

  // Haversine distance
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = Math.round(R * c);

  // Initial true bearing
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearingRad = Math.atan2(y, x);
  let targetBearingDeg = (bearingRad * 180) / Math.PI;
  targetBearingDeg = ((targetBearingDeg % 360) + 360) % 360;

  // Relative bearing (relative to operator's current forward heading)
  let relativeBearingDeg = targetBearingDeg - currentHeadingDeg;
  relativeBearingDeg = ((relativeBearingDeg % 360) + 360) % 360;

  const distanceFormatted =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km`
      : `${distanceMeters} m`;

  const clockPosition = degreesToClockPosition(relativeBearingDeg);

  return {
    targetBearingDegrees: parseFloat(targetBearingDeg.toFixed(1)),
    relativeBearingDegrees: parseFloat(relativeBearingDeg.toFixed(1)),
    distanceMeters,
    distanceFormatted,
    clockPosition,
  };
}
