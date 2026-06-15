import { ekey, NEIGH, shuffle } from '@/client/puzzles/friends/helpers';

export interface Placement {
  path: number[];
  score: number;
  fills: number;
}

export function searchPlacement(
  word: string,
  grid: (string | null)[],
  edges: Set<string>,
): Placement | null {
  let best: Placement | null = null;
  let nodes = 0;
  const L = word.length;
  const dfs = (
    i: number,
    cell: number,
    path: number[],
    fills: number,
    newE: number,
    reuse: number,
  ): void => {
    if (nodes++ > 6000) {
      return;
    }
    if (i === L) {
      if (fills > 0) {
        const score = L * 30 + fills * 60 + reuse * 12 - newE * 2;
        if (!best || score > best.score) {
          best = { path: [...path], score, fills };
        }
      }
      return;
    }
    for (const nb of shuffle(NEIGH[cell])) {
      if (path.includes(nb)) {
        continue;
      }
      const g = grid[nb];
      if (g !== null && g !== word[i]) {
        continue;
      }
      const ek = ekey(cell.toString(), nb.toString());
      path.push(nb);
      dfs(
        i + 1,
        nb,
        path,
        fills + (g === null ? 1 : 0),
        newE + (edges.has(ek) ? 0 : 1),
        reuse + (g === null ? 0 : 1) + (edges.has(ek) ? 1 : 0),
      );
      path.pop();
    }
  };
  for (let s = 0; s < 16; s++) {
    const g = grid[s];
    if (g !== null && g !== word[0]) {
      continue;
    }
    dfs(1, s, [s], g === null ? 1 : 0, 0, g === null ? 0 : 1);
  }
  return best;
}
