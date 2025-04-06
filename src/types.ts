import { validate } from 'revalidator';

import type { JSONSchema7 } from 'json-schema';

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
} as const satisfies JSONSchema7;
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
  [k in keyof U]: U[k] extends PromiseLike<unknown> ? U[k] : Promise<U[k]>;
};

type ExplodedProxy<V> =
  | Partial<Exploded<V>>
  | {
      input: Promise<V>;
    };

/**
 * Takes a promise of object (with keys) and returns an object with promises for each key.
 *
 * This means we can delay calling `use()` until we need the values, even if we need to destructure earlier.
 */
export function explode<V extends object>(input: PromiseLike<V>): Exploded<V> {
  const proxy: ExplodedProxy<V> = { input: Promise.resolve(input) };
  return new Proxy(proxy, {
    get: (target, prop: string): Promise<V[keyof V]> =>
      target.input.then((t) => Reflect.get(t, prop)),
  }) as Partial<Exploded<V>> as Exploded<V>;
}
