import * as React from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GITHUB_URL } from '../../../github';
import Footer from '../../footer';
import { allThoughts, thoughtForId } from '../thoughts';
import { Description, Optional } from '../../../remark/components';
import { Markdown } from '../../../remark/traverse';
import { ThoughtSchema, TypeFrom } from '../../../types';

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
  const page = await thoughtForId(params.id ?? notFound());

  if (!page) {
    notFound();
  }

  const metadata = await page.metadata;

  return {
    title: metadata.title,
    authors: { name: 'Andrew Aylett', url: 'https://www.aylett.co.uk' },
    description: metadata.description,
    keywords: metadata.tags,
  };
}

// noinspection JSUnusedGlobalSymbols
export async function generateStaticParams() {
  const thoughts = await allThoughts();
  return thoughts.map((thought) => ({
    id: thought.id,
  }));
}

const Revisions: React.FC<{ date: string; url: string }> = ({ date, url }) => (
  <div className="revisions">
    <Optional text={date}>
      <a href={GITHUB_URL(url)}>Date:&nbsp;{date}</a>
    </Optional>
  </div>
);

// noinspection JSUnusedGlobalSymbols
export default function article({
  params,
}: {
  params: { id: string };
}): React.ReactNode {
  const page = thoughtForId(params.id);
  return (
    <Suspense>
      <Thought page={page} />
    </Suspense>
  );
}

function Thought({ page }: { page: Promise<Markdown<typeof ThoughtSchema>> }) {
  const { content, id, metadata } = use(page);

  return (
    <div className="mdx">
      <nav>
        <Link href="/">Home</Link> | <Link href="/thoughts">Thoughts</Link>
      </nav>
      <ThoughtHeader id={id} metadata={metadata} />
      <Suspense>
        <main id={id}>{use(content)}</main>
        <Footer
          author="Andrew Aylett"
          copyright={use(metadata).date.split('/')[0]}
        />
      </Suspense>
    </div>
  );
}

function ThoughtHeader({
  id,
  metadata,
}: {
  id: string;
  metadata: Promise<TypeFrom<typeof ThoughtSchema>>;
}) {
  return (
    <header>
      <h1>{use(metadata).title}</h1>
      <div className="meta">
        <Link href="/articles/thoughts">What is this?</Link>
        <Revisions url={`/thoughts/${id}`} {...use(metadata)} />
      </div>
      <Description metadata={metadata} />
    </header>
  );
}
