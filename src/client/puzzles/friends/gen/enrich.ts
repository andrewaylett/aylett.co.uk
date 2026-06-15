import type { BoardCtx } from '@/client/puzzles/friends/lexicon';

import { scanSet } from '@/client/puzzles/friends/gen/scan-set';
import {
  ALL_PAIRS,
  cellDegree,
  ekey,
  maxEdgesForCell,
} from '@/client/puzzles/friends/helpers';
import { scanAvoid } from '@/client/puzzles/friends/gen/scan-avoid';

/** Enrichment: add extra lines wherever doing so unlocks at least one new word
 * of 6+ letters (and never unlocks an avoid-list word).
 */
export function enrich(
  grid: string[],
  edges: Set<string>,
  ctx: BoardCtx,
  maxExtra = 8,
): void {
  let current = scanSet(grid, edges, ctx.dict, ctx.prefixes, ctx.maxLen);
  for (let round = 0; round < maxExtra; round++) {
    let best: { k: string; gain: number } | null = null;
    for (const [a, b] of ALL_PAIRS) {
      const k = ekey(a.toString(), b.toString());
      if (edges.has(k)) {
        continue;
      }
      if (
        cellDegree(a, edges) >= maxEdgesForCell(a) ||
        cellDegree(b, edges) >= maxEdgesForCell(b)
      ) {
        continue;
      }
      edges.add(k);
      let gain = 0;
      let longGain = 0;
      if (scanAvoid(grid, edges).size === 0) {
        const ws = scanSet(grid, edges, ctx.dict, ctx.prefixes, ctx.maxLen);
        for (const w of ws) {
          if (!current.has(w)) {
            gain++;
            if (w.length >= 6) {
              longGain++;
            }
          }
        }
      }
      edges.delete(k);
      if (longGain > 0 && (!best || gain > best.gain)) {
        best = { k, gain };
      }
    }
    if (!best) {
      break;
    }
    edges.add(best.k);
    current = scanSet(grid, edges, ctx.dict, ctx.prefixes, ctx.maxLen);
  }
}
