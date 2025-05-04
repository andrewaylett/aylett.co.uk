import React, { use } from 'react';

import Link from 'next/link';

import { Description } from '../../remark/components';
import { type ArticleSchema, memo, type TypeFrom } from '../../types';

export const ArticleEntry = memo(function Entry({
  metadata,
  name,
}: {
  metadata: Promise<TypeFrom<ArticleSchema>>;
  name: string;
}) {
  const { abstract, author, lifecycle, revised, revision, title } =
    use(metadata);
  return (
    <div
      property="itemListElement"
      typeof="Article"
      resource={`/articles/${name}`}
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        <span className="inline-block">
          {lifecycle === 'draft' ? 'Draft: ' : ''}
          <Link property="url" href={`/articles/${name}`}>
            <span property="headline">{title}</span>
          </Link>
          {author && (
            <span property="author" typeof="Person" resource={`#${author}`}>
              {' - '}
              <span property="name">{author}</span>
            </span>
          )}
        </span>
        <span className="inline-block">
          <span className="wrap-parens text-smaller">
            {revision && `v${revision}, `}
            {revised.split('/')[0]}
          </span>
          {abstract && ':'}
        </span>
        {abstract && (
          <span className="inline-block" property="alternativeHeadline">
            {abstract}
          </span>
        )}
      </div>
      <Description metadata={metadata} />
    </div>
  );
});
