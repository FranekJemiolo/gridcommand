/**
 * Tactical Environment, Weather & Electronic Warfare (EW) Simulation Engine
 * Models real-time meteorological conditions, smoke screen dispersion with wind vectors,
 * and deployable EW Jamming Spheres affecting RF link performance and GPS accuracy.
 */

export type WeatherType = 'CLEAR' | 'OVERCAST' | 'RAIN' | 'HEAVY_RAIN' | 'THERMAL_FOG' | 'SMOKE_SCREEN';
export type EWBand = 'GPS_L1' | 'BLE_2400' | 'LORA_868' | 'BROADBAND';

export interface WeatherState {
  type: WeatherType;
  temperatureC: number;
  precipitationMmPerHour: number;
  windSpeedMps: number;
  windAzimuthDegrees: number; // 0 to 360 (0 = from North, 90 = from East)
  visibilityMeters: number;
  humidityPercent: number;
  movementSpeedModifier: number; // 0.4 to 1.0 (multiplier on operator movement)
  rfWetCanopyExtraLossDbPerMeter: number; // Extra RF absorption due to water on foliage
}

export interface SmokeScreenEmitter {
  id: string;
  sourceLat: number;
  sourceLon: number;
  deployedAt: number; // timestamp
  durationSeconds: number;
  initialRadiusMeters: number;
  maxRadiusMeters: number;
}

export interface EWJammingZone {
  id: string;
  name: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
  band: EWBand;
  powerDbm: number; // Transmitter EIRP, e.g. +30 dBm (1 Watt)
  active: boolean;
}

