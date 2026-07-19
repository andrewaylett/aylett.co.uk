import 'server-only';

import { RAW_AVOID } from '@/client/puzzles/friends/words/avoid';
import { RAW_EXTRA } from '@/client/puzzles/friends/words/extra';
import { RAW_COMMON } from '@/client/puzzles/friends/words/common';

// ---------------- Built-in dictionary (fallback) ----------------
// Flag syntax: word/FLAGS where S = plural/3rd person, D = past (-ed/-d),
// G = -ing (with e-drop), B = double final consonant before -ed/-ing.

function inflect(base: string, flags: string | string[]) {
  const out = [base];
  const last = base.slice(-1);
  const prev = base.slice(-2, -1);
  const vowels = 'aeiou';
  if (flags.includes('S')) {
    if (/(s|x|z|ch|sh)$/.test(base)) {
      out.push(base + 'es');
    } else if (last === 'y' && !vowels.includes(prev)) {
      out.push(base.slice(0, -1) + 'ies');
    } else {
      out.push(base + 's');
    }
  }
  if (flags.includes('D')) {
    if (last === 'e') {
      out.push(base + 'd');
    } else if (last === 'y' && !vowels.includes(prev)) {
      out.push(base.slice(0, -1) + 'ied');
    } else if (flags.includes('B')) {
      out.push(base + last + 'ed');
    } else {
      out.push(base + 'ed');
    }
  }
  if (flags.includes('G')) {
    if (base.endsWith('ee')) {
      out.push(base + 'ing');
    } else if (last === 'e') {
      out.push(base.slice(0, -1) + 'ing');
    } else if (flags.includes('B')) {
      out.push(base + last + 'ing');
    } else {
      out.push(base + 'ing');
    }
  }
  return out;
}

function expandList(raw: string): Set<string> {
  const out = new Set<string>();
  for (const token of raw.split(/\s+/)) {
    if (!token) {
      continue;
    }
    const [base, flags = ''] = token.split('/');
    if (!/^[a-z]+$/.test(base)) {
      continue;
    }
    for (const w of inflect(base, flags)) {
      if (w.length >= 4) {
        out.add(w.toUpperCase());
      }
    }
  }
  return out;
}

function expandListWithRoots(raw: string): {
  words: Set<string>;
  roots: Map<string, string>;
} {
  const words = new Set<string>();
  const roots = new Map<string, string>();
  for (const token of raw.split(/\s+/)) {
    if (!token) {
      continue;
    }
    const [base, flags = ''] = token.split('/');
    if (!/^[a-z]+$/.test(base)) {
      continue;
    }
    const upperBase = base.toUpperCase();
    for (const w of inflect(base, flags)) {
      if (w.length >= 4) {
        const upper = w.toUpperCase();
        words.add(upper);
        roots.set(upper, upperBase);
      }
    }
  }
  return { words, roots };
}

export const AVOID: Set<string> = expandList(RAW_AVOID);
const { words: COMMON_RAW, roots: COMMON_ROOTS } =
  expandListWithRoots(RAW_COMMON);
const COMMON = new Set([...COMMON_RAW].filter((w) => !AVOID.has(w)));
export const WORD_ROOTS: ReadonlyMap<string, string> = new Map(
  [...COMMON_ROOTS.entries()].filter(([w]) => COMMON.has(w)),
);
export function shareRoot(w1: string, w2: string): boolean {
  const r1 = WORD_ROOTS.get(w1);
  const r2 = WORD_ROOTS.get(w2);
  return r1 !== undefined && r2 !== undefined && r1 === r2;
}
export const DEFAULT_WORDS: string[] = [
  ...new Set(
    [...COMMON, ...expandList(RAW_EXTRA)].filter((w) => !AVOID.has(w)),
  ),
].sort();
export const SEEDS: string[] = [...COMMON].filter(
  (w) => w.length >= 9 && w.length <= 14,
);
export const SECONDARY_SEEDS: string[] = [...COMMON].filter(
  (w) => w.length >= 8 && w.length <= 14,
);
export const FILLWORDS: string[] = [...COMMON].filter(
  (w) => w.length >= 4 && w.length <= 9,
);
export const buildPrefixes = (dict: Set<string>): Set<string> => {
  const p = new Set<string>();
  for (const w of dict) {
    for (let i = 1; i <= w.length; i++) {
      p.add(w.slice(0, i));
    }
  }
  return p;
};
export const AVOID_PREFIXES: Set<string> = buildPrefixes(AVOID);
export const AVOID_MAXLEN: number = Math.max(
  ...[...AVOID].map((w) => w.length),
);
