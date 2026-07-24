import { ekey, NEIGH } from '@/client/puzzles/friends/helpers';

/**
 * True if `word` has exactly one path through `grid`/`edges`. Null cells
 * never match (they aren't a letter yet), so this only judges ambiguity
 * among cells/edges that already exist at the time it's called.
 */
export function isUniqueTrace(
  word: string,
  grid: (string | null)[],
  edges: Set<string>,
): boolean {
  let count = 0;
  const dfs = (i: number, cell: number, used: Set<number>): void => {
    if (count > 1) {
      return;
    }
    if (i === word.length - 1) {
      count++;
      return;
    }
    for (const nb of NEIGH[cell]) {
      if (used.has(nb) || grid[nb] !== word[i + 1]) {
        continue;
      }
      if (!edges.has(ekey(cell.toString(), nb.toString()))) {
        continue;
      }
      used.add(nb);
      dfs(i + 1, nb, used);
      used.delete(nb);
      if (count > 1) {
        return;
      }
    }
  };
  for (let s = 0; s < 16 && count <= 1; s++) {
    if (grid[s] === word[0]) {
      dfs(0, s, new Set([s]));
    }
  }
  return count === 1;
}
