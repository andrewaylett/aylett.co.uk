import { ekey, NEIGH } from '@/client/puzzles/friends/helpers';

/** Lightweight scan: just the set of traceable words from the given dict. */
export function scanSet(
  grid: string[],
  edges: Set<string>,
  dict: Set<string>,
  prefixes: Set<string>,
  maxLen: number,
): Set<string> {
  const found = new Set<string>();
  const dfs = (cell: number, used: Set<number>, prefix: string): void => {
    const p = prefix + grid[cell];
    if (!prefixes.has(p)) {
      return;
    }
    if (p.length >= 4 && dict.has(p)) {
      found.add(p);
    }
    if (p.length >= maxLen) {
      return;
    }
    for (const nb of NEIGH[cell]) {
      if (used.has(nb)) {
        continue;
      }
      if (!edges.has(ekey(cell.toString(), nb.toString()))) {
        continue;
      }
      used.add(nb);
      dfs(nb, used, p);
      used.delete(nb);
    }
  };
  for (let s = 0; s < 16; s++) {
    dfs(s, new Set([s]), '');
  }
  return found;
}
