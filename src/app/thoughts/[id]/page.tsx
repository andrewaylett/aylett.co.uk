import * as React from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GITHUB_URL } from '../../../github';
import Footer from '../../footer';
import { allThoughts, thoughtForId } from '../thoughts';
import { Description } from '../../../remark/components';

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
  const page = await thoughtForId(params.id ?? notFound());

  if (!page) {
    notFound();
  }

  const { metadata } = page;

  return {
    title: metadata.title,
    authors: { name: 'Andrew Aylett', url: 'https://www.aylett.co.uk' },
    description: metadata.description,
  };
}

// noinspection JSUnusedGlobalSymbols
export async function generateStaticParams() {
  const thoughts = await allThoughts();
  return thoughts.map((thought) => ({
    id: thought.id,
  }));
}

const Optional = ({
  children,
  text,
}: React.PropsWithChildren<{ text?: string }>) => (
  <>{text ? <span>{children}</span> : null}</>
);

const Revisions = ({ date, url }: { date: string; url: string }) => (
  <div className="revisions">
    <Optional text={date}>
      <a href={GITHUB_URL(url)}>Date:&nbsp;{date}</a>
    </Optional>
  </div>
);

// noinspection JSUnusedGlobalSymbols
export default async function Article({
  params,
}: {
  params: { id: string };
}): Promise<React.ReactNode> {
  const page = await thoughtForId(params.id);

  const { content, id, metadata } = page;

  return (
    <div className="mdx">
      <nav>
        <Link href="/">Home</Link> | <Link href="/thoughts">Thoughts</Link>
      </nav>
      <header>
        <h1>{metadata.title}</h1>
        <div className="meta">
          <Link href="/articles/thoughts">What is this?</Link>
          <Revisions url={`/thoughts/${id}`} {...metadata} />
        </div>
        <Description metadata={metadata} />
      </header>
      <main id={id}>{content}</main>
      <Footer author="Andrew Aylett" copyright={metadata.date.split('/')[0]} />
    </div>
  );
}
