import { scanSet } from '@/client/puzzles/friends/gen/scan-set';
import {
  AVOID,
  AVOID_MAXLEN,
  AVOID_PREFIXES,
} from '@/client/puzzles/friends/words';

export const scanAvoid = (grid: string[], edges: Set<string>): Set<string> =>
  scanSet(grid, edges, AVOID, AVOID_PREFIXES, AVOID_MAXLEN);
