import { enableMapSet, produce } from 'immer';

enableMapSet();

import {
  scanWords,
  type WordInfo,
} from '@/client/puzzles/friends/gen/scan-words';
import { boardContext } from '@/client/puzzles/friends/lexicon';
import { placeSeedPath } from '@/client/puzzles/friends/gen/place-seed-path';
import { applyWord } from '@/client/puzzles/friends/gen/apply-word';
import { shuffle } from '@/client/puzzles/friends/helpers';
import {
  FILLWORDS,
  SECONDARY_SEEDS,
  shareRoot,
} from '@/client/puzzles/friends/words';
import { searchPlacement } from '@/client/puzzles/friends/gen/search-placement';
import { scanAvoid } from '@/client/puzzles/friends/gen/scan-avoid';
import { enrich } from '@/client/puzzles/friends/gen/enrich';
import {
  bestFirst,
  type Candidate,
} from '@/client/puzzles/friends/gen/best-first';

export interface BuildResult {
  grid: string[];
  edges: Set<string>;
  accepted: Map<string, WordInfo>;
  seed: string;
  seed2: string;
}

interface FillState {
  grid: (string | null)[];
  edges: Set<string>;
  maxWordLen: number;
  wordsPlaced: number;
  usedWords: Set<string>;
}

export function countPotentialFit(
  grid: (string | null)[],
  words: string[],
): number {
  const placed: Record<string, number> = {};
  let emptyCount = 0;
  for (const cell of grid) {
    if (cell === null) {
      emptyCount++;
    } else {
      placed[cell] = (placed[cell] ?? 0) + 1;
    }
  }
  let count = 0;
  for (const word of words) {
    const needed: Record<string, number> = {};
    for (const ch of word) {
      needed[ch] = (needed[ch] ?? 0) + 1;
    }
    let extraNeeded = 0;
    for (const [ch, cnt] of Object.entries(needed)) {
      extraNeeded += Math.max(0, cnt - (placed[ch] ?? 0));
    }
    if (extraNeeded <= emptyCount) {
      count++;
    }
  }
  return count;
}

export async function tryBuild(seed: string): Promise<BuildResult | null> {
  const initialGrid: (string | null)[] = Array.from({ length: 16 }, () => null);
  const initialEdges = new Set<string>();
  const seedPath = placeSeedPath(seed.length);
  if (!seedPath) {
    return null;
  }
  applyWord(seed, seedPath, initialGrid, initialEdges);

  // Place a second anchor word (length ≥ 8, different root from seed1).
  const secondaryPool = shuffle(
    SECONDARY_SEEDS.filter((w) => w !== seed && !shareRoot(seed, w)),
  );
  let seed2: string | null = null;
  for (const candidate of secondaryPool) {
    const placements = searchPlacement(
      candidate,
      [...initialGrid],
      initialEdges,
    );
    if (placements.length === 0) {
      continue;
    }
    applyWord(candidate, placements[0].path, initialGrid, initialEdges);
    seed2 = candidate;
    break;
  }
  if (!seed2) {
    return null;
  }
  const seed2Word = seed2;

  const shuffled = shuffle(FILLWORDS);
  const allLens = [9, 8, 7, 6, 5, 4] as const;
  const wordsByLen = new Map<number, string[]>();
  for (const len of allLens) {
    const ws = shuffled.filter((w) => w.length === len);
    if (ws.length > 0) {
      wordsByLen.set(len, ws);
    }
  }
  const sortedLens = allLens.filter((l) => wordsByLen.has(l));

  const initialMaxWordLen = sortedLens[0] ?? 9;
  const seedCandidate = new FillCandidate(
    {
      grid: initialGrid,
      edges: initialEdges,
      maxWordLen: initialMaxWordLen,
      wordsPlaced: 0,
      // Exclude both seeds from the fill search so they can't be re-placed.
      usedWords: new Set<string>([seed, seed2Word]),
    },
    wordsByLen,
    sortedLens,
  );

  // bestFirst yields fully-filled grids in strictly descending maxScore
  // order, and a full grid's real value can never exceed its own bound — so
  // the first one that verifies is provably the best reachable result. No
  // need to keep searching for a higher-scoring accepted grid.
  for (const filled of bestFirst([seedCandidate])) {
    const filledGrid = filled.grid as string[];
    // Copy edges: enrich mutates them; filled.edges may be frozen by immer.
    const edges = new Set(filled.edges);
    if (scanAvoid(filledGrid, edges).size > 0) {
      continue;
    }
    const ctx = await boardContext(filledGrid);
    enrich(filledGrid, edges, ctx);
    const accepted = scanWords(filledGrid, edges, ctx);
    if (!accepted.has(seed) || !accepted.has(seed2Word)) {
      continue;
    }
    return { grid: filledGrid, edges, accepted, seed, seed2: seed2Word };
  }
  return null;
}

/**
 * A node in the fill search tree: a grid partially filled with words, plus
 * the bookkeeping (`maxWordLen`, `usedWords`) needed to expand it further.
 * Immutable — best-first expansion order isn't depth-first, so state the old
 * DFS mutated in place around the recursive call (`usedWords`, added before
 * recursing and deleted after) must instead be carried per-candidate.
 */
class FillCandidate implements Candidate<FillState> {
  constructor(
    private readonly state: FillState,
    private readonly wordsByLen: Map<number, string[]>,
    private readonly sortedLens: readonly number[],
  ) {}

  get maxScore(): number {
    const { grid, maxWordLen, usedWords, wordsPlaced } = this.state;
    const remaining = FILLWORDS.filter(
      (w) => !usedWords.has(w) && w.length <= maxWordLen,
    );
    // Valid for both pruning and leaf scoring: placing a word increments
    // wordsPlaced by 1 but removes the word from remaining and tightens the
    // empty-slot budget, so the bound is non-increasing along any path.
    return wordsPlaced + countPotentialFit(grid, remaining);
  }

  resolution(): FillState | undefined {
    return this.state.grid.includes(null) ? undefined : this.state;
  }

  expand(): Iterable<Candidate<FillState>> {
    const { grid, edges, maxWordLen, usedWords } = this.state;
    let targetLen: number | null = null;
    const children: Candidate<FillState>[] = [];

    for (const len of this.sortedLens) {
      if (len > maxWordLen) {
        continue;
      }
      const wordsOfLen = this.wordsByLen.get(len) ?? [];
      for (const word of wordsOfLen) {
        if (usedWords.has(word)) {
          continue;
        }
        const placements = searchPlacement(word, grid, edges);
        if (placements.length === 0) {
          continue;
        }
        targetLen = len;
        for (const placement of placements) {
          const nextState = produce(this.state, (draft) => {
            applyWord(word, placement.path, draft.grid, draft.edges);
            draft.maxWordLen = len;
            draft.wordsPlaced += 1;
            draft.usedWords.add(word);
          });
          children.push(
            new FillCandidate(nextState, this.wordsByLen, this.sortedLens),
          );
        }
      }
      if (targetLen !== null) {
        break;
      }
    }
    return children;
  }
}
