import React, { use } from 'react';

import { Revisions } from './Revisions';

import { useExploded } from '@/client/hooks/useExploded';
import { Description } from '@/components/Description';
import { TitleSeparator } from '@/components/TitleSeparator';
import { type Markdown } from '@/remark/traverse';
import { type ArticleSchema } from '@/types';

export function ArticleHeader({
  id,
  page,
}: {
  id: string;
  page: Promise<Markdown<ArticleSchema>>;
}) {
  const { metadata } = useExploded(page);

  return (
    <header>
      <h1 property="headline">{use(metadata).title}</h1>
      {use(metadata).abstract ? (
        <p property="alternativeHeadline">{use(metadata).abstract}</p>
      ) : (
        ''
      )}
      <div className="flex flex-row flex-wrap-reverse justify-between mt-[1ex] my-[0.5lh]">
        {use(metadata).author && (
          <div className="author" property="author" typeof="Person">
            Author: <span property="name">{use(metadata).author}</span>
          </div>
        )}
        <Revisions url={`/articles/${id}`} {...use(metadata)} />
        <Description metadata={metadata} />
      </div>
      <TitleSeparator />
    </header>
  );
}
