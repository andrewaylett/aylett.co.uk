'use server';

import 'server-only';

import {
  type BuildResult,
  tryBuild,
} from '@/client/puzzles/friends/gen/try-build';
import { CRITTERS, shuffle } from '@/client/puzzles/friends/helpers';
import { SEEDS } from '@/client/puzzles/friends/words';

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
  critters: string[];
}

export async function buildPuzzle(): Promise<Puzzle> {
  let fallback: BuildResult | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)];
    const res = tryBuild(seed);
    if (!res) continue;
    const clean = res.avoidCount === 0;
    if (clean && res.accepted.size >= 14) return pack(res);
    if (
      !fallback ||
      (clean && fallback.avoidCount > 0) ||
      (clean === (fallback.avoidCount === 0) &&
        res.accepted.size > fallback.accepted.size)
    )
      fallback = res;
  }
  if (fallback) return pack(fallback);
  return buildPuzzle();
}

function pack(res: BuildResult): Puzzle {
  const words: Record<string, { cells: number[]; edges: string[] }> = {};
  for (const [w, sets] of res.accepted)
    words[w] = { cells: [...sets.cells], edges: [...sets.edges] };
  return {
    letters: res.grid,
    edges: [...res.edges],
    words,
    seed: res.seed,
    critters: [...shuffle(CRITTERS), ...shuffle(CRITTERS).slice(0, 16)],
  };
}
