import { JSONSchema7 } from 'json-schema';

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
  properties: unknown;
}
  ? { [k in keyof Schema['properties']]: TypeFrom<Schema['properties'][k]> }
  : Schema extends { type: 'string' }
  ? string
  : Schema extends { type: 'array'; items: unknown }
  ? TypeFrom<Schema['items']>[]
  : Schema extends { type: 'number' }
  ? number
  : never;
