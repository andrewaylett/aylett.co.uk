import {
  cellDegree,
  ekey,
  maxEdgesForCell,
  NEIGH,
  shuffle,
} from '@/client/puzzles/friends/helpers';
import { isUniqueTrace } from '@/client/puzzles/friends/gen/is-unique-trace';
import {
  bestFirst,
  type Candidate,
} from '@/client/puzzles/friends/gen/best-first';

export interface Placement {
  path: number[];
  score: number;
  fills: number;
}

const MAX_PLACEMENTS = 3;

/**
 * Upper bound on the score of any completion reachable from a search node
 * that has taken `i` of `L` steps with the given running totals.
 *
 * The leaf score is `L*30 + fills*60 + reuse*12 - newE*2`, and `fills`,
 * `reuse`, `newE` only ever increase as the path extends. Each remaining
 * step falls into one of three cases: fill+new-edge (Δscore 58), reuse+new-
 * edge (Δscore 10), or reuse+reused-edge (Δscore 24). A fourth combination,
 * "fill + reused edge", is arithmetically possible (Δscore 72) but cannot
 * occur: `applyWord` (apply-word.ts) only ever adds an edge to `edges` in
 * the same step that assigns letters to both of that edge's endpoints, and
 * `grid` cells are never reset back to `null` once filled — so
 * `grid[nb] === null` (a fill) always implies the edge to `nb` is not yet in
 * `edges` (a new edge). The true per-step maximum is therefore 58, not 72,
 * giving a materially tighter bound.
 */
export function upperBoundScore(
  L: number,
  i: number,
  fills: number,
  reuse: number,
  newE: number,
): number {
  return L * 30 + fills * 60 + reuse * 12 - newE * 2 + 58 * (L - i);
}

/**
 * A node in the placement search tree: a partial path of `word` through the
 * grid. Immutable (each expansion produces new child instances) because
 * best-first expansion order isn't depth-first — the old hand-rolled DFS
 * relied on push/pop symmetry around a shared `degAdj` array, which only
 * works under strict LIFO recursion.
 */
class PlacementCandidate implements Candidate<Placement> {
  constructor(
    private readonly word: string,
    private readonly grid: (string | null)[],
    private readonly edges: Set<string>,
    private readonly i: number,
    private readonly cell: number,
    private readonly path: number[],
    private readonly fills: number,
    private readonly newE: number,
    private readonly reuse: number,
    private readonly degAdj: readonly number[],
  ) {}

  get maxScore(): number {
    return upperBoundScore(
      this.word.length,
      this.i,
      this.fills,
      this.reuse,
      this.newE,
    );
  }

  resolution(): Placement | undefined {
    if (this.i !== this.word.length || this.fills === 0) {
      return undefined;
    }
    // Reject placements that would let the word be traced more than one way
    // once committed — a word must be unambiguous to find.
    const tempGrid = [...this.grid];
    const tempEdges = new Set(this.edges);
    for (let k = 0; k < this.path.length; k++) {
      tempGrid[this.path[k]] = this.word[k];
      if (k > 0) {
        tempEdges.add(
          ekey(this.path[k - 1].toString(), this.path[k].toString()),
        );
      }
    }
    if (!isUniqueTrace(this.word, tempGrid, tempEdges)) {
      return undefined;
    }
    return { path: [...this.path], score: this.maxScore, fills: this.fills };
  }

  expand(): Iterable<Candidate<Placement>> {
    if (this.i === this.word.length) {
      // Terminal node with no valid resolution (ambiguous trace, or
      // fills === 0) — dead end.
      return [];
    }
    const children: Candidate<Placement>[] = [];
    for (const nb of shuffle(NEIGH[this.cell])) {
      if (this.path.includes(nb)) {
        continue;
      }
      const g = this.grid[nb];
      if (g !== null && g !== this.word[this.i]) {
        continue;
      }
      const ek = ekey(this.cell.toString(), nb.toString());
      const isNew = !this.edges.has(ek);
      let degAdj = this.degAdj;
      if (isNew) {
        const degCell = cellDegree(this.cell, this.edges) + degAdj[this.cell];
        const degNb = cellDegree(nb, this.edges) + degAdj[nb];
        if (
          degCell >= maxEdgesForCell(this.cell) ||
          degNb >= maxEdgesForCell(nb)
        ) {
          continue;
        }
        degAdj = degAdj
          .with(this.cell, degAdj[this.cell] + 1)
          .with(nb, degAdj[nb] + 1);
      }
      children.push(
        new PlacementCandidate(
          this.word,
          this.grid,
          this.edges,
          this.i + 1,
          nb,
          [...this.path, nb],
          this.fills + (g === null ? 1 : 0),
          this.newE + (isNew ? 1 : 0),
          this.reuse + (g === null ? 0 : 1) + (isNew ? 0 : 1),
          degAdj,
        ),
      );
    }
    return children;
  }
}

export function searchPlacement(
  word: string,
  grid: (string | null)[],
  edges: Set<string>,
): Placement[] {
  const zeroDegAdj = Array.from<number>({ length: 16 }).fill(0);
  const seeds: Candidate<Placement>[] = [];
  for (let s = 0; s < 16; s++) {
    const g = grid[s];
    if (g !== null && g !== word[0]) {
      continue;
    }
    seeds.push(
      new PlacementCandidate(
        word,
        grid,
        edges,
        1,
        s,
        [s],
        g === null ? 1 : 0,
        0,
        g === null ? 0 : 1,
        zeroDegAdj,
      ),
    );
  }
  const results: Placement[] = [];
  // maxExpansions counts expand() calls, not total node visits like the old
  // `nodes` counter, so this is an approximate carryover of the old budget
  // rather than an exact equivalent.
  for (const placement of bestFirst(seeds, { maxExpansions: 6000 })) {
    results.push(placement);
    if (results.length >= MAX_PLACEMENTS) {
      break;
    }
  }
  return results;
}
