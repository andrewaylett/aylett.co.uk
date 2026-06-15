import { describe, expect, it } from '@jest/globals';

import {
  ALL_PAIRS,
  cellDegree,
  ekey,
  INNER_CELLS,
  maxEdgesForCell,
  NEIGH,
} from '@/client/puzzles/friends/helpers';

describe('NEIGH invariants', () => {
  it('corner cells each have exactly 3 neighbours', () => {
    for (const cell of [0, 3, 12, 15]) {
      expect(NEIGH[cell]).toHaveLength(3);
    }
  });

  it('edge-non-corner cells each have exactly 5 neighbours', () => {
    for (const cell of [1, 2, 4, 7, 8, 11, 13, 14]) {
      expect(NEIGH[cell]).toHaveLength(5);
    }
  });

  it('inner cells each have exactly 8 neighbours', () => {
    for (const cell of [5, 6, 9, 10]) {
      expect(NEIGH[cell]).toHaveLength(8);
    }
  });

  it('is symmetric: if j ∈ NEIGH[i] then i ∈ NEIGH[j]', () => {
    for (let i = 0; i < 16; i++) {
      for (const j of NEIGH[i]) {
        expect(NEIGH[j]).toContain(i);
      }
    }
  });
});

describe('ALL_PAIRS invariants', () => {
  it('every pair has i < j', () => {
    for (const [i, j] of ALL_PAIRS) {
      expect(i).toBeLessThan(j);
    }
  });

  it('every pair is mutually adjacent', () => {
    for (const [i, j] of ALL_PAIRS) {
      expect(NEIGH[i]).toContain(j);
      expect(NEIGH[j]).toContain(i);
    }
  });

  it('length equals the number of unique edges (sum of neighbour list sizes / 2)', () => {
    const totalNeighbours = NEIGH.reduce((sum, ns) => sum + ns.length, 0);
    expect(ALL_PAIRS).toHaveLength(totalNeighbours / 2);
  });
});

describe('ekey', () => {
  it('is symmetric', () => {
    expect(ekey('a', 'b')).toBe(ekey('b', 'a'));
    expect(ekey('10', '5')).toBe(ekey('5', '10'));
  });

  it('places the lexicographically smaller value first', () => {
    expect(ekey('0', '1')).toBe('0-1');
    expect(ekey('9', '10')).toBe('10-9');
  });
});

describe('INNER_CELLS', () => {
  it('is exactly {5, 6, 9, 10}', () => {
    expect(INNER_CELLS).toEqual(new Set([5, 6, 9, 10]));
  });
});

describe('maxEdgesForCell', () => {
  it('returns 4 for inner cells', () => {
    for (const cell of [5, 6, 9, 10]) {
      expect(maxEdgesForCell(cell)).toBe(4);
    }
  });

  it('returns 3 for all other cells', () => {
    for (const cell of [0, 1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 15]) {
      expect(maxEdgesForCell(cell)).toBe(3);
    }
  });
});

describe('cellDegree', () => {
  it('returns 0 when no edges reference the cell', () => {
    expect(cellDegree(0, new Set())).toBe(0);
    expect(cellDegree(5, new Set(['2-3', '1-2']))).toBe(0);
  });

  it('counts only edges that touch the cell', () => {
    // Cell 0 neighbours: 1, 4, 5. Add edges for 0-1 and 0-4.
    const edges = new Set([
      ekey('0', '1'),
      ekey('0', '4'),
      ekey('1', '2'), // does not touch cell 0
    ]);
    expect(cellDegree(0, edges)).toBe(2);
  });

  it('ignores non-adjacent cells even if an edge string is present', () => {
    // Cell 0 and cell 15 are not adjacent; the ekey string won't appear in
    // NEIGH[0] so cellDegree correctly ignores it.
    const edges = new Set([ekey('0', '15')]);
    expect(cellDegree(0, edges)).toBe(0);
  });
});
