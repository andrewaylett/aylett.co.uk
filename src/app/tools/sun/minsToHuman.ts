export function minsToHuman(v?: number): string {
  if (v == null) {
    return '—';
  }
  const sign = v < 0 ? '-' : '';
  const mag = Math.round(Math.abs(v));
  const h = Math.floor(mag / 60);
  if (h === 0) {
    return `${sign}${mag}m`;
  }

  const m = mag % 60;
  return `${sign}${h}h${String(m).padStart(2, '0')}m`;
}
export function minsToHumanHours(v?: number): string {
  if (v == null) {
    return '—';
  }
  const sign = v < 0 ? '-' : '';
  const h = Math.floor(Math.abs(v) / 60);
  return `${sign}${h}h`;
}
