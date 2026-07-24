import { describe, expect, it, jest } from '@jest/globals';

import {
  bestFirst,
  type Candidate,
} from '@/client/puzzles/friends/gen/best-first';

/** A resolved result carrying its own score so tests can check ordering. */
interface Item {
  name: string;
  score: number;
}

function leaf(name: string, score: number): Candidate<Item> {
  return {
    maxScore: score,
    resolution: () => ({ name, score }),
    expand: () => {
      throw new Error(`expand() called on resolved candidate ${name}`);
    },
  };
}

/** A partial candidate with an explicit expand implementation. */
function partial(
  maxScore: number,
  expand: (targetScore: number) => Candidate<Item>[],
): Candidate<Item> {
  return {
    maxScore,
    // eslint-disable-next-line unicorn/no-useless-undefined -- the Candidate contract needs an explicit `Item | undefined`, which an empty body cannot satisfy
    resolution: () => undefined,
    expand,
  };
}

/** A partial candidate whose children are produced on demand. */
function node(
  maxScore: number,
  children: () => Candidate<Item>[],
): Candidate<Item> {
  return partial(maxScore, children);
}

function drain(generator: Generator<Item>): Item[] {
  return [...generator];
}

function names(items: Item[]): string[] {
  return items.map((item) => item.name);
}

