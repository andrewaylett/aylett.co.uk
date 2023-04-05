import * as React from 'react';

import PlausibleProvider from 'next-plausible';

import type { Metadata } from 'next';

import './global.css';
import '../../node_modules/normalize.css/normalize.css';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: {
    absolute: 'aylett.co.uk',
    template: '%s - aylett.co.uk',
  },
  icons: '/favicon.ico',
};

// noinspection JSUnusedGlobalSymbols
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html>
      <body>
        <PlausibleProvider
          domain="aylett.co.uk"
          scriptProps={{ src: '/js/script.js' }}
        >
          {children}
        </PlausibleProvider>
      </body>
    </html>
  );
}
