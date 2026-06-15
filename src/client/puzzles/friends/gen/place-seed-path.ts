// ---------------- Puzzle generation ----------------
import { NEIGH, shuffle } from '@/client/puzzles/friends/helpers';

export function placeSeedPath(L: number): number[] | null {
  const starts = shuffle([...Array.from({ length: 16 }).keys()]);
  for (const s of starts) {
    const path = [s];
    const used = new Set([s]);
    const dfs = (cell: number): boolean => {
      if (path.length === L) {
        return true;
      }
      for (const nb of shuffle(NEIGH[cell])) {
        if (used.has(nb)) {
          continue;
        }
        used.add(nb);
        path.push(nb);
        if (dfs(nb)) {
          return true;
        }
        used.delete(nb);
        path.pop();
      }
      return false;
    };
    if (dfs(s)) {
      return path;
    }
  }
  return null;
}
