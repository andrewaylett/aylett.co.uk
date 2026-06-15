import { ekey } from '@/client/puzzles/friends/helpers';

export function applyWord(
  word: string,
  path: number[],
  grid: (string | null)[],
  edges: Set<string>,
): void {
  for (let i = 0; i < path.length; i++) {
    grid[path[i]] = word[i];
    if (i > 0) {
      edges.add(ekey(path[i - 1].toString(), path[i].toString()));
    }
  }
}
