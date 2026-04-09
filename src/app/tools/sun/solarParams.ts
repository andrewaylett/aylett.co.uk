import type { Temporal } from 'temporal-polyfill';

import { useSun } from '@/app/tools/sun/sunContext';

/**
 * Compute solar orbital parameters for a given Julian Day Number.
 *
 * Uses the Meeus/NOAA algorithm. Returns intermediate values needed by both
 * solarTimes (equation of time, declination) and buildAngleData (declination
 * only). Centralising the formula avoids the two callers drifting apart.
 *
 * Use `toJulianDay` to convert a calendar date to a JulianDay before calling.
 * All angular inputs and outputs are in radians.
 */

// ---------------------------------------------------------------------------
// Branded numeric types — prevent mixing up units at function boundaries
// ---------------------------------------------------------------------------

declare const _julianDayBrand: unique symbol;
/** Julian Day Number — days since noon 1 Jan 4713 BC (Julian calendar) */
export type JulianDay = number & { readonly [_julianDayBrand]: never };

declare const _radiansBrand: unique symbol;
/** Angle in radians */
export type Radians = number & { readonly [_radiansBrand]: never };

// ---------------------------------------------------------------------------
// Astronomical constants (Meeus, "Astronomical Algorithms", 2nd ed.)
// All angles are in radians; rates are in radians per Julian century (T).
// ---------------------------------------------------------------------------

/** Midnight-based JD offset for the Meeus calendar→JD formula */
const JD_OFFSET = 1_721_013.5;
/** J2000.0 epoch in Julian Days */
const J2000 = 2_451_545;
/** Days in a Julian century */
const JULIAN_CENTURY_DAYS = 36_525;

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = (2 * Math.PI) as Radians;

/** Mean longitude at epoch (radians) */
const L0_EPOCH = (280.466_46 * DEG_TO_RAD) as Radians;
/** Mean longitude rate (rad/century) */
const L0_RATE_1 = 36_000.769_83 * DEG_TO_RAD;
/** Mean longitude rate quadratic term (rad/century²) */
const L0_RATE_2 = 0.000_303_2 * DEG_TO_RAD;

/** Mean anomaly at epoch (radians) */
const M_EPOCH = (357.529_11 * DEG_TO_RAD) as Radians;
/** Mean anomaly rate (rad/century) */
const M_RATE_1 = 35_999.050_29 * DEG_TO_RAD;
/** Mean anomaly rate quadratic term (rad/century²) */
const M_RATE_2 = 0.000_153_7 * DEG_TO_RAD;

/**
 * Equation of centre coefficients (the result of C is added to L0 in radians
 * directly, so these are the original degree coefficients pre-multiplied).
 */
const C_C0 = (1.914_602 * DEG_TO_RAD) as Radians;
const C_C1 = (0.004_817 * DEG_TO_RAD) as Radians;
const C_C2 = (0.000_014 * DEG_TO_RAD) as Radians;
const C_C3 = (0.019_993 * DEG_TO_RAD) as Radians;
const C_C4 = (0.000_101 * DEG_TO_RAD) as Radians;
const C_C5 = (0.000_289 * DEG_TO_RAD) as Radians;

/** Obliquity of the ecliptic at epoch (radians) */
const OBLIQ_EPOCH = (23.439_291_111 * DEG_TO_RAD) as Radians;
/** Obliquity rate (rad/century) */
const OBLIQ_RATE_1 = 0.013_004_167 * DEG_TO_RAD;
/** Obliquity rate quadratic term (rad/century²) */
const OBLIQ_RATE_2 = 0.000_000_163_9 * DEG_TO_RAD;
/** Obliquity rate cubic term (rad/century³) */
const OBLIQ_RATE_3 = 0.000_000_503_6 * DEG_TO_RAD;

/** Orbital eccentricity at epoch (dimensionless) */
const ECC_EPOCH = 0.016_708_634;
/** Eccentricity rate (per century) */
const ECC_RATE_1 = 0.000_042_037;
/** Eccentricity rate quadratic term (per century²) */
const ECC_RATE_2 = 0.000_000_126_7;

// ---------------------------------------------------------------------------

export interface SolarParams {
  date: Temporal.PlainDate;
  jd: JulianDay;
  cosDec: number;
  sinDec: number;
  dec: Radians;
  /** Mean longitude (radians) */
  L0: Radians;
  /** Mean anomaly (radians) */
  M: Radians;
  /** Obliquity of the ecliptic (radians) */
  obliq: Radians;
  /** Orbital eccentricity (dimensionless) */
  ecc: number;
}

/**
 * Convert a calendar date to a Julian Day Number (midnight-based, not noon).
 *
 * The standard J2000.0 epoch is JD 2 451 545.0 (noon 1 Jan 2000). This
 * formula gives JD 2 451 544.5 for 2000-01-01 because it counts from
 * midnight rather than noon.
 */
export function toJulianDay(date: Temporal.PlainDate): JulianDay {
  const { year: y, month: m, day: d } = date;
  return (367 * y -
    Math.floor((7 * (y + Math.floor((m + 9) / 12))) / 4) +
    Math.floor((275 * m) / 9) +
    d +
    JD_OFFSET) as JulianDay;
}

export function useSolarParams(): SolarParams {
  'use memo';
  return computeSolarParams(useSun().date);
}

export function computeSolarParams(date: Temporal.PlainDate): SolarParams {
  const jd = toJulianDay(date);
  const T = (jd - J2000) / JULIAN_CENTURY_DAYS;

  const L0 = ((((L0_EPOCH + T * (L0_RATE_1 + T * L0_RATE_2)) % TWO_PI) +
    TWO_PI) %
    TWO_PI) as Radians;
  const M = (M_EPOCH + T * (M_RATE_1 - T * M_RATE_2)) as Radians;

  const C =
    (C_C0 - T * (C_C1 + C_C2 * T)) * Math.sin(M) +
    (C_C3 - C_C4 * T) * Math.sin(2 * M) +
    C_C5 * Math.sin(3 * M);

  const sunLon = (L0 + C) as Radians;
  const obliq = (OBLIQ_EPOCH -
    T * (OBLIQ_RATE_1 + T * (OBLIQ_RATE_2 - T * OBLIQ_RATE_3))) as Radians;

  const sinDec = Math.sin(obliq) * Math.sin(sunLon);
  const dec = Math.asin(sinDec) as Radians;
  const cosDec = Math.cos(dec);
  const ecc = ECC_EPOCH - T * (ECC_RATE_1 + ECC_RATE_2 * T);

  return { date, jd, cosDec, sinDec, dec, L0, M, obliq, ecc };
}
