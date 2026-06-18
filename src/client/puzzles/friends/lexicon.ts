import 'server-only';

import { readFile } from 'node:fs/promises';

import { cache } from 'react';

import {
  AVOID,
  buildPrefixes,
  DEFAULT_WORDS,
} from '@/client/puzzles/friends/words';

export interface Lexicon {
  words: string[];
  masks: Uint32Array;
  size: number;
}

export interface BoardCtx {
  dict: Set<string>;
  prefixes: Set<string>;
  maxLen: number;
}

const useLocal = process.env.NODE_ENV !== 'production';

async function remote() {
  const wordsResponse = await fetch(
    'https://atlas.aylett.co.uk/puzzles/words.txt',
  );

  if (!wordsResponse.ok) {
    throw new Error(
      `Failed to load words: error ${wordsResponse.status}, ${wordsResponse.statusText}`,
    );
  }
  return await wordsResponse.text();
}

async function local() {
  return await readFile('./words.txt', { encoding: 'utf8' });
}

/**
 * Lexicon (built-in or imported).
 * A lexicon is the full acceptance vocabulary plus a 26-bit letter mask per
 * word, so each board can quickly extract only the words its letters allow.
 */
async function makeLexicon(): Promise<Lexicon> {
  const text = await (useLocal ? local() : remote());

  const set = new Set(DEFAULT_WORDS);
  for (const line of text.split(/\r?\n/)) {
    const w = line.trim();
    if (/^[a-z]{4,16}$/.test(w)) {
      const U = w.toUpperCase();
      if (!AVOID.has(U)) {
        set.add(U);
      }
    }
  }

  const words = [...set].sort();
  const masks = new Uint32Array(words.length);
  for (const [i, w] of words.entries()) {
    let m = 0;
    for (let j = 0; j < w.length; j++) {
      m |= 1 << ((w.codePointAt(j) ?? 65) - 65);
    }
    masks[i] = m;
  }
  return { words, masks, size: words.length };
}

const cachedLexicon = cache(makeLexicon);

/** Per-board dictionary: only lexicon words whose letters all appear on the board.
 */
export async function boardContext(grid: string[]): Promise<BoardCtx> {
  let bm = 0;
  for (const L of grid) {
    bm |= 1 << ((L.codePointAt(0) ?? 65) - 65);
  }
  const dict = new Set<string>();
  let maxLen = 4;
  const { words, masks } = await cachedLexicon();
  for (const [i, word] of words.entries()) {
    if ((masks[i] & ~bm) === 0 && word.length <= 16) {
      dict.add(word);
      if (word.length > maxLen) {
        maxLen = word.length;
      }
    }
  }
  return { dict, prefixes: buildPrefixes(dict), maxLen };
}
