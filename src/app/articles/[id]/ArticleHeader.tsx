import type { JSX } from 'react';

import { Revisions } from './Revisions';

import type { Article } from '@/types';

import { Description } from '@/components/Description';
import { TitleSeparator } from '@/components/TitleSeparator';

export function ArticleHeader({
  id,
  data,
}: {
  id: string;
  data: Article;
}): JSX.Element {
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
