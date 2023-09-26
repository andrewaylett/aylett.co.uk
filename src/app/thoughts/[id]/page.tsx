import * as React from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GITHUB_URL } from '../../../github';
import { allThoughts, thoughtForId } from '../thoughts';
import { Description, Optional } from '../../../remark/components';
import { Markdown } from '../../../remark/traverse';
import { ThoughtSchema, TypeFrom } from '../../../types';
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
  <div className="flex flex-row flex-wrap gap-x-[1ch]">
    <Optional text={date}>
      <a className="text-inherit" href={GITHUB_URL(url)}>
        Date:&nbsp;{date}
      </a>
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

function Thought({ page }: { page: Promise<Markdown<ThoughtSchema>> }) {
  const { content, id, metadata } = use(page);

  return (
    <PageStructure
      breadcrumbs={[{ href: '/thoughts', text: 'Thoughts' }]}
      header={<ThoughtHeader id={id} metadata={metadata} />}
      footer={{ copyright: use(metadata).date.split('/')[0] }}
    >
      <Suspense>
        <main id={id}>{use(content)}</main>
      </Suspense>
    </PageStructure>
  );
}

function ThoughtHeader({
  id,
  metadata,
}: {
  id: string;
  metadata: Promise<TypeFrom<ThoughtSchema>>;
}) {
  return (
    <header>
      <h1 className="main-title">{use(metadata).title}</h1>
      <div className="meta">
        <Link href="/articles/thoughts">What is this?</Link>
        <Revisions url={`/thoughts/${id}`} {...use(metadata)} />
      </div>
      <Description metadata={metadata} />
    </header>
  );
}
