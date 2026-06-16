import type { JSX } from 'react';

import { ArticleHeader } from './ArticleHeader';

import { PageStructure } from '@/components/PageStructure';
import { articleForId } from '@/app/articles/articles';

function makeCopyrightString(
  copyright: string | undefined,
  revised: string,
): string {
  return copyright ?? revised.split('/')[0];
}

export async function ArticlePage({
  id,
}: {
  id: string;
}): Promise<JSX.Element> {
  'use cache';

  const { content, metadata } = await articleForId(id);

  const { author, copyright, lifecycle, revised, tags } = metadata;

  const copyrightString = makeCopyrightString(copyright, revised);
  return (
    <PageStructure
      lifecycle={lifecycle}
      schemaType="Article"
      resource={`/articles/${id}`}
      breadcrumbs={[{ href: '/articles', text: 'Articles' }]}
      header={<ArticleHeader id={id} data={metadata} />}
      author={author}
      copyright={copyrightString}
      keywords={tags}
    >
      <div className="article-body" property="articleBody">
        {content}
      </div>
    </PageStructure>
  );
}
