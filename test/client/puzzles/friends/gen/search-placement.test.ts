/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it } from '@jest/globals';

import { searchPlacement } from '@/client/puzzles/friends/gen/search-placement';
import { NEIGH } from '@/client/puzzles/friends/helpers';

function emptyGrid(): (string | null)[] {
  return Array.from({ length: 16 }, () => null);
}

describe('searchPlacement', () => {
  it('returns null when no placement exists', () => {
    // Fully-filled grid whose letters cannot match the word at all.
    const grid: (string | null)[] = Array.from({ length: 16 }, () => 'z');
    const result = searchPlacement('abcd', grid, new Set());
    expect(result).toBeNull();
  });

  it('returns a Placement with correct path length for a word on an empty grid', () => {
    const result = searchPlacement('cats', emptyGrid(), new Set());
    expect(result).not.toBeNull();
    expect(result?.path).toHaveLength(4);
  });

  it('returned path has all unique cells', () => {
    const result = searchPlacement('dogs', emptyGrid(), new Set());
    expect(result).not.toBeNull();
    const path = result!.path;
    expect(new Set(path).size).toBe(path.length);
  });

  it('returned path has every consecutive pair adjacent in NEIGH', () => {
    const result = searchPlacement('fish', emptyGrid(), new Set());
    expect(result).not.toBeNull();
    const path = result!.path;
    for (let i = 0; i < path.length - 1; i++) {
      expect(NEIGH[path[i]]).toContain(path[i + 1]);
    }
  });

  it('fills > 0 is enforced (all-null grid means all cells are new fills)', () => {
    const result = searchPlacement('cats', emptyGrid(), new Set());
    expect(result).not.toBeNull();
    expect(result!.fills).toBeGreaterThan(0);
  });

  it('fills equals the number of null cells in the path', () => {
    // Grid has 'c' at cell 0; cells 1, 2, 3 are null.
    // A placement starting at 0 and continuing to three null cells gives fills=3.
    const grid = emptyGrid();
    grid[0] = 'c';
    const result = searchPlacement('cats', grid, new Set());
    expect(result).not.toBeNull();
    const nullsInPath = result!.path.filter((c) => grid[c] === null).length;
    expect(result!.fills).toBe(nullsInPath);
  });
});
