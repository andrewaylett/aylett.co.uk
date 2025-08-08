import React, { use } from 'react';

import { getYear } from 'date-fns';
import Link from 'next/link';

export interface FooterProps {
  author?: Promise<string>;
  copyright?: Promise<string>;
  keywords?: Promise<string[]>;
}

export function Footer({ author, copyright, keywords }: FooterProps) {
  const resolvedKeywords = keywords ? use(keywords) : [];
  const resolvedAuthor = author ? use(author) : 'Andrew Aylett';
  const resolvedCopyright = copyright ? use(copyright) : getYear(Date.now());

  return (
    <footer className="sticky bottom-0 mt-4 pt-1 w-full *:text-smaller flex flex-row flex-wrap justify-between pb-1">
      {resolvedKeywords.length > 0 && (
        <div property="keywords">
          {resolvedKeywords
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((s, index) => {
              const encoded = encodeURIComponent(s.toLowerCase());
              return (
                <React.Fragment key={s}>
                  {index > 0 && ', '}
                  <Link href={`/tags/${encoded}`}>{s}</Link>
                </React.Fragment>
              );
            })}
        </div>
      )}
      <div property="copyrightNotice" className="text-right">
        Copyright © <span property="copyrightHolder">{resolvedAuthor}</span>,{' '}
        <span property="copyrightYear">{resolvedCopyright}</span>
      </div>
    </footer>
  );
}
