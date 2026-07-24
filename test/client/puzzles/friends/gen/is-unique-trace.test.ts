import { describe, expect, it } from '@jest/globals';

import { isUniqueTrace } from '@/client/puzzles/friends/gen/is-unique-trace';

describe('isUniqueTrace', () => {
  it('returns true when exactly one path traces the word', () => {
    const grid: (string | null)[] = [
      'c',
      'a',
      't',
      's',
      ...Array.from<null>({ length: 12 }).fill(null),
    ];
    const edges = new Set(['0-1', '1-2', '2-3']);
    expect(isUniqueTrace('cats', grid, edges)).toBe(true);
  });

  it('returns false when two independent paths trace the same word', () => {
    // Path 1: 0(c) → 1(a) → 2(t) → 3(s)
    // Path 2: 4(c) → 5(a) → 2(t) → 3(s)   (cell 5 is diagonally adjacent to 2)
    const grid: (string | null)[] = [
      'c',
      'a',
      't',
      's',
      'c',
      'a',
      ...Array.from<null>({ length: 10 }).fill(null),
    ];
    const edges = new Set(['0-1', '1-2', '2-3', '4-5', '2-5']);
    expect(isUniqueTrace('cats', grid, edges)).toBe(false);
  });

  it('returns false when the word cannot be traced at all', () => {
    const grid: (string | null)[] = Array.from<null>({ length: 16 }).fill(null);
    const edges = new Set<string>();
    expect(isUniqueTrace('cats', grid, edges)).toBe(false);
  });

  it('ignores a second candidate path broken by a missing edge', () => {
    // Cell 5 also spells 'ca' via 4-5, but there's no edge from 5 onward, so
    // only the 0-1-2-3 path can actually complete the word.
    const grid: (string | null)[] = [
      'c',
      'a',
      't',
      's',
      'c',
      'a',
      ...Array.from<null>({ length: 10 }).fill(null),
    ];
    const edges = new Set(['0-1', '1-2', '2-3', '4-5']);
    expect(isUniqueTrace('cats', grid, edges)).toBe(true);
  });
});
