'use server';

import 'server-only';

import type { WordInfo } from '@/client/puzzles/friends/gen/scan-words';

import {
  type BuildResult,
  tryBuild,
} from '@/client/puzzles/friends/gen/try-build';
import { CRITTERS, shuffle } from '@/client/puzzles/friends/helpers';
import { SEEDS } from '@/client/puzzles/friends/words';
import { isImplied } from '@/client/puzzles/friends/gen/is-implied';

export interface WordsValue {
  cells: number[];
  edges: string[];
}

export type WordsRecord = Partial<Record<string, WordsValue>>;

export interface Puzzle {
  letters: string[];
  edges: string[];
  words: WordsRecord;
  seed: string;
  seed2: string;
  critters: string[];
}

function effectiveSize(accepted: Map<string, WordInfo>): number {
  const words = [...accepted.keys()];
  return words.filter((w) => !words.some((other) => isImplied(w, other)))
    .length;
}

export async function buildPuzzle(): Promise<Puzzle> {
  let fallback: BuildResult | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)];
    const res = await tryBuild(seed);
    if (!res) {
      continue;
    }
    const size = effectiveSize(res.accepted);
    if (size >= 14) {
      return pack(res);
    }
    if (!fallback || size > effectiveSize(fallback.accepted)) {
      fallback = res;
    }
  }
  if (fallback) {
    return pack(fallback);
  }
  return buildPuzzle();
}

function pack(res: BuildResult): Puzzle {
  const words: Record<string, { cells: number[]; edges: string[] }> = {};
  for (const [w, sets] of res.accepted) {
    words[w] = { cells: [...sets.cells], edges: [...sets.edges] };
  }
  return {
    letters: res.grid,
    edges: [...res.edges],
    words,
    seed: res.seed,
    seed2: res.seed2,
    critters: shuffle(CRITTERS).slice(0, 16),
  };
}
