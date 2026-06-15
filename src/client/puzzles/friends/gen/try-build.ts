import {
  scanWords,
  type WordInfo,
} from '@/client/puzzles/friends/gen/scan-words';
import { boardContext } from '@/client/puzzles/friends/lexicon';
import { placeSeedPath } from '@/client/puzzles/friends/gen/place-seed-path';
import { applyWord } from '@/client/puzzles/friends/gen/apply-word';
import { shuffle } from '@/client/puzzles/friends/helpers';
import { FILLWORDS } from '@/client/puzzles/friends/words';
import {
  type Placement,
  searchPlacement,
} from '@/client/puzzles/friends/gen/search-placement';
import { scanAvoid } from '@/client/puzzles/friends/gen/scan-avoid';
import { enrich } from '@/client/puzzles/friends/gen/enrich';

export interface BuildResult {
  grid: string[];
  edges: Set<string>;
  accepted: Map<string, WordInfo>;
  seed: string;
  avoidCount: number;
}

export async function tryBuild(seed: string): Promise<BuildResult | null> {
  const grid: (string | null)[] = Array.from({ length: 16 }).fill(null) as (
    | string
    | null
  )[];
  const edges = new Set<string>();
  const seedPath = placeSeedPath(seed.length);
  if (!seedPath) {
    return null;
  }
  applyWord(seed, seedPath, grid, edges);

  let guard = 0;
  while (grid.includes(null) && guard++ < 25) {
    const sample = shuffle(FILLWORDS).sort((a, b) => b.length - a.length);
    let best: (Placement & { word: string }) | null = null;
    let tested = 0;
    for (const w of sample) {
      if (tested++ > 260) {
        break;
      }
      const p = searchPlacement(w, grid, edges);
      if (p && (!best || p.score > best.score)) {
        best = { ...p, word: w };
      }
      if (best && best.fills >= 2 && tested > 80) {
        break;
      }
    }
    if (!best) {
      return null;
    }
    applyWord(best.word, best.path, grid, edges);
  }
  if (grid.includes(null)) {
    return null;
  }

  const filledGrid = grid as string[];
  const ctx = await boardContext(filledGrid);
  const avoidCount = scanAvoid(filledGrid, edges).size;
  if (avoidCount === 0) {
    enrich(filledGrid, edges, ctx);
  }

  const accepted = scanWords(filledGrid, edges, ctx);
  if (!accepted.has(seed)) {
    return null;
  }
  return { grid: filledGrid, edges, accepted, seed, avoidCount };
}
