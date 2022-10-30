import * as React from 'react';

import Head from 'next/head';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GITHUB_URL } from '../../../github';
import Footer from '../../../footer';
import { allArticles } from '../../../ssr/articles';

import 'server-only';

const Optional = ({ children, text }: React.PropsWithChildren<{ text?: string }>) => (
  <>{text ? <span>{children}</span> : null}</>
);

const Revisions = ({
  expires,
  revised,
  revision,
  url,
}: {
  expires?: string;
  revised: string;
  revision?: string;
  url: string;
}) => (
  <>
    {revision || revised || expires ? (
      <div className="revisions">
        <Optional text={revision}>Version:&nbsp;{revision}</Optional>
        <Optional text={revised}>
          <a href={GITHUB_URL(url)}>Last Revised:&nbsp;{revised}</a>
        </Optional>
        <Optional text={expires}>Expires:&nbsp;{expires}</Optional>
      </div>
    ) : (
      ''
    )}
  </>
);

// noinspection JSUnusedGlobalSymbols
export default async function Article({ params }: { params: { id: string } }): Promise<React.ReactNode> {
  const pages = await allArticles();

  const page = pages.find((page) => page.id === params.id);

  if (!page) {
    notFound();
    throw new Error();
  }

  const { content, metadata } = page;

  return (
    <div className="mdx">
      <Head>
        <title>{metadata.title} - aylett.co.uk</title>
      </Head>
      <nav>
        <Link href="/">Home</Link> | <Link href="/articles">Articles</Link>
      </nav>
      <header>
        <h1>{metadata.title}</h1>
        {metadata.abstract ? metadata.abstract : ''}
        <div className="meta">
          {metadata.author ? <div className="author">Author: {metadata.author}</div> : ''}
          <Revisions url={`/articles/${params.id}`} {...metadata} />
        </div>
      </header>
      <main>{content}</main>
      <Footer author={metadata.author} copyright={metadata.copyright || metadata.revised.split('/')[0]} />
    </div>
  );
}
