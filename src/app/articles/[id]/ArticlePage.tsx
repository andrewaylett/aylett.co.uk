import React, { type ReactElement, Suspense, use } from 'react';

import { ArticleHeader } from './ArticleHeader';

import { useExploded } from '@/client/hooks/useExploded';
import { PageStructure } from '@/components/PageStructure';
import { type Markdown } from '@/remark/traverse';
import { type ArticleSchema } from '@/types';

export function ArticlePage({
  id,
  page,
}: {
  page: Promise<Markdown<ArticleSchema>>;
  id: string;
}): ReactElement {
  const { content, metadata } = useExploded(page);
  const { author, copyright, lifecycle, revised, tags } = useExploded(metadata);

  return (
    <PageStructure<typeof page>
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
      copyright={copyright.then(
        (c) => c || revised.then((r) => r.split('/')[0]),
      )}
      keywords={tags}
    >
      <div property="articleBody">{use(content)}</div>
    </PageStructure>
  );
}
