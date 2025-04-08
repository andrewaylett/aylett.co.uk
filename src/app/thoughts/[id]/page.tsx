import * as React from 'react';
import type { Usable } from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';

import { gitHubUrl } from '../../../github';
import { allThoughts, thoughtForId } from '../thoughts';
import {
  Description,
  Optional,
  TitleSeparator,
} from '../../../remark/components';
import { PageStructure } from '../../../page-structure';
import { useExploded, ThoughtSchema, TypeFrom } from '../../../types';

import type { Markdown } from '../../../remark/traverse';
import type { Metadata } from 'next';

import 'server-only';

export const dynamicParams = false;
export const dynamic = 'error';

interface ThoughtProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ThoughtProps): Promise<Metadata> {
  const page = await thoughtForId(params);

  const metadata = await page.metadata;

  return {
    title: metadata.title,
    authors: { name: 'Andrew Aylett', url: 'https://www.aylett.co.uk' },
    description: metadata.description,
    keywords: metadata.tags,
    openGraph: {
      type: 'article',
      authors: 'Andrew Aylett',
      description: metadata.description,
      locale: 'en_GB',
      publishedTime: metadata.date,
      tags: metadata.tags,
      title: metadata.title,
    },
  };
}

export async function generateStaticParams() {
  const thoughts = await allThoughts();
  return thoughts.map((thought) => ({
    id: thought.id,
  }));
}

const Revisions: React.FC<{ date: string; url: string }> = ({ date, url }) => (
  <div className="flex flex-row flex-wrap gap-x-[1ch]">
    <Optional text={date}>
      <a
        className="text-inherit"
        property="subjectOf"
        typeof="SoftwareSourceCode"
        href={gitHubUrl(url)}
      >
        Date
      </a>
      :&nbsp;<span property="datePublished">{date}</span>
    </Optional>
  </div>
);

export default function thought({ params }: ThoughtProps): React.ReactNode {
  const page = thoughtForId(params);
  return (
    <Suspense>
      <Thought page={page} />
    </Suspense>
  );
}

function Thought({ page }: { page: Promise<Markdown<ThoughtSchema>> }) {
  const { content, id, metadata } = useExploded(page);
  const { date, tags } = useExploded(metadata);

  return (
    <PageStructure<typeof page>
      schemaType="Article"
      resource={`/thoughts/${use(id)}`}
      breadcrumbs={[{ href: '/thoughts', text: 'Thoughts' }]}
      header={<ThoughtHeader id={use(id)} metadata={metadata} />}
      copyright={date.then((d) => d.split('/')[0])}
      keywords={tags}
    >
      <Suspense>
        <div property="articleBody">
          <Use el={content} />
        </div>
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
      <h1 property="headline">{use(metadata).title}</h1>
      <div className="meta">
        <Link href="/articles/thoughts">What is this?</Link>
        <Revisions url={`/thoughts/${id}`} {...use(metadata)} />
      </div>
      <Description metadata={metadata} />
      <TitleSeparator />
    </header>
  );
}

function Use({ el }: { el: Usable<React.JSX.Element> }): React.JSX.Element {
  return use(el);
}
