export function minsToTime(v?: number): string {
  if (v == null) return '—';
  const h = Math.floor(v / 60),
    m = v % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
