import * as React from 'react';
import { ReactElement, Suspense, use, useMemo } from 'react';

import Link from 'next/link';

import { GITHUB_URL } from '../../../github';
import Footer from '../../footer';
import { allArticles, articleForId } from '../articles';
import { Description, Optional } from '../../../remark/components';

import type { Metadata } from 'next';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const config = {
  dynamicParams: false,
};

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
    <div className="revisions">
      <Optional text={revision}>Version:&nbsp;{revision}</Optional>
      <Optional text={revised}>
        <a href={GITHUB_URL(url)}>Last Revised:&nbsp;{revised}</a>
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
    <div className="mdx">
      <nav>
        <Link href="/">Home</Link> | <Link href="/articles">Articles</Link>
      </nav>
      <Suspense fallback="Loading">
        <ArticlePage id={params.id} />
      </Suspense>
    </div>
  );
}

function ArticlePage({ id }: { id: string }): ReactElement {
  const page = useMemo(() => articleForId(id), [id]);
  const { content, metadata } = use(page);

  return (
    <>
      <Suspense>
        <header>
          <h1>{use(metadata).title}</h1>
          {use(metadata).abstract ? use(metadata).abstract : ''}
          <div className="meta">
            {use(metadata).author && (
              <div className="author">Author: {use(metadata).author}</div>
            )}
            <Revisions url={`/articles/${id}`} {...use(metadata)} />
            <Description metadata={metadata} />
          </div>
        </header>
      </Suspense>
      <Suspense>
        <main id={id}>{use(content)}</main>
        <Footer
          author={use(metadata).author}
          copyright={
            use(metadata).copyright || use(metadata).revised.split('/')[0]
          }
        />
      </Suspense>
    </>
  );
}
