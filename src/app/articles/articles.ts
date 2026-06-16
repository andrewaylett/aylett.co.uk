import 'server-only';

import { notFound } from 'next/navigation';

import { type Article, ArticleSchema } from '@/types';
import {
  type MDFile,
  type Markdown,
  traverse,
  buildMarkdown,
} from '@/remark/traverse';

export async function articleForId(id: string): Promise<Markdown<Article>> {
  'use cache';

  const articles = await allArticles();
  return buildMarkdown(
    articles.find((article) => article.id === id) ?? notFound(),
    ArticleSchema,
  );
}

export async function allArticles(): Promise<MDFile[]> {
  'use cache';

  return await traverse('articles');
}
