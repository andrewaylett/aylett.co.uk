export function minsToHuman(v?: number): string {
  if (v == null) return '—';
  const h = Math.floor(v / 60),
    m = v % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
