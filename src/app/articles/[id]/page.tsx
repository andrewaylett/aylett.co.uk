import * as React from 'react';
import type { ReactElement } from 'react';
import { Suspense, use, useMemo } from 'react';

import { GITHUB_URL } from '../../../github';
import { allArticles, articleForId } from '../articles';
import {
  Description,
  Optional,
  TitleSeparator,
} from '../../../remark/components';
import { PageStructure } from '../../../page-structure';

import type { Markdown } from '../../../remark/traverse';
import type { ArticleSchema } from '../../../types';
import type { FooterProps } from '../../footer';
import type { Metadata } from 'next';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const dynamicParams = false;
// noinspection JSUnusedGlobalSymbols
export const dynamic = 'error';

// noinspection JSUnusedGlobalSymbols
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const page = await articleForId(params.id);

  const metadata = await page.metadata;

  const robots =
    metadata.lifecycle === 'draft'
      ? {
          index: false,
        }
      : {};

  return {
    title: metadata.title,
    authors: [{ name: metadata.author }],
    description: metadata.description,
    keywords: metadata.tags,
    openGraph: {
      type: 'article',
      authors: [metadata.author],
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

// noinspection JSUnusedGlobalSymbols
export async function generateStaticParams() {
  const pages = await allArticles();
  return pages.map((page) => ({
    id: page.id,
  }));
}

const Revisions: React.FC<{
  expires?: string;
  lifecycle?: string;
  revised: string;
  revision?: string;
  url: string;
}> = ({ expires, lifecycle, revised, revision, url }) => (
  <div className="flex flex-row flex-wrap gap-x-[1ch]">
    <Optional text={revision}>
      Version:&nbsp;<span property="version">{revision}</span>
    </Optional>
    <span>Status: {lifecycle ?? 'active'}</span>
    <Optional text={revised}>
      <a
        className="text-inherit underline"
        property="subjectOf"
        typeof="SoftwareSourceCode"
        href={GITHUB_URL(url)}
      >
        Last Revised
      </a>
      :&nbsp;<span property="dateModified">{revised}</span>
    </Optional>
    <Optional text={expires}>
      Expires:&nbsp;<span property="expires">{expires}</span>
    </Optional>
  </div>
);

// noinspection JSUnusedGlobalSymbols
export default function article({
  params,
}: {
  params: { id: string };
}): React.ReactNode {
  const page = useMemo(() => articleForId(params.id), [params.id]);
  const lifecycle = useMemo(
    () => () => use(use(page).metadata).lifecycle,
    [page],
  );
  return (
    <PageStructure<typeof page>
      lifecycle={lifecycle}
      schemaType="Article"
      resource={`/articles/${params.id}`}
      breadcrumbs={[{ href: '/articles', text: 'Articles' }]}
      header={
        <Suspense>
          <ArticleHeader id={params.id} page={page} />
        </Suspense>
      }
      footer={{
        func: (page): FooterProps => {
          const metadata = use(use(page).metadata);
          return {
            author: metadata.author,
            copyright: metadata.copyright,
            keywords: metadata.tags,
          };
        },
        input: page,
      }}
    >
      <ArticlePage page={page} />
    </PageStructure>
  );
}

function ArticlePage({
  page,
}: {
  page: Promise<Markdown<ArticleSchema>>;
}): ReactElement {
  const { content } = use(page);

  return <div property="articleBody">{use(content)}</div>;
}

function ArticleHeader({
  id,
  page,
}: {
  id: string;
  page: Promise<Markdown<ArticleSchema>>;
}) {
  const { metadata } = use(page);

  return (
    <header>
      <h1 property="headline">{use(metadata).title}</h1>
      {use(metadata).abstract ? (
        <span property="alternativeHeadline">{use(metadata).abstract}</span>
      ) : (
        ''
      )}
      <div className="flex flex-row flex-wrap-reverse justify-between mt-[1ex]">
        {use(metadata).author && (
          <div className="author" property="author" typeof="Person">
            Author: <span property="name">{use(metadata).author}</span>
          </div>
        )}
        <Revisions url={`/articles/${id}`} {...use(metadata)} />
        <Description metadata={metadata} />
      </div>
      <TitleSeparator />
    </header>
  );
}
