import { describe, expect, it } from '@jest/globals';
import { produce } from 'immer';

// Importing try-build triggers enableMapSet(), which is required for Immer to
// handle the Set<string> edges field in DfsState. This import must be present
// for the test below to pass, and removing enableMapSet() from try-build will
// break it.
import '@/client/puzzles/friends/gen/try-build';

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
