import * as React from 'react';

import { getYear } from 'date-fns';

export type FooterProps = {
  author?: string;
  copyright?: string;
};

export default function Footer({ author, copyright }: FooterProps) {
  return (
    <footer className="pt-[1em] text-smaller text-right">
      Copyright © {author || 'Andrew Aylett'},{' '}
      {copyright || getYear(Date.now())}
    </footer>
  );
}
