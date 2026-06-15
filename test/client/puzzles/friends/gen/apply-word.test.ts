import { describe, expect, it } from '@jest/globals';

import { applyWord } from '@/client/puzzles/friends/gen/apply-word';
import { ekey } from '@/client/puzzles/friends/helpers';

function emptyGrid(): (string | null)[] {
  return Array.from({ length: 16 }, () => null);
}

describe('applyWord', () => {
  it('writes each character to the corresponding grid slot', () => {
    const grid = emptyGrid();
    const edges = new Set<string>();
    applyWord('cats', [0, 1, 2, 3], grid, edges);
    expect(grid[0]).toBe('c');
    expect(grid[1]).toBe('a');
    expect(grid[2]).toBe('t');
    expect(grid[3]).toBe('s');
  });

  it('adds exactly word.length - 1 edges', () => {
    const grid = emptyGrid();
    const edges = new Set<string>();
    applyWord('dogs', [4, 5, 6, 7], grid, edges);
    expect(edges.size).toBe(3); // 4 letters → 3 edges
  });

  it('edges are undirected: applying forward vs reversed yields the same edge set', () => {
    const forwardGrid = emptyGrid();
    const forwardEdges = new Set<string>();
    applyWord('cats', [0, 1, 2, 3], forwardGrid, forwardEdges);

    const reverseGrid = emptyGrid();
    const reverseEdges = new Set<string>();
    applyWord('stac', [3, 2, 1, 0], reverseGrid, reverseEdges);

    expect(reverseEdges).toEqual(forwardEdges);
  });

  it('does not overwrite grid slots not in path', () => {
    const grid = emptyGrid();
    grid[7] = 'x';
    const edges = new Set<string>();
    applyWord('cats', [0, 1, 2, 3], grid, edges);
    expect(grid[7]).toBe('x');
    for (let i = 4; i < 16; i++) {
      if (i === 7) {
        continue;
      }
      expect(grid[i]).toBeNull();
    }
  });

  it('does not add edges for non-consecutive path cells', () => {
    const grid = emptyGrid();
    const edges = new Set<string>();
    // path [0, 1, 2, 3]: only consecutive pairs get edges
    applyWord('cats', [0, 1, 2, 3], grid, edges);
    // edge between 0 and 3 should not exist (they are not consecutive in path)
    expect(edges.has(ekey('0', '3'))).toBe(false);
    // but consecutive pairs should
    expect(edges.has(ekey('0', '1'))).toBe(true);
    expect(edges.has(ekey('1', '2'))).toBe(true);
    expect(edges.has(ekey('2', '3'))).toBe(true);
  });
});
