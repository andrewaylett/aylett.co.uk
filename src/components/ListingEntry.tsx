import type { JSX } from 'react';

import Link from 'next/link';

import type { Content } from '@/types';

import { Description } from '@/components/Description';

export function ListingEntry({
  content,
  id,
}: {
  content: Content;
  id: string;
}): JSX.Element {
  const isArticle = content.tag === 'article';

  const path = isArticle ? 'articles' : 'thoughts';
  const href = `/${path}/${id}`;

  return (
    <div
      property="itemListElement"
      typeof="Article"
      resource={href}
      className="contain-content"
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch] contain-content">
        <span className="inline-block">
          {isArticle && content.lifecycle === 'draft' ? 'Draft: ' : ''}
          <Link property="url" href={href}>
            <span property="headline">{content.title}</span>
          </Link>
          {isArticle && content.author && (
            <span
              property="author"
              typeof="Person"
              resource={`#${content.author}`}
            >
              {' - '}
              <span property="name">{content.author}</span>
            </span>
          )}
        </span>
        {isArticle && (
          <>
            <span className="inline-block">
              <span className="wrap-parens text-smaller">
                {content.revision && `v${content.revision}, `}
                {content.revised.split('/')[0]}
              </span>
              {content.abstract && ':'}
            </span>
            {content.abstract && (
              <span className="inline-block" property="alternativeHeadline">
                {content.abstract}
              </span>
            )}
          </>
        )}
      </div>
      <Description data={content} />
    </div>
  );
}
