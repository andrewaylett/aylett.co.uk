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
}

interface DfsState {
  grid: (string | null)[];
  edges: Set<string>;
  maxWordLen: number;
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

  let bestResult: BuildResult | null = null;
  let bestScore = -Infinity;
  const usedWords = new Set<string>();

  const dfs = async (state: DfsState, wordsPlaced: number): Promise<void> => {
    const remaining = FILLWORDS.filter(
      (w) => !usedWords.has(w) && w.length <= state.maxWordLen,
    );
    const emptyCount = state.grid.filter((c) => c === null).length;

    // upperBound is valid for both pruning and leaf scoring: placing a word
    // increments wordsPlaced by 1 but removes the word from remaining and
    // tightens empty-slot budget, so the bound is non-increasing along any path.
    const upperBound = wordsPlaced + countPotentialFit(state.grid, remaining);
    if (upperBound <= bestScore) {
      return;
    }

    if (emptyCount === 0) {
      const filledGrid = state.grid as string[];
      // Copy edges: enrich mutates them; state.edges may be frozen by immer.
      const edges = new Set(state.edges);
      if (scanAvoid(filledGrid, edges).size > 0) {
        return;
      }
      const ctx = await boardContext(filledGrid);
      enrich(filledGrid, edges, ctx);
      const accepted = scanWords(filledGrid, edges, ctx);
      if (!accepted.has(seed)) {
        return;
      }
      if (upperBound > bestScore) {
        bestScore = upperBound;
        bestResult = { grid: filledGrid, edges, accepted, seed };
      }
      return;
    }

    let targetLen: number | null = null;
    const candidates: {
      word: string;
      placement: Placement;
      candidateScore: number;
    }[] = [];

    for (const len of sortedLens) {
      if (len > state.maxWordLen) {
        continue;
      }
      const wordsOfLen = wordsByLen.get(len) ?? [];
      for (const word of wordsOfLen) {
        if (usedWords.has(word)) {
          continue;
        }
        const placement = searchPlacement(word, state.grid, state.edges);
        if (!placement) {
          continue;
        }
        targetLen = len;
        // Temp copy for scoring; produce would be wasteful here.
        const tempGrid = [...state.grid];
        const tempEdges = new Set(state.edges);
        applyWord(word, placement.path, tempGrid, tempEdges);
        const nextRemaining = remaining.filter((w) => w !== word);
        const candidateScore =
          wordsPlaced + 1 + countPotentialFit(tempGrid, nextRemaining);
        candidates.push({ word, placement, candidateScore });
      }
      if (targetLen !== null) {
        break;
      }
    }

    if (candidates.length === 0 || targetLen === null) {
      return;
    }
    candidates.sort((a, b) => b.candidateScore - a.candidateScore);
    const capturedLen = targetLen;

    for (const { word, placement } of candidates) {
      usedWords.add(word);
      const nextState = produce(state, (draft) => {
        applyWord(word, placement.path, draft.grid, draft.edges);
        draft.maxWordLen = capturedLen;
      });
      await dfs(nextState, wordsPlaced + 1);
      usedWords.delete(word);
    }
  };

  const initialMaxWordLen = sortedLens[0] ?? 9;
  await dfs(
    { grid: initialGrid, edges: initialEdges, maxWordLen: initialMaxWordLen },
    0,
  );
  return bestResult;
}
