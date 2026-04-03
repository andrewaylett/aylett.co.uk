import { Temporal } from 'temporal-polyfill';

import { type SolarTimes, solarTimes } from '@/app/tools/sun/solarTimes';
import { computeSolarParams } from '@/app/tools/sun/solarParams';

export interface DayTimes extends SolarTimes {
  date: Temporal.PlainDate;
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
    results.push({
      date: d,
      ...solarTimes(computeSolarParams(d), lat, lng),
    });
    d = d.add({ days: 1 });
  }
  return results;
}
