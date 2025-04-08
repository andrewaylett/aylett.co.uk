import * as React from 'react';
import { use } from 'react';

import { getYear } from 'date-fns';

export interface FooterProps {
  author?: Promise<string>;
  copyright?: Promise<string>;
  keywords?: Promise<string[]>;
}

export default function Footer({ author, copyright, keywords }: FooterProps) {
  return (
    <footer className="pt-[1em] text-smaller flex flex-row flex-wrap justify-between mt-[1ex]">
      {keywords ? (
        <div property="keywords">{use(keywords)?.join(', ')}</div>
      ) : null}
      <div property="copyrightNotice" className="text-right">
        Copyright ©{' '}
        <span property="copyrightHolder">
          {(author ? use(author) : '') || 'Andrew Aylett'}
        </span>
        ,{' '}
        <span property="copyrightYear">
          {(copyright ? use(copyright) : '') || getYear(Date.now())}
        </span>
      </div>
    </footer>
  );
}
