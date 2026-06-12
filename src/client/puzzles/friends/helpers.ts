// ---------------- Grid helpers ----------------
function genNeigh() {
  const result: number[][] = [];
  for (let i = 0; i < 16; i++) {
    const r = i >> 2,
      c = i & 3;
    const a: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr,
          nc = c + dc;
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) a.push(nr * 4 + nc);
      }
    result.push(a);
  }
  return result;
}
export const NEIGH: number[][] = genNeigh();

function genAllPairs() {
  const result: [number, number][] = [];
  for (let i = 0; i < 16; i++)
    for (const nb of NEIGH[i]) if (i < nb) result.push([i, nb]);
  return result;
}
export const ALL_PAIRS: [number, number][] = genAllPairs();

export function ekey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const CRITTERS: string[] = [
  '🐱',
  '🦊',
  '🐰',
  '🐻',
  '🐼',
  '🦉',
  '🐸',
  '🌸',
  '🍄',
  '🐢',
  '🦋',
  '🐙',
  '🦔',
  '🍀',
  '🐝',
  '🐭',
  '🐧',
  '🌼',
  '🐞',
  '🦆',
];
