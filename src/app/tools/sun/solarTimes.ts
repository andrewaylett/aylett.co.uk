import { ukOffsetMinutes } from '@/app/tools/sun/ukOffsetMinutes';

export interface SolarTimes {
  sunrise?: number; // minutes from midnight UK local time (GMT/BST)
  sunset?: number; // minutes from midnight UK local time (GMT/BST)
  dawn?: number; // civil dawn (sun 6° below horizon), minutes from midnight
  dusk?: number; // civil dusk (sun 6° below horizon), minutes from midnight
  dayLength?: number; // in minutes
  polar?: 'midnight sun' | 'polar night';
}

export function solarTimes(
  dateStr: string,
  lat: number,
  lng: number,
): SolarTimes {
  const [y, m, d] = dateStr.split('-').map(Number);

  // Julian day number
  const jd =
    367 * y -
    Math.floor((7 * (y + Math.floor((m + 9) / 12))) / 4) +
    Math.floor((275 * m) / 9) +
    d +
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

  // Equation of time (minutes)
  const y2 = Math.tan(obliq / 2) ** 2;
  const L2 = (L0 * Math.PI) / 180;
  const ecc = 0.016_708_634 - T * (0.000_042_037 + 0.000_000_126_7 * T);
  const eot =
    4 *
    (180 / Math.PI) *
    (y2 * Math.sin(2 * L2) -
      2 * ecc * Math.sin(Mrad) +
      4 * ecc * y2 * Math.sin(Mrad) * Math.cos(2 * L2) -
      0.5 * y2 * y2 * Math.sin(4 * L2) -
      1.25 * ecc * ecc * Math.sin(2 * Mrad));

  const latR = (lat * Math.PI) / 180;
  const cosHA =
    (Math.cos((90.833 * Math.PI) / 180) - Math.sin(latR) * sinDec) /
    (Math.cos(latR) * Math.cos(dec));

  if (cosHA < -1) return { polar: 'midnight sun' };
  if (cosHA > 1) return { polar: 'polar night' };

  const ha = (Math.acos(cosHA) * 180) / Math.PI;
  const solarNoon = 720 - 4 * lng - eot; // UTC minutes from midnight
  const offset = ukOffsetMinutes(dateStr);

  const sunrise = Math.round(solarNoon - ha * 4 + offset);
  const sunset = Math.round(solarNoon + ha * 4 + offset);
  const dayLength = sunset - sunrise;

  // Civil twilight: sun 6° below horizon (96° zenith angle)
  const cosHACivil =
    (Math.cos((96 * Math.PI) / 180) - Math.sin(latR) * sinDec) /
    (Math.cos(latR) * Math.cos(dec));

  let dawn: number | undefined;
  let dusk: number | undefined;
  if (cosHACivil >= -1 && cosHACivil <= 1) {
    const haCivil = (Math.acos(cosHACivil) * 180) / Math.PI;
    dawn = Math.round(solarNoon - haCivil * 4 + offset);
    dusk = Math.round(solarNoon + haCivil * 4 + offset);
  }

  return { sunrise, sunset, dawn, dusk, dayLength };
}
