import * as fs from 'node:fs/promises';
import path from 'node:path';

import {
  AVOID,
  buildPrefixes,
  DEFAULT_WORDS,
} from '@/client/puzzles/friends/words';
import { findProjectDirectory } from '@/remark/traverse';

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

/** ---------------- Lexicon (built-in or imported) ----------------
 * A lexicon is the full acceptance vocabulary plus a 26-bit letter mask per
 * word, so each board can quickly extract only the words its letters allow.
 */
async function makeLexicon(): Promise<Lexicon> {
  const projectDirectory = await findProjectDirectory();
  const wordsFile = path.join(
    projectDirectory,
    'src/client/puzzles/friends/words/words.txt',
  );
  const text = await fs.readFile(wordsFile, 'utf8');

  const set = new Set(DEFAULT_WORDS);
  for (const line of text.split(/\r?\n/)) {
    const w = line.trim();
    if (/^[a-z]{4,16}$/.test(w)) {
      const U = w.toUpperCase();
      if (!AVOID.has(U)) set.add(U);
    }
  }

  const words = [...set].sort();
  const masks = new Uint32Array(words.length);
  for (const [i, w] of words.entries()) {
    let m = 0;
    for (let j = 0; j < w.length; j++)
      m |= 1 << ((w.codePointAt(j) ?? 65) - 65);
    masks[i] = m;
  }
  return { words, masks, size: words.length };
}

export const DEFAULT_LEXICON: Lexicon = await makeLexicon();

/** Per-board dictionary: only lexicon words whose letters all appear on the board.
 */
export function boardContext(grid: string[]): BoardCtx {
  let bm = 0;
  for (const L of grid) bm |= 1 << ((L.codePointAt(0) ?? 65) - 65);
  const dict = new Set<string>();
  let maxLen = 4;
  const { words, masks } = DEFAULT_LEXICON;
  for (const [i, word] of words.entries()) {
    if ((masks[i] & ~bm) === 0 && word.length <= 16) {
      dict.add(word);
      if (word.length > maxLen) maxLen = word.length;
    }
  }
  return { dict, prefixes: buildPrefixes(dict), maxLen };
}
