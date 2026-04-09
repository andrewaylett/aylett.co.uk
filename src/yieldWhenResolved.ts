export class VisiblePromise<T> implements Promise<T>, PromiseLike<T> {
  readonly #promise: Promise<T>;
  #resolved = false;
  readonly [Symbol.toStringTag] = 'VisiblePromise';

  get resolved(): boolean {
    return this.#resolved;
  }

  #resolve(): void {
    this.#resolved = true;
  }

  // eslint-disable-next-line unicorn/no-thenable
  readonly then: (typeof Promise<T>)['prototype']['then'];
  readonly catch: (typeof Promise<T>)['prototype']['catch'];
  readonly finally: (typeof Promise<T>)['prototype']['finally'];

  constructor(promise: PromiseLike<T>) {
    this.#promise = Promise.resolve(promise);
    // Resolve on then, not finally, because Promise.any() will reject
    // if every promise passed in has rejected
    void this.#promise.then(this.#resolve.bind(this));

    // eslint-disable-next-line unicorn/no-thenable
    this.then = this.#promise.then.bind(this.#promise);
    this.catch = this.#promise.catch.bind(this.#promise);
    this.finally = this.#promise.finally.bind(this.#promise);
  }

  static wrap<T>(orig: PromiseLike<T>): VisiblePromise<T> {
    return orig instanceof VisiblePromise
      ? (orig as VisiblePromise<T>)
      : new VisiblePromise<T>(orig);
  }
}

interface Accum<T> {
  next: undefined | VisiblePromise<T>;
  rest: VisiblePromise<T>[];
}

export async function nextResolved<T>(
  input: VisiblePromise<T>[],
): Promise<[T, VisiblePromise<T>[]]> {
  return nextResolvedImpl(input, false);
}

async function nextResolvedImpl<T>(
  input: VisiblePromise<T>[],
  recursing: boolean,
): Promise<[T, VisiblePromise<T>[]]> {
  // Safety check
  if (input.length === 0) {
    // Match the behaviour of Promise.any()
    throw new AggregateError([], 'No promises were passed in');
  }

  // eslint-disable-next-line unicorn/no-array-reduce
  const { next, rest } = input.reduce(
    ({ next, rest }: Accum<T>, el): Accum<T> => {
      if (next) {
        return { next, rest: [...rest, el] };
      }

      if (el.resolved) {
        return { next: el, rest };
      }

      return { next: undefined, rest: [...rest, el] };
    },
    { next: undefined, rest: [] },
  );

  if (next) {
    return [await next, rest];
  }

  // Safety check
  if (recursing) {
    throw new Error('Failed to find a resolved promise after Promise.any()');
  }

  // Will reject iff all of `rest` are rejected
  await Promise.any(rest);

  // Recursion: at least one of `rest` has now resolved, so we will exit early
  return nextResolvedImpl<T>(rest, true);
}

export async function* yieldWhenResolved<T>(
  input: PromiseLike<T>[],
): AsyncGenerator<T, void, unknown> {
  let next: T;
  let rest: VisiblePromise<T>[] = input.map((p) => VisiblePromise.wrap(p));
  while (rest.length > 0) {
    [next, rest] = await nextResolved(rest);
    yield next;
  }
}
