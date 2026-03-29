export interface AnglePoint {
  angle: number;
  hours: number;
}

function computeDeclinations(year: number): { sinDec: number; dec: number }[] {
  const days: { sinDec: number; dec: number }[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();

    const jd =
      367 * y -
      Math.floor((7 * (y + Math.floor((m + 9) / 12))) / 4) +
      Math.floor((275 * m) / 9) +
      day +
      1_721_013.5;

    const T = (jd - 2_451_545) / 36_525;
    const L0 = (280.466_46 + T * (36_000.769_83 + T * 0.000_303_2)) % 360;
    const Mrad =
      ((357.529_11 + T * (35_999.050_29 - T * 0.000_153_7)) * Math.PI) / 180;
    const C =
      (1.914_602 - T * (0.004_817 + 0.000_014 * T)) * Math.sin(Mrad) +
      (0.019_993 - 0.000_101 * T) * Math.sin(2 * Mrad) +
      0.000_289 * Math.sin(3 * Mrad);
    const sunLon = ((L0 + C) * Math.PI) / 180;
    const obliq =
      ((23.439_291_111 -
        T * (0.013_004_167 + T * (0.000_000_163_9 - T * 0.000_000_503_6))) *
        Math.PI) /
      180;

    const sinDec = Math.sin(obliq) * Math.sin(sunLon);
    const dec = Math.asin(sinDec);

    days.push({ sinDec, dec });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Compute the actual annual min/max solar elevation angles for a location.
 *
 * - max elevation occurs at solar noon (HA=0):        arcsin(sinLat·sinDec + cosLat·cosDec)
 * - min elevation occurs at solar midnight (HA=180°): arcsin(sinLat·sinDec − cosLat·cosDec)
 *
 * Call this for each location, take the outer union of both results, then pass
 * the shared bounds into `buildAngleData` so both datasets share the same x-axis.
 */
export function solarElevationRange(
  lat: number,
  year: number,
): { minAngle: number; maxAngle: number } {
  const days = computeDeclinations(year);
  const latR = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  const sinLat = Math.sin(latR);
  const toDeg = (r: number) => (r * 180) / Math.PI;
  let minEl = 90;
  let maxEl = -90;
  for (const { sinDec, dec } of days) {
    const cosDec = Math.cos(dec);
    const elNoon = toDeg(Math.asin(sinLat * sinDec + cosLat * cosDec));
    const elMidnight = toDeg(Math.asin(sinLat * sinDec - cosLat * cosDec));
    if (elNoon > maxEl) maxEl = elNoon;
    if (elMidnight < minEl) minEl = elMidnight;
  }
  return { minAngle: Math.floor(minEl), maxAngle: Math.ceil(maxEl) };
}

/**
 * For each integer elevation angle within [minAngle, maxAngle], compute the
 * total hours per year the sun is at or above that angle at the given location.
 *
 * Uses the same Meeus/NOAA Julian-day solar declination formula as solarTimes.ts,
 * but skips the equation of time and timezone offset — we only need the hour angle.
 *
 * Call `solarElevationRange` for each location, take the outer union of both
 * bounds, then pass the shared range here so both datasets share the same x-axis.
 */
export function buildAngleData(
  lat: number,
  year: number,
  minAngle: number,
  maxAngle: number,
): AnglePoint[] {
  const days = computeDeclinations(year);
  const latR = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  const sinLat = Math.sin(latR);

  const result: AnglePoint[] = [];

  for (let angle = minAngle; angle <= maxAngle; angle++) {
    // zenith = 90° − elevation angle
    const cosZenith = Math.cos(((90 - angle) * Math.PI) / 180);

    let totalMinutes = 0;
    for (const { sinDec, dec } of days) {
      const cosHA = (cosZenith - sinLat * sinDec) / (cosLat * Math.cos(dec));
      if (cosHA < -1) {
        // Sun never sets below this angle — always above it
        totalMinutes += 1440;
      } else if (cosHA <= 1) {
        // ha in degrees; time above = ha * 8 minutes (two halves of the day)
        const ha = (Math.acos(cosHA) * 180) / Math.PI;
        totalMinutes += ha * 8;
      }
      // cosHA > 1: sun never reaches this angle — add 0
    }

    result.push({ angle, hours: Math.round(totalMinutes / 60) });
  }

  return result;
}
