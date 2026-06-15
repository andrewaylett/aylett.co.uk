import { describe, expect, it } from '@jest/globals';

import type { BoardCtx } from '@/client/puzzles/friends/lexicon';

import { scanWords } from '@/client/puzzles/friends/gen/scan-words';

// Board with two independent paths that both spell 'cats':
//   Path 1: cell 0(c) → 1(a) → 2(t) → 3(s)
//   Path 2: cell 4(c) → 5(a) → 2(t) → 3(s)   (cell 5 is diagonally adjacent to 2)
//
// The WordInfo.cells for 'cats' should be the UNION: {0,1,2,3,4,5}.
const grid: string[] = [
  'c',
  'a',
  't',
  's',
  'c',
  'a',
  ...Array.from<string>({ length: 10 }).fill('z'),
];
const edges = new Set(['0-1', '1-2', '2-3', '4-5', '2-5']);
const baseCtx: BoardCtx = {
  dict: new Set(['cats']),
  prefixes: new Set(['c', 'ca', 'cat', 'cats']),
  maxLen: 4,
};

describe('scanWords', () => {
  it('returns a Map<string, WordInfo>', () => {
    const result = scanWords(grid, edges, baseCtx);
    expect(result).toBeInstanceOf(Map);
  });

  it("finds 'cats' and records it", () => {
    const result = scanWords(grid, edges, baseCtx);
    expect(result.has('cats')).toBe(true);
  });

  it('unions cells from all traceable paths for the same word', () => {
    const result = scanWords(grid, edges, baseCtx);
    const info = result.get('cats');
    expect(info).toBeDefined();
    // Path 1 contributes {0,1,2,3}; path 2 contributes {4,5,2,3}.
    expect(info?.cells).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  it('does not include words shorter than 4 letters', () => {
    const ctx: BoardCtx = {
      ...baseCtx,
      dict: new Set(['cats', 'ca', 'cat']),
      prefixes: new Set(['c', 'ca', 'cat', 'cats']),
    };
    const result = scanWords(grid, edges, ctx);
    expect(result.has('ca')).toBe(false);
    expect(result.has('cat')).toBe(false);
    expect(result.has('cats')).toBe(true);
  });
});
