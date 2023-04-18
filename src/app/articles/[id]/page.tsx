import * as React from 'react';
import { ReactElement, Suspense, use, useMemo } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GITHUB_URL } from '../../../github';
import Footer from '../../footer';
import { allArticles, aritcleForId } from '../articles';
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
  const page = await aritcleForId(params.id ?? notFound());

  const { metadata } = page;

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
  const page = useMemo(() => aritcleForId(id), [id]);
  const { content, metadata } = use(page);

  return (
    <>
      <header>
        <h1>{metadata.title}</h1>
        {metadata.abstract ? metadata.abstract : ''}
        <div className="meta">
          {metadata.author && (
            <div className="author">Author: {metadata.author}</div>
          )}
          <Revisions url={`/articles/${id}`} {...metadata} />
          <Description metadata={metadata} />
        </div>
      </header>
      <main id={id}>{content}</main>
      <Footer
        author={metadata.author}
        copyright={metadata.copyright || metadata.revised.split('/')[0]}
      />
    </>
  );
}
