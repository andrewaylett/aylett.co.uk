import { type SolarTimes, solarTimes } from '@/app/tools/sun/solarTimes';

export interface DayTimes extends SolarTimes {
  date: string; // YYYY-MM-DD
}

export function buildYearData(
  lat: number,
  lng: number,
  year: number,
): DayTimes[] {
  const results: DayTimes[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${mo}-${day}`;
    results.push({ date: dateStr, ...solarTimes(dateStr, lat, lng) });
    d.setDate(d.getDate() + 1);
  }
  return results;
}
