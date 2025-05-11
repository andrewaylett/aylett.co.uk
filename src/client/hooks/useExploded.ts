import { useMemo } from 'react';

export type Exploded<U> = {
  [k in keyof U]: U[k] extends Promise<infer V> ? Promise<V> : Promise<U[k]>;
};

/**
 * Takes a promise of object (with keys) and returns an object with promises for each key.
 *
 * This means we can delay calling `use()` until we need the values, even if we need to destructure earlier.
 */
export function useExploded<V extends object>(input: Promise<V>): Exploded<V> {
  return useMemo(() => {
    return new Proxy(input, {
      get: (target, prop: string): Promise<V[keyof V]> =>
        target.then((t) => Reflect.get(t, prop)),
    }) as Exploded<V>;
  }, [input]);
}
