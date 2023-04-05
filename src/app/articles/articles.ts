import { notFound } from 'next/navigation';

import sortBy from '../../sort_by';
import { findMarkdown } from '../../remark/traverse';
import { ArticleSchema } from '../../types';

import type { Article } from '../../types';

import 'server-only';

let articles: undefined | Promise<Article[]>;

export async function aritcleForId(id: string): Promise<Article> {
  const articles = await allArticles();
  return articles.find((article) => article.id === id) ?? notFound();
}

export const allArticles = () => {
  if (!articles) {
    articles = findArticles();
  }
  return articles;
};

const findArticles = async () => {
  const entries = await findMarkdown('articles', ArticleSchema);

  return sortBy(entries, (entry) => entry.metadata.title);
};
