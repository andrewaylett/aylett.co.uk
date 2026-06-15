import type { BoardCtx } from '@/client/puzzles/friends/lexicon';

import { ekey, NEIGH } from '@/client/puzzles/friends/helpers';

export interface WordInfo {
  cells: Set<number>;
  edges: Set<string>;
}

/** Full scan: every traceable word with the union of cells/edges over ALL paths. */
export function scanWords(
  grid: string[],
  edges: Set<string>,
  ctx: BoardCtx,
): Map<string, WordInfo> {
  const found = new Map<string, WordInfo>();
  const record = (
    word: string,
    cells: Set<number>,
    pathEdges: string[],
  ): void => {
    let e = found.get(word);
    if (!e) {
      e = { cells: new Set<number>(), edges: new Set<string>() };
      found.set(word, e);
    }
    for (const c of cells) {
      e.cells.add(c);
    }
    for (const k of pathEdges) {
      e.edges.add(k);
    }
  };
  const dfs = (
    cell: number,
    used: Set<number>,
    prefix: string,
    pathEdges: string[],
  ): void => {
    const p = prefix + grid[cell];
    if (!ctx.prefixes.has(p)) {
      return;
    }
    if (p.length >= 4 && ctx.dict.has(p)) {
      record(p, used, pathEdges);
    }
    if (p.length >= ctx.maxLen) {
      return;
    }
    for (const nb of NEIGH[cell]) {
      if (used.has(nb)) {
        continue;
      }
      const ek = ekey(cell.toString(), nb.toString());
      if (!edges.has(ek)) {
        continue;
      }
      used.add(nb);
      pathEdges.push(ek);
      dfs(nb, used, p, pathEdges);
      used.delete(nb);
      pathEdges.pop();
    }
  };
  for (let s = 0; s < 16; s++) {
    dfs(s, new Set([s]), '', []);
  }
  return found;
}
