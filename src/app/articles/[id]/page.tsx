import * as React from 'react';
import { ReactElement, Suspense, use, useMemo } from 'react';

import { GITHUB_URL } from '../../../github';
import { allArticles, articleForId } from '../articles';
import { Description, Optional } from '../../../remark/components';
import { PageStructure } from '../../../page-structure';

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

  return {
    title: metadata.title,
    authors: [{ name: metadata.author }],
    description: metadata.description,
    keywords: metadata.tags,
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
  revised: string;
  revision?: string;
  url: string;
}> = ({ expires, revised, revision, url }) =>
  revision || revised || expires ? (
    <div className="flex flex-row flex-wrap gap-x-[1ch]">
      <Optional text={revision}>Version:&nbsp;{revision}</Optional>
      <Optional text={revised}>
        <a className="text-inherit underline" href={GITHUB_URL(url)}>
          Last Revised:&nbsp;{revised}
        </a>
      </Optional>
      <Optional text={expires}>Expires:&nbsp;{expires}</Optional>
    </div>
  ) : null;

// noinspection JSUnusedGlobalSymbols
export default function article({
  params,
}: {
  params: { id: string };
}): React.ReactNode {
  return (
    <PageStructure
      breadcrumbs={[{ href: '/articles', text: 'Articles' }]}
      header={
        <Suspense>
          <ArticleHeader id={params.id} />
        </Suspense>
      }
    >
      <ArticlePage id={params.id} />
    </PageStructure>
  );
}

function ArticlePage({ id }: { id: string }): ReactElement {
  const page = useMemo(() => articleForId(id), [id]);
  const { content } = use(page);

  return <main id={id}>{use(content)}</main>;
}

function ArticleHeader({ id }: { id: string }) {
  const page = useMemo(() => articleForId(id), [id]);
  const { metadata } = use(page);

  return (
    <header>
      <h1 className="main-title">{use(metadata).title}</h1>
      {use(metadata).abstract ? use(metadata).abstract : ''}
      <div className="flex flex-row flex-wrap-reverse justify-between mt-[1ex]">
        {use(metadata).author && (
          <div className="author">Author: {use(metadata).author}</div>
        )}
        <Revisions url={`/articles/${id}`} {...use(metadata)} />
        <Description metadata={metadata} />
      </div>
    </header>
  );
}
