import * as React from 'react';

import './global.css';
import '../../node_modules/normalize.css/normalize.css';

import PlausibleProvider from 'next-plausible';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <html>
      <body>
        <PlausibleProvider domain="aylett.co.uk" customDomain="https://www.aylett.co.uk">
          {children}
        </PlausibleProvider>
      </body>
    </html>
  );
}
