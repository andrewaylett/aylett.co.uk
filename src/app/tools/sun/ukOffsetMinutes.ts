export function ukOffsetMinutes(dateStr: string) {
  // BST (UTC+1): last Sunday of March → last Sunday of October
  const [y, m, d] = dateStr.split('-').map(Number);
  function lastSunday(yr: number, mo: number) {
    const last = new Date(yr, mo, 0);
    return last.getDate() - last.getDay();
  }
  const bstStart = lastSunday(y, 3);
  const bstEnd = lastSunday(y, 10);
  if (m > 3 && m < 10) return 60;
  if (m === 3 && d >= bstStart) return 60;
  if (m === 10 && d < bstEnd) return 60;
  return 0;
}
