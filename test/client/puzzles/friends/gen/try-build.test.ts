import { describe, expect, it } from '@jest/globals';
import { produce } from 'immer';

// Importing try-build triggers enableMapSet(), which is required for Immer to
// handle the Set<string> edges field in DfsState. This import must be present
// for the test below to pass, and removing enableMapSet() from try-build will
// break it.
import { countPotentialFit } from '@/client/puzzles/friends/gen/try-build';

describe('try-build Immer setup', () => {
  it('produce can mutate Set fields (requires enableMapSet)', () => {
    const state: {
      grid: (string | null)[];
      edges: Set<string>;
      maxWordLen: number;
    } = {
      grid: Array.from({ length: 16 }, () => null),
      edges: new Set(['1-2', '3-4']),
      maxWordLen: 9,
    };

    const next = produce(state, (draft) => {
      draft.edges.add('5-6');
      draft.grid[0] = 'A';
    });

    expect(next.edges).toEqual(new Set(['1-2', '3-4', '5-6']));
    expect(next.grid[0]).toBe('A');
    expect(state.edges.size).toBe(2);
    expect(state.grid[0]).toBeNull();
  });
});

describe('countPotentialFit', () => {
  const emptyGrid: (string | null)[] = Array.from({ length: 16 }, () => null);

  it('returns 0 for empty word list', () => {
    expect(countPotentialFit(emptyGrid, [])).toBe(0);
  });

  it('counts all words when grid is empty and words fit within 16 slots', () => {
    // Any word up to 16 chars trivially fits an all-empty 16-cell grid.
    const words = ['cat', 'dog', 'elephant'];
    expect(countPotentialFit(emptyGrid, words)).toBe(3);
  });

  it('counts a word that needs only placed letters', () => {
    // Grid has A, B, C placed; word "abc" needs exactly those letters.
    const grid: (string | null)[] = [
      'a',
      'b',
      'c',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    expect(countPotentialFit(grid, ['abc'])).toBe(1);
  });

  it('excludes a word whose letters cannot be satisfied by placed + empty slots', () => {
    // Grid has 1 empty slot and no 'z'; "zoo" needs two o's and one z.
    // No 'o' placed either, so 3 letters needed but only 1 empty slot.
    const grid: (string | null)[] = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      null,
    ];
    expect(countPotentialFit(grid, ['zoo'])).toBe(0);
  });

  it('respects letter multiplicity — two of the same letter needed but only one placed', () => {
    // Grid has one 'o' placed and one empty slot. "too" needs two o's: one
    // placed satisfies one, the empty slot satisfies the second — so it fits.
    const grid: (string | null)[] = [
      'o',
      null,
      't',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
    ];
    expect(countPotentialFit(grid, ['too'])).toBe(1);

    // Now remove the empty slot: two o's needed, only one placed — doesn't fit.
    const fullGrid: (string | null)[] = [
      'o',
      'x',
      't',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
    ];
    expect(countPotentialFit(fullGrid, ['too'])).toBe(0);
  });

  it('counts a word when all its letters are already placed (zero empty slots needed)', () => {
    // Fully-placed grid where "abc" letters all exist.
    const grid: (string | null)[] = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
    ];
    expect(countPotentialFit(grid, ['abc'])).toBe(1);
  });

  it('filtering by maxWordLen tightens the bound', () => {
    // Demonstrate the purpose of the optimisation: an unfiltered list that
    // includes long words inflates the count relative to a list capped at the
    // current maxWordLen.
    const words = ['cat', 'elephant', 'hippopotamus'];
    const allCount = countPotentialFit(emptyGrid, words);
    const cappedWords = words.filter((w) => w.length <= 4);
    const cappedCount = countPotentialFit(emptyGrid, cappedWords);
    expect(cappedCount).toBeLessThan(allCount);
  });
});
