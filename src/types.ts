/**
 * Content schema definitions and runtime validation.
 *
 * Each content type (article, thought) has a JSON Schema constant that doubles
 * as a TypeScript type source via {@link TypeFrom}. The `tag` field
 * discriminates content types at runtime.
 */
import { type JSONSchema7 } from 'json-schema';
import { validate } from 'revalidator';

export interface TaggedSchema {
  tag: string;
}

export interface LifecycleSchema {
  properties: {
    lifecycle: {
      type: 'string';
      enum: string[];
      default: string;
    };
  };
}

/** JSON Schema for article frontmatter. Includes lifecycle states for content maturity. */
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
  tag: 'article',
} as const satisfies JSONSchema7 & LifecycleSchema & TaggedSchema;
export type ArticleSchema = typeof ArticleSchema;

/** JSON Schema for thought frontmatter. Simpler than articles — no lifecycle or revision tracking. */
export const ThoughtSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    date: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
  },
  tag: 'thought',
} as const satisfies JSONSchema7 & TaggedSchema;
export type ThoughtSchema = typeof ThoughtSchema;

/**
 * Recursively derives a TypeScript type from a JSON Schema constant.
 * Handles objects, strings (with enum narrowing), arrays, numbers, and the custom `tag` discriminator.
 */
export type TypeFrom<Schema> = Schema extends { tag: infer T }
  ? TypeFrom<Omit<Schema, 'tag'>> & { tag: T }
  : Schema extends {
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

/** Validates `parsed` against a JSON Schema and asserts its type, throwing on validation or tag mismatch. */
export function assertSchema<T extends JSONSchema7 & TaggedSchema>(
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
  if (parsed && typeof parsed === 'object' && 'tag' in parsed) {
    const tag = (parsed as { tag: string }).tag;
    if (tag !== schema.tag) {
      throw new Error(`Invalid tag: expected ${schema.tag}, got ${tag}`);
    }
  }
}
