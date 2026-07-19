import { describe, expect, it } from '@jest/globals';

import {
  searchPlacement,
  upperBoundScore,
} from '@/client/puzzles/friends/gen/search-placement';
import { ekey, NEIGH } from '@/client/puzzles/friends/helpers';

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

  // Regression test for the bound-and-prune + incremental top-K
  // optimisation. The DFS explores every neighbour of every cell regardless
  // of `shuffle`'s order — shuffle only changes iteration order, not the set
  // explored — so for a case comfortably under the 6000-node cap, the set of
  // reachable leaf scores (and therefore the top-K scores) is deterministic
  // even though path selection among ties is not. This grid has 13 reachable
  // placements of 'cats' (well past MAX_PLACEMENTS), so pruning genuinely
  // engages rather than merely finding all results before the cap is hit —
  // an earlier version of this test used a grid with only 3 total
  // placements, under which pruning never activates before the search ends,
  // so it couldn't have caught an over-aggressive threshold (e.g. comparing
  // against the *best* kept score instead of the *worst*). The three
  // expected scores below are verified by hand against the leaf-score
  // formula (see upperBoundScore's doc comment) for paths [1,4,9,13],
  // [9,4,0,1] and [1,4,8,9] respectively.
  it('characterization: exact top-K scores where pruning must discriminate among many candidates', () => {
    const grid: (string | null)[] = [
      't',
      null,
      'z',
      'z',
      'a',
      's',
      'z',
      'z',
      't',
      null,
      'z',
      null,
      'z',
      null,
      'z',
      null,
    ];
    const edges = new Set([ekey('0', '4')]);
    const results = searchPlacement('cats', grid, edges);
    expect(results.map((r) => r.score)).toEqual([306, 272, 258]);
  });

  it('scenario: partially-filled grid exercises reuse and mixed fill contributions', () => {
    // Pre-fills two adjacent cells and their connecting edge, so completions
    // exercise both letter-reuse and edge-reuse alongside fresh fills,
    // giving the pruning bound a non-trivial (non-uniform) score landscape
    // to cut against.
    const grid = emptyGrid();
    grid[0] = 'c';
    grid[1] = 'a';
    const edges = new Set([ekey('0', '1')]);
    const results = searchPlacement('cat', grid, edges);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const r of results) {
      expect(r.fills).toBeGreaterThan(0);
    }
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  describe('upperBoundScore', () => {
    it('equals the exact leaf formula when i === L', () => {
      const L = 4;
      const fills = 3;
      const reuse = 1;
      const newE = 3;
      const leafScore = L * 30 + fills * 60 + reuse * 12 - newE * 2;
      expect(upperBoundScore(L, L, fills, reuse, newE)).toBe(leafScore);
    });

    it('is non-increasing as i advances toward L for fixed running totals', () => {
      const L = 5;
      const fills = 2;
      const reuse = 1;
      const newE = 1;
      let previous = upperBoundScore(L, 0, fills, reuse, newE);
      for (let i = 1; i <= L; i++) {
        const current = upperBoundScore(L, i, fills, reuse, newE);
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    });

    it('matches a hand-computed bound for an empty-grid first step', () => {
      // L=3, one step taken (a fill, no edge yet): 3*30 + 1*60 + 58*(3-1).
      expect(upperBoundScore(3, 1, 1, 0, 0)).toBe(266);
    });

    it('matches a hand-computed bound with reuse and newE present', () => {
      // L=4, i=2, fills=1, reuse=1, newE=1: 4*30 + 1*60 + 1*12 - 1*2 + 58*2.
      expect(upperBoundScore(4, 2, 1, 1, 1)).toBe(306);
    });
  });
});
