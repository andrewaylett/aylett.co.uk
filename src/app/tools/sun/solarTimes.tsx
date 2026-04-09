import type { Loc } from '@/app/tools/sun/locations';

import {
  type Radians,
  type SolarParams,
  useSolarParams,
} from '@/app/tools/sun/solarParams';
import { ukOffsetMinutes } from '@/app/tools/sun/ukOffsetMinutes';

export interface SolarTimes {
  sunrise?: number; // minutes from midnight UK local time (GMT/BST)
  sunset?: number; // minutes from midnight UK local time (GMT/BST)
  dawn?: number; // civil dawn (sun 6° below horizon), minutes from midnight
  dusk?: number; // civil dusk (sun 6° below horizon), minutes from midnight
  dayLength: number; // in minutes
  polar?: 'midnight sun' | 'polar night';
}

const PI = Math.PI;
const RAD = PI / 180;
function rad(deg: number): Radians {
  return (deg * RAD) as Radians;
}

function tan(n: Radians) {
  return Math.tan(n);
}

function sin(n: Radians) {
  return Math.sin(n);
}

function cos(n: Radians) {
  return Math.cos(n);
}

function acos(n: number) {
  return Math.acos(n) as Radians;
}

/** Atmospheric refraction correction for sunrise/sunset (degrees) */
const REFRACTION = 0.833;
/** Zenith angle for sunrise/sunset: 90° + atmospheric refraction */
const SUNRISE_ZENITH = rad(90 + REFRACTION);
/** Zenith angle for civil twilight: 6° below horizon */
const CIVIL_TWILIGHT_ZENITH = rad(90 + 6);
/** UTC solar noon base in minutes */
const SOLAR_NOON_BASE = 720;
/** Minutes per degree of longitude (360° / 24 h = 4 min/°) */
const MIN_PER_DEG_LNG = 4;

function equationOfTime(solarParams: SolarParams): number {
  const { L0, M, obliq, ecc } = solarParams;

  // Equation of time (minutes) — how far solar time deviates from clock time
  const y2 = tan((obliq / 2) as Radians) ** 2;

  return (
    (MIN_PER_DEG_LNG / RAD) *
    (y2 * sin((2 * L0) as Radians) -
      2 * ecc * sin(M) +
      4 * ecc * y2 * sin(M) * cos((2 * L0) as Radians) -
      0.5 * y2 * y2 * sin((4 * L0) as Radians) -
      1.25 * ecc * ecc * sin((2 * M) as Radians))
  );
}

export function solarTimes(
  solarParams: SolarParams,
  lat: number,
  lng: number,
): SolarTimes {
  const { sinDec, dec } = solarParams;
  const eot = equationOfTime(solarParams);

  const latR = rad(lat);
  const cosHA =
    (cos(SUNRISE_ZENITH) - sin(latR) * sinDec) / (cos(latR) * cos(dec));

  if (cosHA < -1) return { polar: 'midnight sun', dayLength: 24 * 60 };
  if (cosHA > 1) return { polar: 'polar night', dayLength: 0 };

  const ha = acos(cosHA) / RAD;
  const solarNoon = SOLAR_NOON_BASE - MIN_PER_DEG_LNG * lng - eot; // UTC minutes from midnight
  const offset = ukOffsetMinutes(solarParams.date);

  const sunrise = solarNoon - ha * MIN_PER_DEG_LNG + offset;
  const sunset = solarNoon + ha * MIN_PER_DEG_LNG + offset;
  const dayLength = sunset - sunrise;

  // Civil twilight: sun 6° below horizon
  const cosHACivil =
    (cos(CIVIL_TWILIGHT_ZENITH) - sin(latR) * sinDec) / (cos(latR) * cos(dec));

  let dawn: number | undefined;
  let dusk: number | undefined;
  if (cosHACivil >= -1 && cosHACivil <= 1) {
    const haCivil = acos(cosHACivil) / RAD;
    dawn = solarNoon - haCivil * MIN_PER_DEG_LNG + offset;
    dusk = solarNoon + haCivil * MIN_PER_DEG_LNG + offset;
  }

  return { sunrise, sunset, dawn, dusk, dayLength };
}

export function useSolarTimes(loc: Loc): SolarTimes {
  return solarTimes(useSolarParams(), loc.lat, loc.lng);
}
