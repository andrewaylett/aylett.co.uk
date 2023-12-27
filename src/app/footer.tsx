import * as React from 'react';

import { getYear } from 'date-fns';

export type FooterProps = {
  author?: string;
  copyright?: string;
  keywords?: string[];
};

export default function Footer({ author, copyright, keywords }: FooterProps) {
  return (
    <footer className="pt-[1em] text-smaller flex flex-row flex-wrap justify-between mt-[1ex]">
      {keywords ? (
        <div property="keywords">{(keywords ?? []).join(', ')}</div>
      ) : null}
      <div property="copyrightNotice" className="text-right">
        Copyright ©{' '}
        <span property="copyrightHolder">{author || 'Andrew Aylett'}</span>,{' '}
        <span property="copyrightYear">{copyright || getYear(Date.now())}</span>
      </div>
    </footer>
  );
}
