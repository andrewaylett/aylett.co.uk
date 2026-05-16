import { z, type ZodDiscriminatedUnion, type ZodObject } from 'zod';

const ArticleSchemaShape: {
  title: z.ZodString;
  revision: z.ZodOptional<z.ZodString>;
  revised: z.ZodString;
  author: z.ZodOptional<z.ZodString>;
  expires: z.ZodOptional<z.ZodString>;
  abstract: z.ZodOptional<z.ZodString>;
  copyright: z.ZodOptional<z.ZodString>;
  description: z.ZodString;
  lifecycle: z.ZodDefault<
    z.ZodEnum<{
      draft: 'draft';
      live: 'live';
      historical: 'historical';
      obsolete: 'obsolete';
    }>
  >;
  tags: z.ZodArray<z.ZodString>;
  tag: z.ZodDefault<z.ZodLiteral<'article'>>;
} = {
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
};
export const ArticleSchema: ZodObject<typeof ArticleSchemaShape> =
  z.object(ArticleSchemaShape);

export type Article = z.infer<typeof ArticleSchema>;

const ThoughtSchemaShape: {
  readonly title: z.ZodString;
  readonly date: z.ZodString;
  readonly tags: z.ZodArray<z.ZodString>;
  readonly description: z.ZodString;
  readonly tag: z.ZodDefault<z.ZodLiteral<'thought'>>;
} = {
  title: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  tag: z.literal('thought').default('thought'),
} as const;
export const ThoughtSchema: ZodObject<typeof ThoughtSchemaShape> =
  z.object(ThoughtSchemaShape);

export type Thought = z.infer<typeof ThoughtSchema>;

export const ContentSchema: ZodDiscriminatedUnion<
  [typeof ArticleSchema, typeof ThoughtSchema]
> = z.discriminatedUnion('tag', [ArticleSchema, ThoughtSchema]);
export type Content = z.infer<typeof ContentSchema>;

export type Identified<T> = T & { id: string };
