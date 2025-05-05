import { useMemo } from 'react';

import { type JSONSchema7 } from 'json-schema';
import { validate } from 'revalidator';

export interface LifecycleSchema {
  properties: {
    lifecycle: {
      type: 'string';
      enum: string[];
      default: string;
    };
  };
}

export const ArticleSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    revision: { type: 'string' },
    revised: { type: 'string' },
    author: { type: 'string' },
    expires: { type: 'string' },
    abstract: { type: 'string' },
    copyright: { type: 'string' },
    description: { type: 'string' },
    lifecycle: {
      type: 'string',
      enum: ['draft', 'live', 'historical', 'obsolete'],
      default: 'live',
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
} as const satisfies JSONSchema7 & LifecycleSchema;
export type ArticleSchema = typeof ArticleSchema;

export const ThoughtSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    date: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
  },
} as const satisfies JSONSchema7;
export type ThoughtSchema = typeof ThoughtSchema;

export type TypeFrom<Schema> = Schema extends {
  type: 'object';
  properties: infer Properties;
}
  ? { [k in keyof Properties]: TypeFrom<Properties[k]> }
  : Schema extends { type: 'string' }
    ? Schema extends { type: 'string'; enum: infer T extends string[] }
      ? T[number]
      : string
    : Schema extends { type: 'array'; items: infer Items }
      ? TypeFrom<Items>[]
      : Schema extends { type: 'number' }
        ? number
        : never;

export function assertSchema<T extends JSONSchema7>(
  parsed: unknown,
  schema: T,
): asserts parsed is TypeFrom<T> {
  const { errors, valid } = validate(
    parsed,
    schema as Revalidator.JSONSchema<unknown>,
  );
  if (!valid) {
    throw new Error(`Invalid YAML: ${errors.map((e) => e.message).join(', ')}`);
  }
}

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
