import { describe, expect, it } from '@jest/globals';

import { placeSeedPath } from '@/client/puzzles/friends/gen/place-seed-path';
import { NEIGH } from '@/client/puzzles/friends/helpers';

function checkPath(path: number[], L: number): void {
  expect(path).toHaveLength(L);
  expect(new Set(path).size).toBe(L); // all cells unique
  for (let i = 0; i < path.length - 1; i++) {
    expect(NEIGH[path[i]]).toContain(path[i + 1]);
  }
}

describe('placeSeedPath', () => {
  for (const L of [4, 5, 7, 9, 16]) {
    it(`returns a valid path of length ${L}`, () => {
      const path = placeSeedPath(L);
      expect(path).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      checkPath(path!, L);
    });
  }

  it('returns null for L = 17 (more cells than the grid has)', () => {
    // The grid only has 16 cells, so no Hamiltonian path of length 17 exists.
    const result = placeSeedPath(17);
    expect(result).toBeNull();
  });
});
