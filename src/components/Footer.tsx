import { Fragment, use, type JSX } from 'react';

import Link from 'next/link';

export interface FooterProps {
  author?: Promise<string | undefined>;
  copyright?: Promise<string | undefined>;
  keywords?: Promise<string[]>;
}

export function Footer({
  author,
  copyright,
  keywords,
}: FooterProps): JSX.Element {
  const resolvedKeywords = keywords ? use(keywords) : [];
  const resolvedAuthor = (author && use(author)) ?? 'Andrew Aylett';
  const resolvedCopyright = copyright && use(copyright);

  return (
    <footer className="sticky bottom-0 mt-4 pt-1 w-full *:text-smaller flex flex-row flex-wrap justify-between pb-1 intrinsic-h-[1lh]">
      {resolvedKeywords.length > 0 && (
        <div property="keywords">
          {resolvedKeywords
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((s, index) => {
              const encoded = encodeURIComponent(s.toLowerCase());
              return (
                <Fragment key={s}>
                  {index > 0 && ', '}
                  <Link href={`/tags/${encoded}`}>{s}</Link>
                </Fragment>
              );
            })}
        </div>
      )}
      <div property="copyrightNotice" className="text-right">
        Copyright © <span property="copyrightHolder">{resolvedAuthor}</span>
        {resolvedCopyright && (
          <>
            , <span property="copyrightYear">{resolvedCopyright}</span>
          </>
        )}
      </div>
    </footer>
  );
}
