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
  publisher: 'Andrew Aylett',
};

// noinspection JSUnusedGlobalSymbols
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html lang="en">
      <body>
        <PlausibleProvider
          domain="aylett.co.uk"
          scriptProps={{ src: '/js/script.js' }}
          enabled={process.env.NODE_ENV === 'production'}
        >
          {children}
        </PlausibleProvider>
      </body>
    </html>
  );
}
