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

/**
 * Upper bound on the score of any completion reachable from a DFS node that
 * has taken `i` of `L` steps with the given running totals.
 *
 * The leaf score is `L*30 + fills*60 + reuse*12 - newE*2`, and `fills`,
 * `reuse`, `newE` only ever increase as the path extends. Each remaining
 * step falls into one of three cases: fill+new-edge (Δscore 58), reuse+new-
 * edge (Δscore 10), or reuse+reused-edge (Δscore 24). A fourth combination,
 * "fill + reused edge", is arithmetically possible (Δscore 72) but cannot
 * occur: `applyWord` (apply-word.ts) only ever adds an edge to `edges` in
 * the same step that assigns letters to both of that edge's endpoints, and
 * `grid` cells are never reset back to `null` once filled — so
 * `grid[nb] === null` (a fill) always implies the edge to `nb` is not yet in
 * `edges` (a new edge). The true per-step maximum is therefore 58, not 72,
 * giving a materially tighter bound.
 */
export function upperBoundScore(
  L: number,
  i: number,
  fills: number,
  reuse: number,
  newE: number,
): number {
  return L * 30 + fills * 60 + reuse * 12 - newE * 2 + 58 * (L - i);
}

export function searchPlacement(
  word: string,
  grid: (string | null)[],
  edges: Set<string>,
): Placement[] {
  const results: Placement[] = [];
  let nodes = 0;
  const L = word.length;
  const degAdj = Array.from<number>({ length: 16 }).fill(0);
  const insertResult = (p: Placement): void => {
    let idx = results.findIndex((r) => r.score < p.score);
    if (idx === -1) {
      idx = results.length;
    }
    if (idx < MAX_PLACEMENTS) {
      results.splice(idx, 0, p);
      if (results.length > MAX_PLACEMENTS) {
        results.pop();
      }
    }
  };
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
    if (
      results.length === MAX_PLACEMENTS &&
      upperBoundScore(L, i, fills, reuse, newE) <=
        results[MAX_PLACEMENTS - 1].score
    ) {
      return;
    }
    if (i === L) {
      if (fills > 0) {
        const score = L * 30 + fills * 60 + reuse * 12 - newE * 2;
        insertResult({ path: [...path], score, fills });
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
  return results;
}
