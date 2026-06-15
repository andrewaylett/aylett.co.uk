import { describe, expect, it } from '@jest/globals';

import { isImplied } from '@/client/puzzles/friends/gen/is-implied';

describe('isImplied', () => {
  it('returns true when a is a forward substring of b', () => {
    expect(isImplied('at', 'cat')).toBe(true);
  });

  it('returns true when reversed a is a substring of b', () => {
    // reverse('ta') = 'at', which is in 'cat'
    expect(isImplied('ta', 'cat')).toBe(true);
  });

  it('returns true when a is a suffix of b', () => {
    expect(isImplied('nap', 'catnap')).toBe(true);
  });

  it('returns true when a is embedded in b', () => {
    expect(isImplied('cat', 'concatenate')).toBe(true);
  });

  it('returns false when a has no overlap with b', () => {
    expect(isImplied('cat', 'dog')).toBe(false);
  });

  it('returns false when a and b are equal length', () => {
    // equal length short-circuits before the substring check
    expect(isImplied('cat', 'cat')).toBe(false);
  });

  it('returns false when a is longer than b', () => {
    expect(isImplied('catnap', 'nap')).toBe(false);
  });
});
