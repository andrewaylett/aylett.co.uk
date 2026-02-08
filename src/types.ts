import { z } from 'zod';

export const ArticleSchema = z.object({
  title: z.string(),
  revision: z.string().optional(),
  revised: z.string(),
  author: z.string().optional(),
  expires: z.string().optional(),
  abstract: z.string().optional(),
  copyright: z.string().optional(),
  description: z.string(),
  lifecycle: z
    .enum(['draft', 'live', 'historical', 'obsolete'])
    .default('live'),
  tags: z.array(z.string()),
  tag: z.literal('article').default('article'),
});

export type Article = z.infer<typeof ArticleSchema>;

export const ThoughtSchema = z.object({
  title: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  tag: z.literal('thought').default('thought'),
});

export type Thought = z.infer<typeof ThoughtSchema>;

export const ContentSchema = z.discriminatedUnion('tag', [
  ArticleSchema,
  ThoughtSchema,
]);
export type Content = z.infer<typeof ContentSchema>;
