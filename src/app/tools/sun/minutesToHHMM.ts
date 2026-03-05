export function minutesToHHMM(mins?: number | null): string {
  if (mins === null || mins === undefined) return '—';
  const sign = mins < 0 ? '−' : '+';
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60),
    m = abs % 60;
  return h > 0 ? `${sign}${h}h ${String(m).padStart(2, '0')}m` : `${sign}${m}m`;
}
