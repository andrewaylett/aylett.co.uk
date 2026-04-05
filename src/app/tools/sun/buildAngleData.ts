import { Temporal } from 'temporal-polyfill';

import { computeSolarParams } from '@/app/tools/sun/solarParams';

export interface AnglePoint {
  angle: number;
  hours: number;
}

export interface Declination {
  cosDec: number;
  sinDec: number;
  dec: number;
}

export function computeDeclinations(year: number): Declination[] {
  return (PRECOMPUTED_DECLINATIONS[year] ??= computeDeclinationsInternal(year));
}

const PRECOMPUTED_DECLINATIONS = {
  [new Date().getFullYear()]: computeDeclinationsInternal(
    new Date().getFullYear(),
  ),
};

function computeDeclinationsInternal(year: number): Declination[] {
  if (!Number.isFinite(year)) return [];
  const days: Declination[] = [];
  let d = new Temporal.PlainDate(year, 1, 1);
  while (d.year === year) {
    const { cosDec, sinDec, dec } = computeSolarParams(d);
    days.push({ cosDec, sinDec, dec });
    d = d.add({ days: 1 });
  }
  return days;
}

/**
 * Precompute cosZenith for each integer angle; index i corresponds to angle = i − 90,
 * zenith = 90° − angle = 180° − i.
 */
const cosZeniths = Array.from({ length: 181 }, (_, i) =>
  Math.cos(((180 - i) * Math.PI) / 180),
);

/**
 * For each integer elevation angle from -90° to 90°, compute the total hours
 * per year the sun is at or above that angle at the given location.
 *
 * Uses the same Meeus/NOAA Julian-day solar declination formula as solarTimes.ts,
 * but skips the equation of time and timezone offset — we only need the hour angle.
 *
 * Iterates days once (outer loop) across all angles (inner loop) so that each
 * day's declination is loaded only once. cosDec is also hoisted per day.
 */
export function buildAngleData(lat: number, year: number): AnglePoint[] {
  const days = computeDeclinations(year);
  const latR = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  const sinLat = Math.sin(latR);

  const totalMinutes: number[] = Array.from({ length: 181 }, () => 0);

  for (const { sinDec, cosDec } of days) {
    const denom = cosLat * cosDec;
    const num = sinLat * sinDec;
    for (const [i, cosZ] of cosZeniths.entries()) {
      const cosHA = (cosZ - num) / denom;
      if (cosHA < -1) {
        // Sun never sets below this angle — always above it
        totalMinutes[i] += 1440;
      } else if (cosHA <= 1) {
        // ha in degrees; time above = ha * 8 minutes (two halves of the day)
        totalMinutes[i] += ((Math.acos(cosHA) * 180) / Math.PI) * 8;
      }
      // cosHA > 1: sun never reaches this angle — add 0
    }
  }

  return totalMinutes.map((m, i) => ({
    angle: i - 90,
    hours: m / 60,
  }));
}
