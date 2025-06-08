import 'server-only';

import React, { Suspense, use } from 'react';

import { type Metadata } from 'next';
import Link from 'next/link';

import { allThoughts, thoughtForId } from '../thoughts';

import { useExploded } from '@/client/hooks/useExploded';
import { Description } from '@/components/Description';
import { Optional } from '@/components/Optional';
import { PageStructure } from '@/components/PageStructure';
import { TitleSeparator } from '@/components/TitleSeparator';
import { Use } from '@/components/Use';
import { type Markdown } from '@/remark/traverse';
import { type ThoughtSchema, type TypeFrom } from '@/types';
import { gitHubUrl } from '@/utilities';

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

function Revisions({ date, url }: { date: string; url: string }) {
  return (
    <div className="flex flex-row flex-wrap gap-x-[1ch]">
      <Optional condition={date}>
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
}

function ThoughtPage({ params }: ThoughtProps) {
  const page = thoughtForId(params);
  return (
    <Suspense>
      <Thought page={page} />
    </Suspense>
  );
}

export default ThoughtPage;

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
  const data = use(metadata);
  return (
    <header>
      <h1 property="headline">{data.title}</h1>
      <div className="meta">
        <Link href="/articles/thoughts">What is this?</Link>
        <Revisions url={`/thoughts/${id}`} {...data} />
      </div>
      <Description data={data} />
      <TitleSeparator />
    </header>
  );
}