export interface EWInterferenceAssessment {
  isJammed: boolean;
  jammerId?: string;
  distanceToJammerMeters?: number;
  packetLossRate: number; // 0.0 to 1.0
  snrDegradationDb: number;
  effectiveGpsErrorMeters: number; // Nominal GPS error (e.g. 2.5m) inflated by jamming
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
 * Computes environmental conditions and impact factors on movement and RF.
 */
export function computeWeatherState(type: WeatherType = 'RAIN'): WeatherState {
  switch (type) {
    case 'CLEAR':
      return {
        type: 'CLEAR',
        temperatureC: 18.5,
        precipitationMmPerHour: 0,
        windSpeedMps: 2.5,
        windAzimuthDegrees: 240,
        visibilityMeters: 10000,
        humidityPercent: 55,
        movementSpeedModifier: 1.0,
        rfWetCanopyExtraLossDbPerMeter: 0.0,
      };
    case 'OVERCAST':
      return {
        type: 'OVERCAST',
        temperatureC: 14.0,
        precipitationMmPerHour: 0.2,
        windSpeedMps: 4.8,
        windAzimuthDegrees: 270,
        visibilityMeters: 6500,
        humidityPercent: 75,
        movementSpeedModifier: 0.95,
        rfWetCanopyExtraLossDbPerMeter: 0.01,
      };
    case 'RAIN':
      return {
        type: 'RAIN',
        temperatureC: 11.2,
        precipitationMmPerHour: 6.5,
        windSpeedMps: 7.2,
        windAzimuthDegrees: 310,
        visibilityMeters: 2800,
        humidityPercent: 92,
        movementSpeedModifier: 0.8,
        rfWetCanopyExtraLossDbPerMeter: 0.04,
      };
    case 'HEAVY_RAIN':
      return {
        type: 'HEAVY_RAIN',
        temperatureC: 9.0,
        precipitationMmPerHour: 22.0,
        windSpeedMps: 14.5,
        windAzimuthDegrees: 320,
        visibilityMeters: 800,
        humidityPercent: 99,
        movementSpeedModifier: 0.65,
        rfWetCanopyExtraLossDbPerMeter: 0.09,
      };
    case 'THERMAL_FOG':
      return {
        type: 'THERMAL_FOG',
        temperatureC: 6.5,
        precipitationMmPerHour: 0.5,
        windSpeedMps: 1.2,
        windAzimuthDegrees: 180,
        visibilityMeters: 180,
        humidityPercent: 98,
        movementSpeedModifier: 0.85,
        rfWetCanopyExtraLossDbPerMeter: 0.03,
      };
    case 'SMOKE_SCREEN':
      return {
        type: 'SMOKE_SCREEN',
        temperatureC: 15.0,
        precipitationMmPerHour: 0,
        windSpeedMps: 3.5,
        windAzimuthDegrees: 210,
        visibilityMeters: 45,
        humidityPercent: 60,
        movementSpeedModifier: 0.75,
        rfWetCanopyExtraLossDbPerMeter: 0.02,
      };
  }
}

/**
 * Calculates instantaneous smoke cloud centroid and dispersion radius
 * given wind velocity and elapsed burn time.
 */
export function calculateSmokeDispersion(
  smoke: SmokeScreenEmitter,
  windSpeedMps: number,
  windAzimuthDegrees: number,
  currentTimeMs = Date.now()
): { currentLat: number; currentLon: number; radiusMeters: number; active: boolean } {
  const elapsedSeconds = Math.max(0, (currentTimeMs - smoke.deployedAt) / 1000);
  if (elapsedSeconds > smoke.durationSeconds) {
    return {
      currentLat: smoke.sourceLat,
      currentLon: smoke.sourceLon,
      radiusMeters: 0,
      active: false,
    };
  }

  // Radius expands smoothly over burn time up to maxRadius
  const progress = Math.min(1.0, elapsedSeconds / (smoke.durationSeconds * 0.7));
  const currentRadius = smoke.initialRadiusMeters + progress * (smoke.maxRadiusMeters - smoke.initialRadiusMeters);

  // Wind drift translation: windAzimuth is direction wind blows FROM, so smoke drifts towards (azimuth + 180)
  const driftAzimuthRad = ((windAzimuthDegrees + 180) * Math.PI) / 180;
  const driftDistanceMeters = windSpeedMps * elapsedSeconds * 0.4; // effective dispersion velocity

  const dLat = (driftDistanceMeters * Math.cos(driftAzimuthRad)) / 111000;
  const dLon =
    (driftDistanceMeters * Math.sin(driftAzimuthRad)) /
    (111000 * Math.cos((smoke.sourceLat * Math.PI) / 180));

  return {
    currentLat: smoke.sourceLat + dLat,
    currentLon: smoke.sourceLon + dLon,
    radiusMeters: Math.round(currentRadius),
    active: true,
  };
}

/**
 * Assesses Electronic Warfare (EW) Jamming interference at an operator's coordinates.
 */
export function evaluateEWInterference(
  operatorLat: number,
  operatorLon: number,
  jammingZones: EWJammingZone[],
  targetBand: EWBand = 'LORA_868',
  nominalGpsErrorMeters = 2.5
): EWInterferenceAssessment {
  let worstPacketLoss = 0.0;
  let worstSnrDegradation = 0.0;
  let worstGpsError = nominalGpsErrorMeters;
  let isJammed = false;
  let closestJammerId: string | undefined;
  let minDistance = Infinity;

  for (const zone of jammingZones) {
    if (!zone.active) continue;
    if (zone.band !== targetBand && zone.band !== 'BROADBAND') continue;

    const dist = haversineMeters(operatorLat, operatorLon, zone.centerLat, zone.centerLon);
    if (dist < zone.radiusMeters) {
      isJammed = true;
      if (dist < minDistance) {
        minDistance = dist;
        closestJammerId = zone.id;
      }

      // Proximity intensity: 1.0 at center, 0.0 at perimeter
      const intensity = 1.0 - dist / zone.radiusMeters;
      const packetLoss = Math.min(0.95, intensity * 0.9);
      const snrDegradation = intensity * 24.0; // up to 24 dB degradation

      if (packetLoss > worstPacketLoss) worstPacketLoss = packetLoss;
      if (snrDegradation > worstSnrDegradation) worstSnrDegradation = snrDegradation;

      // GPS dilution of precision under jamming
      if (zone.band === 'GPS_L1' || zone.band === 'BROADBAND') {
        const gpsError = nominalGpsErrorMeters + intensity * 60.0; // up to 60m error
        if (gpsError > worstGpsError) worstGpsError = gpsError;
      }
    }
  }

  return {
    isJammed,
    jammerId: closestJammerId,
    distanceToJammerMeters: isJammed ? Math.round(minDistance) : undefined,
    packetLossRate: parseFloat(worstPacketLoss.toFixed(2)),
    snrDegradationDb: parseFloat(worstSnrDegradation.toFixed(1)),
    effectiveGpsErrorMeters: parseFloat(worstGpsError.toFixed(1)),
  };
}
