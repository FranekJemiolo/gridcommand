/**
 * Military Grid Reference System (MGRS) Engine
 * Standard NATO conversion between WGS84 Latitude/Longitude and 10-figure MGRS coordinates.
 */

const WGS84_A = 6378137.0; // semi-major axis
const WGS84_ECC_SQ = 0.00669437999014; // first eccentricity squared
const UTM_K0 = 0.9996; // central scale factor

// UTM Latitude bands (8° increments from 80°S to 84°N)
const LAT_BANDS = 'CDEFGHJKLMNPQRSTUVWX';

// 100,000-meter column letters by UTM zone set (1-6)
const COLUMN_LETTERS = [
  'ABCDEFGH',
  'JKLMNPQR',
  'STUVWXYZ',
];

// 100,000-meter row letters (even vs odd zones)
const ROW_LETTERS_EVEN = 'FGHJKLMNPQQRSTUVAB';
const ROW_LETTERS_ODD = 'ABCDEFGHJKLMNPQRSTUV';

export interface MGRSCoordinate {
  zone: number;
  band: string;
  squareId: string; // 2-letter 100km square
  easting: number; // 5-digit easting meters within 100km square
  northing: number; // 5-digit northing meters within 100km square
  formatted: string; // e.g. "34U DA 35124 28941"
}

export function latLonToUTM(lat: number, lon: number): { zone: number; band: string; easting: number; northing: number } {
  // Ensure longitude is within [-180, 180)
  let normLon = lon;
  while (normLon >= 180) normLon -= 360;
  while (normLon < -180) normLon += 360;

  // Determine UTM zone
  let zone = Math.floor((normLon + 180) / 6) + 1;

  // Norway / Svalbard special zone exceptions
  if (lat >= 56.0 && lat < 64.0 && normLon >= 3.0 && normLon < 12.0) {
    zone = 32;
  }
  if (lat >= 72.0 && lat < 84.0) {
    if (normLon >= 0.0 && normLon < 9.0) zone = 31;
    else if (normLon >= 9.0 && normLon < 21.0) zone = 33;
    else if (normLon >= 21.0 && normLon < 33.0) zone = 35;
    else if (normLon >= 33.0 && normLon < 42.0) zone = 37;
  }

  // Determine Latitude Band letter
  let band = ' ';
  if (lat >= -80 && lat <= 84) {
    const bandIdx = Math.floor((lat + 80) / 8);
    band = LAT_BANDS[Math.min(bandIdx, LAT_BANDS.length - 1)];
  }

  // Central meridian of zone
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (normLon * Math.PI) / 180;
  const lonOriginRad = (lonOrigin * Math.PI) / 180;

  const ePrimeSq = WGS84_ECC_SQ / (1 - WGS84_ECC_SQ);
  const N = WGS84_A / Math.sqrt(1 - WGS84_ECC_SQ * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrimeSq * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M =
    WGS84_A *
    ((1 - WGS84_ECC_SQ / 4 - (3 * WGS84_ECC_SQ * WGS84_ECC_SQ) / 64 - (5 * Math.pow(WGS84_ECC_SQ, 3)) / 256) * latRad -
      ((3 * WGS84_ECC_SQ) / 8 + (3 * WGS84_ECC_SQ * WGS84_ECC_SQ) / 32 + (45 * Math.pow(WGS84_ECC_SQ, 3)) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * WGS84_ECC_SQ * WGS84_ECC_SQ) / 256 + (45 * Math.pow(WGS84_ECC_SQ, 3)) / 1024) * Math.sin(4 * latRad) -
      ((35 * Math.pow(WGS84_ECC_SQ, 3)) / 3072) * Math.sin(6 * latRad));

  const easting =
    UTM_K0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ePrimeSq) * Math.pow(A, 5)) / 120) +
    500000.0;

  let northing =
    UTM_K0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ePrimeSq) * Math.pow(A, 6)) / 720));

  if (lat < 0) {
    northing += 10000000.0; // False northing for southern hemisphere
  }

  return { zone, band, easting, northing };
}

export function latLonToMGRS(lat: number, lon: number, precision: 1 | 2 | 3 | 4 | 5 = 5): MGRSCoordinate {
  const utm = latLonToUTM(lat, lon);

  // 100km square column letter
  const setNumber = utm.zone % 6;
  const colSetIdx = (setNumber === 0 ? 6 : setNumber) - 1;
  const colLetterIdx = Math.floor(utm.easting / 100000) - 1;
  const colLetters =
    colSetIdx % 3 === 0
      ? COLUMN_LETTERS[0]
      : colSetIdx % 3 === 1
        ? COLUMN_LETTERS[1]
        : COLUMN_LETTERS[2];
  const colLetter = colLetters[Math.max(0, Math.min(colLetterIdx, colLetters.length - 1))];

  // 100km square row letter
  const rowSet = utm.zone % 2 === 0 ? ROW_LETTERS_EVEN : ROW_LETTERS_ODD;
  const rowLetterIdx = Math.floor((utm.northing % 2000000) / 100000);
  const rowLetter = rowSet[rowLetterIdx % rowSet.length];

  const squareId = `${colLetter}${rowLetter}`;

  // Remainder meters within 100km square
  const eastingRem = Math.floor(utm.easting % 100000);
  const northingRem = Math.floor(utm.northing % 100000);

  // Scale to precision
  const divisor = Math.pow(10, 5 - precision);
  const pEasting = Math.floor(eastingRem / divisor);
  const pNorthing = Math.floor(northingRem / divisor);

  const strEasting = pEasting.toString().padStart(precision, '0');
  const strNorthing = pNorthing.toString().padStart(precision, '0');

  const formatted = `${utm.zone}${utm.band} ${squareId} ${strEasting} ${strNorthing}`;

  return {
    zone: utm.zone,
    band: utm.band,
    squareId,
    easting: eastingRem,
    northing: northingRem,
    formatted,
  };
}
