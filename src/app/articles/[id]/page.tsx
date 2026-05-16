import type { JSX } from 'react';

import { allArticles, articleForId } from '../articles';

import { ArticlePage } from './ArticlePage';

import type { Metadata } from 'next';

export const dynamicParams = false;
export const dynamic = 'error';

interface ArticleProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ArticleProps): Promise<Metadata> {
  const page = await articleForId(await params);

  const metadata = await page.metadata;

  const robots =
    metadata.lifecycle === 'draft'
      ? {
          index: false,
        }
      : {};

  return {
    title: metadata.title,
    authors: metadata.author ? [{ name: metadata.author }] : undefined,
    description: metadata.description,
    keywords: metadata.tags,
    openGraph: {
      type: 'article',
      authors: metadata.author ? [metadata.author] : undefined,
      description: metadata.description,
      expirationTime: metadata.expires,
      locale: 'en_GB',
      publishedTime: metadata.revised,
      tags: metadata.tags,
      title: metadata.title,
    },
    robots,
  };
}

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const pages = await allArticles();
  return pages.map((page) => ({
    id: page.id,
  }));
}

export default async function Page({
  params,
}: ArticleProps): Promise<JSX.Element> {
  const { id } = await params;
  const page = await articleForId({ id });
  return <ArticlePage page={page} id={id} />;
}
