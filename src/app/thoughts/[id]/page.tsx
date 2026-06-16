import Link from 'next/link';

import { allThoughts, thoughtForId } from '../thoughts';

import type { Metadata } from 'next';
import type { Thought } from '@/types';

import { Description } from '@/components/Description';
import { Optional } from '@/components/Optional';
import { PageStructure } from '@/components/PageStructure';
import { TitleSeparator } from '@/components/TitleSeparator';
import { gitHubUrl } from '@/utilities';

interface ThoughtProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ThoughtProps): Promise<Metadata> {
  'use cache';

  const page = await thoughtForId((await params).id);

  const metadata = page.metadata;

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

export async function generateStaticParams(): Promise<{ id: string }[]> {
  'use cache';

  const thoughts = await allThoughts();
  return thoughts.map((thought) => ({
    id: thought.id,
  }));
}

function Revisions({ date, url }: { date: string; url: string }): JSX.Element {
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

export default async function ThoughtPage({
  params,
}: ThoughtProps): Promise<JSX.Element> {
  'use cache';

  const { id } = await params;
  return <Thought id={id} />;
}

async function Thought({ id }: { id: string }) {
  'use cache';

  const page = thoughtForId(id);
  const { content, metadata } = await page;
  const { date, tags } = metadata;

  return (
    <PageStructure
      schemaType="Article"
      resource={`/thoughts/${id}`}
      breadcrumbs={[{ href: '/thoughts', text: 'Thoughts' }]}
      header={<ThoughtHeader id={id} />}
      copyright={date.split('/')[0]}
      keywords={tags}
    >
      <div className="article-body" property="articleBody">
        {content}
      </div>
    </PageStructure>
  );
}

async function ThoughtHeader({ id }: { id: string }) {
  const data = (await thoughtForId(id)).metadata;
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
