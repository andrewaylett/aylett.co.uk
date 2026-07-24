/**
 * Best-first branch-and-bound search over a space of scored candidates.
 *
 * A {@link Candidate} is a node in a search tree: either fully resolved
 * (carrying a finished result) or partial (able to expand into candidates
 * that collectively cover its subtree). Every candidate advertises an
 * admissible upper bound — `maxScore` — on anything reachable beneath it.
 *
 * {@link bestFirst} drives the search lazily from a max-heap keyed on that
 * bound: pop the highest bound; if it is resolved, yield it (nothing still
 * queued can beat it, because every bound is admissible); otherwise expand
 * it and push the results. Pulling one value from the generator does only
 * the work needed to prove that value is the best remaining, so the same
 * search serves "give me the single best placement" and "keep going, I want
 * ten" without a tuning constant like the old top-K results array.
 *
 * Correctness depends entirely on two properties the engine cannot infer,
 * so it asserts them where it can:
 *
 * - **Admissibility**: no resolution under a candidate scores more than the
 *   candidate's `maxScore`, and a resolved candidate's `maxScore` is its
 *   actual score. Violations silently break the emission order, so the
 *   engine at least rejects children whose bound exceeds their parent's.
 * - **Progress**: expansion must strictly shrink the remaining space (e.g.
 *   each child covers a longer prefix), or the loop never terminates. This
 *   is unverifiable from outside; `maxExpansions` is the safety net.
 *
 * The trade-off against plain DFS is memory: the whole frontier lives in
 * the heap, where DFS kept only the current path. The `targetScore` hook on
 * {@link Candidate.expand} exists to claw that back — see its docs.
 */

export interface Candidate<R> {
  /**
   * Admissible upper bound: no resolution reachable from this candidate
   * scores higher than this, and for a resolved candidate it equals the
   * actual score. Read once, when the candidate enters the queue — later
   * mutation has no effect on ordering.
   */
  readonly maxScore: number;

  /** The finished result, or undefined while this candidate is partial. */
  resolution(): R | undefined;

  /**
   * Produce candidates that collectively cover this candidate's search
   * space. Only ever called on partial candidates, at most once each.
   *
   * `targetScore` is the highest bound still waiting in the queue
   * (`-Infinity` when nothing is): until this candidate's best line drops
   * below that, no queued rival can win, so implementations MAY descend
   * depth-first internally while a branch's bound stays >= `targetScore`
   * and return the deeper frontier instead of immediate children. That
   * keeps the hot path out of the heap (bounding frontier memory and heap
   * churn) but is purely an optimisation — returning direct children and
   * ignoring `targetScore` is always correct.
   *
   * Two hard rules regardless: branches below `targetScore` must still be
   * returned (unexpanded), never discarded — a later pull may need them —
   * and every returned candidate's `maxScore` must be <= this one's.
   */
  expand(targetScore: number): Iterable<Candidate<R>>;
}

export interface BestFirstOptions {
  /**
   * Hard cap on the number of `expand()` calls, defaulting to unlimited.
   * Once spent, remaining partials are dropped instead of expanded; already
   * discovered resolutions still drain out in score order, matching the
   * best-effort behaviour of the node budget in the old DFS. Results
   * yielded after the budget runs out are no longer guaranteed optimal.
   */
  maxExpansions?: number;
}

interface Entry<R> {
  candidate: Candidate<R>;
  score: number;
  seq: number;
}

/** `a` pops before `b`: higher score first, insertion order on ties. */
function precedes<R>(a: Entry<R>, b: Entry<R>): boolean {
  return a.score === b.score ? a.seq < b.seq : a.score > b.score;
}

class MaxHeap<R> {
  private readonly entries: Entry<R>[] = [];

  get size(): number {
    return this.entries.length;
  }

  peekScore(): number {
    return this.entries.length > 0
      ? this.entries[0].score
      : Number.NEGATIVE_INFINITY;
  }

  push(entry: Entry<R>): void {
    const heap = this.entries;
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!precedes(heap[i], heap[parent])) {
        break;
      }
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  }

  pop(): Entry<R> {
    const heap = this.entries;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last !== undefined) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let best = i;
        if (left < heap.length && precedes(heap[left], heap[best])) {
          best = left;
        }
        if (right < heap.length && precedes(heap[right], heap[best])) {
          best = right;
        }
        if (best === i) {
          break;
        }
        [heap[i], heap[best]] = [heap[best], heap[i]];
        i = best;
      }
    }
    return top;
  }
}

/**
 * Lazily yield resolved results in non-increasing `maxScore` order.
 *
 * Nothing runs until the first pull, and each pull does only the expansion
 * needed to surface the next-best resolution. Duplicate coverage is the
 * domain's problem: if two expansions can reach the same resolution, it
 * will be yielded twice.
 */
export function* bestFirst<R>(
  seeds: Iterable<Candidate<R>>,
  options: BestFirstOptions = {},
): Generator<R, void, undefined> {
  const { maxExpansions = Number.POSITIVE_INFINITY } = options;
  const heap = new MaxHeap<R>();
  let seq = 0;
  const push = (candidate: Candidate<R>, parentBound: number): void => {
    const score = candidate.maxScore;
    if (Number.isNaN(score)) {
      throw new TypeError('candidate maxScore must not be NaN');
    }
    if (score > parentBound) {
      throw new RangeError(
        `child maxScore ${score} exceeds parent bound ${parentBound}; ` +
          'the bound is not admissible and emission order would be wrong',
      );
    }
    heap.push({ candidate, score, seq: seq++ });
  };
  for (const seed of seeds) {
    push(seed, Number.POSITIVE_INFINITY);
  }
  let expansions = 0;
  while (heap.size > 0) {
    const top = heap.pop();
    const resolved = top.candidate.resolution();
    if (resolved !== undefined) {
      yield resolved;
      continue;
    }
    if (expansions >= maxExpansions) {
      continue;
    }
    expansions++;
    const target = heap.peekScore();
    for (const child of top.candidate.expand(target)) {
      push(child, top.score);
    }
  }
}
