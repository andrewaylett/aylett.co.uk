import {
  cellDegree,
  ekey,
  maxEdgesForCell,
  NEIGH,
  shuffle,
} from '@/client/puzzles/friends/helpers';

export interface Placement {
  path: number[];
  score: number;
  fills: number;
}

const MAX_PLACEMENTS = 3;

export function searchPlacement(
  word: string,
  grid: (string | null)[],
  edges: Set<string>,
): Placement[] {
  const results: Placement[] = [];
  let nodes = 0;
  const L = word.length;
  const degAdj = Array.from<number>({ length: 16 }).fill(0);
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
        results.push({ path: [...path], score, fills });
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
      const isNew = !edges.has(ek);
      if (isNew) {
        if (
          cellDegree(cell, edges) + degAdj[cell] >= maxEdgesForCell(cell) ||
          cellDegree(nb, edges) + degAdj[nb] >= maxEdgesForCell(nb)
        ) {
          continue;
        }
        degAdj[cell]++;
        degAdj[nb]++;
      }
      path.push(nb);
      dfs(
        i + 1,
        nb,
        path,
        fills + (g === null ? 1 : 0),
        newE + (isNew ? 1 : 0),
        reuse + (g === null ? 0 : 1) + (isNew ? 0 : 1),
      );
      path.pop();
      if (isNew) {
        degAdj[cell]--;
        degAdj[nb]--;
      }
    }
  };
  for (let s = 0; s < 16; s++) {
    const g = grid[s];
    if (g !== null && g !== word[0]) {
      continue;
    }
    dfs(1, s, [s], g === null ? 1 : 0, 0, g === null ? 0 : 1);
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_PLACEMENTS);
}
