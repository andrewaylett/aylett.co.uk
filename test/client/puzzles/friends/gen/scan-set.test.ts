import { describe, expect, it } from '@jest/globals';

import { scanSet } from '@/client/puzzles/friends/gen/scan-set';

// Minimal board: c-a-t-s in cells 0-3, rest filled with 'z' (unreachable).
// Edges only connect 0-1-2-3, so the only traceable paths are 0→1→2→3 and
// its reverse 3→2→1→0.
const grid: string[] = [
  'c',
  'a',
  't',
  's',
  ...Array.from<string>({ length: 12 }).fill('z'),
];
const edges = new Set(['0-1', '1-2', '2-3']);
// 'stac' is the reverse traversal of the path (s→t→a→c), proving that edges
// are treated as undirected.
const dict = new Set(['cats', 'stac', 'cat']);
const prefixes = new Set(['c', 'ca', 'cat', 'cats', 's', 'st', 'sta', 'stac']);
const maxLen = 4;

describe('scanSet', () => {
  it("finds 'cats' via forward path 0→1→2→3", () => {
    const found = scanSet(grid, edges, dict, prefixes, maxLen);
    expect(found).toContain('cats');
  });

  it("finds 'stac' via reverse path 3→2→1→0, proving edges are undirected", () => {
    const found = scanSet(grid, edges, dict, prefixes, maxLen);
    expect(found).toContain('stac');
  });

  it("does not return 'cat' even though it is in dict (minimum word length is 4)", () => {
    const found = scanSet(grid, edges, dict, prefixes, maxLen);
    expect(found).not.toContain('cat');
  });

  it('does not return words not in dict', () => {
    const found = scanSet(grid, edges, dict, prefixes, maxLen);
    for (const w of found) {
      expect(dict).toContain(w);
    }
  });

  it('respects maxLen — words longer than maxLen are not returned', () => {
    // With maxLen=3 the DFS stops after 3 characters, so 'cats' (length 4)
    // is never reached even though it is in dict and traceable.
    const found = scanSet(grid, edges, dict, prefixes, 3);
    expect(found).not.toContain('cats');
  });
});
