import 'server-only';

import { cache } from 'react';

import { notFound } from 'next/navigation';

import { Markdown, type MDFile, traverse } from '@/remark/traverse';
import { type Article, ArticleSchema } from '@/types';

async function articleForIdFn(params: {
  id: string;
}): Promise<Markdown<Article>> {
  const articles = await allArticles();
  return new Markdown(
    articles.find((article) => article.id === params.id) ?? notFound(),
    ArticleSchema,
  );
}

export const articleForId = cache(articleForIdFn);

export const allArticles: () => Promise<MDFile[]> = cache(() =>
  traverse('articles/md'),
);
