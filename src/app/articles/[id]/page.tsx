import React, { type ReactElement, type ReactNode, Suspense, use } from 'react';

import { type Metadata } from 'next';

import { gitHubUrl } from '../../../github';
import { PageStructure } from '../../../page-structure';
import {
  Description,
  Optional,
  TitleSeparator,
} from '../../../remark/components';
import { type Markdown } from '../../../remark/traverse';
import { type ArticleSchema, useExploded } from '../../../types';
import { allArticles, articleForId } from '../articles';

import 'server-only';

export const dynamicParams = false;
export const dynamic = 'error';

interface ArticleProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ArticleProps): Promise<Metadata> {
  const page = await articleForId(params);

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

export async function generateStaticParams() {
  const pages = await allArticles();
  return pages.map((page) => ({
    id: page.id,
  }));
}

function Revisions({
  expires,
  lifecycle,
  revised,
  revision,
  url,
}: {
  expires?: string;
  lifecycle?: string;
  revised: string;
  revision?: string;
  url: string;
}) {
  return (
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
          href={gitHubUrl(url)}
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
}

function Article({ params }: ArticleProps): ReactNode {
  const page = articleForId(params);
  const { metadata } = useExploded(page);
  const { author, copyright, lifecycle, revised, tags } = useExploded(metadata);
  return (
    <PageStructure<typeof page>
      lifecycle={lifecycle}
      schemaType="Article"
      resource={`/articles/${use(params).id}`}
      breadcrumbs={[{ href: '/articles', text: 'Articles' }]}
      header={
        <Suspense>
          <ArticleHeader id={use(params).id} page={page} />
        </Suspense>
      }
      author={author}
      copyright={copyright.then(
        (c) => c || revised.then((r) => r.split('/')[0]),
      )}
      keywords={tags}
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
  const { content } = useExploded(page);

  return <div property="articleBody">{use(content)}</div>;
}

function ArticleHeader({
  id,
  page,
}: {
  id: string;
  page: Promise<Markdown<ArticleSchema>>;
}) {
  const { metadata } = useExploded(page);

  return (
    <header>
      <h1 property="headline">{use(metadata).title}</h1>
      {use(metadata).abstract ? (
        <p property="alternativeHeadline">{use(metadata).abstract}</p>
      ) : (
        ''
      )}
      <div className="flex flex-row flex-wrap-reverse justify-between mt-[1ex] my-[0.5lh]">
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

export default Article;
