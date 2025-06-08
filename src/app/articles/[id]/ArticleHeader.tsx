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
  const data = use(metadata);

  return (
    <header>
      <h1 property="headline">{data.title}</h1>
      {data.abstract ? (
        <p property="alternativeHeadline">{data.abstract}</p>
      ) : (
        ''
      )}
      <div className="flex flex-row flex-wrap-reverse justify-between mt-[1ex] my-[0.5lh]">
        {data.author && (
          <div className="author" property="author" typeof="Person">
            Author: <span property="name">{data.author}</span>
          </div>
        )}
        <Revisions url={`/articles/${id}`} {...data} />
        <Description data={data} />
      </div>
      <TitleSeparator />
    </header>
  );
}
