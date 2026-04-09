import { use, type JSX } from 'react';

import { Revisions } from './Revisions';

import type { Markdown } from '@/remark/traverse';
import type { Article } from '@/types';

import { Description } from '@/components/Description';
import { TitleSeparator } from '@/components/TitleSeparator';

export function ArticleHeader({
  id,
  page,
}: {
  id: string;
  page: Markdown<Article>;
}): JSX.Element {
  const { metadata } = page;
  const data = use(metadata);

  return (
    <header className="contain-content">
      <h1 property="headline">{data.title}</h1>
      {data.abstract ? (
        <p property="alternativeHeadline">{data.abstract}</p>
      ) : null}
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
