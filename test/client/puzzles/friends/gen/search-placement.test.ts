import { describe, expect, it } from '@jest/globals';

import { searchPlacement } from '@/client/puzzles/friends/gen/search-placement';
import { NEIGH } from '@/client/puzzles/friends/helpers';

function emptyGrid(): (string | null)[] {
  return Array.from({ length: 16 }, () => null);
}

describe('searchPlacement', () => {
  it('returns empty array when no placement exists', () => {
    // Fully-filled grid whose letters cannot match the word at all.
    const grid: (string | null)[] = Array.from({ length: 16 }, () => 'z');
    const result = searchPlacement('abcd', grid, new Set());
    expect(result).toHaveLength(0);
  });

  it('returns at least one Placement with correct path length for a word on an empty grid', () => {
    const results = searchPlacement('cats', emptyGrid(), new Set());
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toHaveLength(4);
  });

  it('returned path has all unique cells', () => {
    const results = searchPlacement('dogs', emptyGrid(), new Set());
    expect(results.length).toBeGreaterThan(0);
    const path = results[0].path;
    expect(new Set(path).size).toBe(path.length);
  });

  it('returned path has every consecutive pair adjacent in NEIGH', () => {
    const results = searchPlacement('fish', emptyGrid(), new Set());
    expect(results.length).toBeGreaterThan(0);
    const path = results[0].path;
    for (let i = 0; i < path.length - 1; i++) {
      expect(NEIGH[path[i]]).toContain(path[i + 1]);
    }
  });

  it('fills > 0 is enforced (all-null grid means all cells are new fills)', () => {
    const results = searchPlacement('cats', emptyGrid(), new Set());
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].fills).toBeGreaterThan(0);
  });

  it('fills equals the number of null cells in the path', () => {
    // Grid has 'c' at cell 0; cells 1, 2, 3 are null.
    // A placement starting at 0 and continuing to three null cells gives fills=3.
    const grid = emptyGrid();
    grid[0] = 'c';
    const results = searchPlacement('cats', grid, new Set());
    expect(results.length).toBeGreaterThan(0);
    const nullsInPath = results[0].path.filter((c) => grid[c] === null).length;
    expect(results[0].fills).toBe(nullsInPath);
  });

  it('returns results sorted by score descending', () => {
    const results = searchPlacement('cats', emptyGrid(), new Set());
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('returns at most MAX_PLACEMENTS results', () => {
    const results = searchPlacement('cats', emptyGrid(), new Set());
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
