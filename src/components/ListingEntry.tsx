import React, { use } from 'react';

import Link from 'next/link';

import { Description } from '@/components/Description';
import { type ArticleSchema, type ThoughtSchema, type TypeFrom } from '@/types';

export function ListingEntry({
                               metadata,
                               name,
                             }: {
  metadata: Promise<TypeFrom<ArticleSchema | ThoughtSchema>>;
  name: string;
}) {
  const data = use(metadata);
  const isArticle = data.tag === 'article';

  const path = isArticle ? 'articles' : 'thoughts';
  const href = `/${path}/${name}`;

  return (
    <div property="itemListElement" typeof="Article" resource={href}>
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        <span className="inline-block">
          {isArticle && data.lifecycle === 'draft' ? 'Draft: ' : ''}
          <Link property="url" href={href}>
            <span property="headline">{data.title}</span>
          </Link>
          {isArticle && data.author && (
            <span
              property="author"
              typeof="Person"
              resource={`#${data.author}`}
            >
              {' - '}
              <span property="name">{data.author}</span>
            </span>
          )}
        </span>
        {isArticle && (
          <>
            <span className="inline-block">
              <span className="wrap-parens text-smaller">
                {data.revision && `v${data.revision}, `}
                {data.revised.split('/')[0]}
              </span>
              {data.abstract && ':'}
            </span>
            {data.abstract && (
              <span className="inline-block" property="alternativeHeadline">
                {data.abstract}
              </span>
            )}
          </>
        )}
      </div>
      <Description metadata={metadata} />
    </div>
  );
}
