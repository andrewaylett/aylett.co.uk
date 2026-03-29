import { Temporal } from 'temporal-polyfill';

import { type SolarTimes, solarTimes } from '@/app/tools/sun/solarTimes';

export interface DayTimes extends SolarTimes {
  date: string; // YYYY-MM-DD
}

export function buildYearData(
  lat: number,
  lng: number,
  year: number,
): DayTimes[] {
  if (!Number.isFinite(year)) return [];
  const results: DayTimes[] = [];
  let d = new Temporal.PlainDate(year, 1, 1);
  while (d.year === year) {
    results.push({ date: d.toString(), ...solarTimes(d, lat, lng) });
    d = d.add({ days: 1 });
  }
  return results;
}