describe('bestFirst', () => {
  it('yields nothing for empty seeds', () => {
    expect(drain(bestFirst<Item>([]))).toHaveLength(0);
  });

  it('yields a single resolved seed', () => {
    expect(names(drain(bestFirst([leaf('a', 5)])))).toEqual(['a']);
  });

  it('yields resolved seeds in descending score order', () => {
    const results = drain(
      bestFirst([leaf('low', 1), leaf('high', 9), leaf('mid', 5)]),
    );
    expect(names(results)).toEqual(['high', 'mid', 'low']);
  });

  it('breaks score ties by insertion order', () => {
    const results = drain(
      bestFirst([leaf('first', 5), leaf('second', 5), leaf('third', 5)]),
    );
    expect(names(results)).toEqual(['first', 'second', 'third']);
  });

  it('expands partials and interleaves their resolutions globally by score', () => {
    // The partial's bound (100) beats the resolved leaf (60), so it must be
    // expanded before 'outside' can safely be yielded; its actual best is
    // only 40, so 'outside' still comes out first.
    const partial = node(100, () => [leaf('inner-a', 40), leaf('inner-b', 20)]);
    const results = drain(bestFirst([leaf('outside', 60), partial]));
    expect(names(results)).toEqual(['outside', 'inner-a', 'inner-b']);
  });

  it('handles multi-level trees, yielding all leaves in score order', () => {
    const tree = node(100, () => [
      node(90, () => [leaf('a', 85), leaf('b', 15)]),
      node(50, () => [node(45, () => [leaf('c', 45)]), leaf('d', 30)]),
      leaf('e', 70),
    ]);
    expect(names(drain(bestFirst([tree])))).toEqual(['a', 'e', 'c', 'd', 'b']);
  });

  it('skips dead ends (partials that expand to nothing)', () => {
    const deadEnd = node(100, () => []);
    const results = drain(bestFirst([deadEnd, leaf('survivor', 10)]));
    expect(names(results)).toEqual(['survivor']);
  });

  it('does no work until the generator is first pulled', () => {
    const expand = jest.fn(() => [leaf('child', 10)]);
    const generator = bestFirst([partial(50, expand)]);
    expect(expand).not.toHaveBeenCalled();
    generator.next();
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('never expands a partial that cannot beat the requested results', () => {
    // With bound 40, this partial can never beat the 60-point leaf, so
    // pulling one result must not touch it.
    const expand = jest.fn(() => [leaf('unreachable', 40)]);
    const generator = bestFirst([leaf('best', 60), partial(40, expand)]);
    expect(generator.next().value?.name).toBe('best');
    expect(expand).not.toHaveBeenCalled();
  });

  it('supports pulling arbitrarily many results, not a fixed top-K', () => {
    const seeds = Array.from({ length: 20 }, (_, i) =>
      node(100 - i, () => [leaf(`leaf-${i}`, 100 - i)]),
    );
    const results = drain(bestFirst(seeds));
    expect(results).toHaveLength(20);
    const scores = results.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  describe('targetScore', () => {
    it('passes the best queued bound as the expansion target', () => {
      const seen: number[] = [];
      const watcher = partial(100, (target) => {
        seen.push(target);
        return [];
      });
      drain(bestFirst([watcher, leaf('rival', 70)]));
      expect(seen).toEqual([70]);
    });

    it('passes -Infinity when nothing else is queued', () => {
      const seen: number[] = [];
      const watcher = partial(100, (target) => {
        seen.push(target);
        return [];
      });
      drain(bestFirst([watcher]));
      expect(seen).toEqual([Number.NEGATIVE_INFINITY]);
    });

    it('accepts internally-descended expansions (deep frontier, not direct children)', () => {
      // A candidate exploiting targetScore returns grandchildren directly.
      // The engine must order them correctly regardless of tree depth.
      const descending = node(100, () => [
        leaf('deep-best', 95),
        node(60, () => [leaf('deep-rest', 55)]),
      ]);
      const results = drain(bestFirst([descending, leaf('rival', 70)]));
      expect(names(results)).toEqual(['deep-best', 'rival', 'deep-rest']);
    });
  });

  describe('contract enforcement', () => {
    it('rejects NaN maxScore on a seed', () => {
      expect(() => drain(bestFirst([leaf('bad', Number.NaN)]))).toThrow(
        TypeError,
      );
    });

    it('rejects NaN maxScore on a child', () => {
      const parent = node(10, () => [leaf('bad', Number.NaN)]);
      expect(() => drain(bestFirst([parent]))).toThrow(TypeError);
    });

    it('rejects a child whose bound exceeds its parent (inadmissible bound)', () => {
      const parent = node(10, () => [leaf('cheat', 11)]);
      expect(() => drain(bestFirst([parent]))).toThrow(RangeError);
    });

    it('accepts a child whose bound equals its parent', () => {
      const parent = node(10, () => [leaf('exact', 10)]);
      expect(names(drain(bestFirst([parent])))).toEqual(['exact']);
    });
  });

  describe('maxExpansions budget', () => {
    it('stops expanding once spent but still drains discovered resolutions in order', () => {
      // Budget of one: the root expands, revealing a leaf and a partial.
      // The partial (bound 90) pops first but is dropped; the leaf still
      // comes out.
      const starved = jest.fn(() => [leaf('never', 90)]);
      const root = node(100, () => [partial(90, starved), leaf('found', 10)]);
      const results = drain(bestFirst([root], { maxExpansions: 1 }));
      expect(names(results)).toEqual(['found']);
      expect(starved).not.toHaveBeenCalled();
    });

    it('yields nothing from partial seeds with a budget of zero', () => {
      const root = node(100, () => [leaf('unreached', 10)]);
      expect(drain(bestFirst([root], { maxExpansions: 0 }))).toHaveLength(0);
    });

    it('still yields resolved seeds with a budget of zero', () => {
      const results = drain(
        bestFirst([leaf('a', 5), node(100, () => [])], { maxExpansions: 0 }),
      );
      expect(names(results)).toEqual(['a']);
    });
  });

  it('reads maxScore once, at queue insertion', () => {
    // Seeds are queued on the first pull; mutating maxScore after that must
    // not affect ordering. The mutable candidate was queued at 80 and stays
    // there even though it claims 10 by the time it pops.
    const mutable = {
      maxScore: 80,
      resolution: (): Item | undefined => ({ name: 'mutable', score: 80 }),
      expand: (): Candidate<Item>[] => [],
    };
    const generator = bestFirst([leaf('best', 100), mutable, leaf('mid', 50)]);
    expect(generator.next().value?.name).toBe('best');
    mutable.maxScore = 10;
    expect(names([...generator])).toEqual(['mutable', 'mid']);
  });

  describe('randomised trees match brute-force enumeration', () => {
    /** Deterministic LCG so failures are reproducible. */
    function makeRandom(seed: number): () => number {
      let state = seed >>> 0;
      return () => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        return state / 2 ** 32;
      };
    }

    interface TreeNode {
      bound: number;
      leafScore?: number;
      children: TreeNode[];
    }

    function buildTree(
      random: () => number,
      bound: number,
      depth: number,
      root = false,
    ): TreeNode {
      // The root always branches (with at least two children) so every
      // generated tree exercises real ordering, not a single leaf.
      if (!root && (depth === 0 || random() < 0.3)) {
        // Resolved leaves score exactly their bound, per the contract.
        return { bound, leafScore: bound, children: [] };
      }
      const width = (root ? 2 : 1) + Math.floor(random() * 3);
      const children = Array.from({ length: width }, () =>
        buildTree(
          random,
          Math.floor(bound * (0.5 + random() * 0.5)),
          depth - 1,
        ),
      );
      return { bound, children };
    }

    function collectLeafScores(tree: TreeNode): number[] {
      if (tree.leafScore !== undefined) {
        return [tree.leafScore];
      }
      return tree.children.flatMap((child) => collectLeafScores(child));
    }

    /** Naive candidate: ignores targetScore, returns direct children. */
    function naive(tree: TreeNode): Candidate<Item> {
      if (tree.leafScore !== undefined) {
        return leaf(`leaf@${tree.leafScore}`, tree.leafScore);
      }
      return node(tree.bound, () => tree.children.map((child) => naive(child)));
    }

    /**
     * Descending candidate: honours targetScore by inlining any child
     * subtree whose bound stays at or above the target, returning a deeper
     * frontier — the optimisation real domains are expected to use.
     */
    function descending(tree: TreeNode): Candidate<Item> {
      if (tree.leafScore !== undefined) {
        return leaf(`leaf@${tree.leafScore}`, tree.leafScore);
      }
      const frontier = (
        subtree: TreeNode,
        target: number,
      ): Candidate<Item>[] =>
        subtree.leafScore === undefined && subtree.bound >= target
          ? subtree.children.flatMap((child) => frontier(child, target))
          : [descending(subtree)];
      return partial(tree.bound, (target) =>
        tree.children.flatMap((child) => frontier(child, target)),
      );
    }

    it.each([1, 2, 3, 4, 5])(
      'seed %i: both naive and descending traversals yield every leaf in sorted order',
      (seed) => {
        const random = makeRandom(seed * 999_331);
        const tree = buildTree(random, 1000, 6, true);
        const expected = collectLeafScores(tree).sort((a, b) => b - a);
        expect(expected.length).toBeGreaterThan(1);

        const naiveScores = drain(bestFirst([naive(tree)])).map(
          (item) => item.score,
        );
        const descendingScores = drain(bestFirst([descending(tree)])).map(
          (item) => item.score,
        );

        expect(naiveScores).toEqual(expected);
        expect(descendingScores).toEqual(expected);
      },
    );
  });
});
