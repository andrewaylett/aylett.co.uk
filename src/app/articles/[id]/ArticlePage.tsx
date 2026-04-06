import React, { type ReactElement, Suspense, use } from 'react';

import { ArticleHeader } from './ArticleHeader';

import { useExploded } from '@/client/hooks/useExploded';
import { PageStructure } from '@/components/PageStructure';
import { type Markdown } from '@/remark/traverse';
import { type Article } from '@/types';

async function makeCopyrightString(
  copyright: Promise<string | undefined> | undefined,
  revised: Promise<string>,
): Promise<string> {
  return (
    (copyright ? await copyright : undefined) ?? (await revised).split('/')[0]
  );
}

export function ArticlePage({
  id,
  page,
}: {
  page: Markdown<Article>;
  id: string;
}): ReactElement {
  const { content, metadata } = page;
  const { author, copyright, lifecycle, revised, tags } = useExploded(metadata);

  const copyrightString = makeCopyrightString(copyright, revised);
  return (
    <PageStructure
      lifecycle={lifecycle}
      schemaType="Article"
      resource={`/articles/${id}`}
      breadcrumbs={[{ href: '/articles', text: 'Articles' }]}
      header={
        <Suspense>
          <ArticleHeader id={id} page={page} />
        </Suspense>
      }
      author={author}
      copyright={copyrightString}
      keywords={tags}
    >
      <div className="article-body" property="articleBody">
        {use(content)}
      </div>
    </PageStructure>
  );
}
