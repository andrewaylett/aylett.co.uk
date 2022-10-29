import * as React from 'react';

import { getYear } from 'date-fns';

export default function Footer({ author, copyright }: { author: string; copyright?: string }) {
  return (
    <footer style={{ paddingTop: '1em' }}>
      Copyright © {author || 'Andrew Aylett'}, {copyright || getYear(Date.now())}
    </footer>
  );
}
