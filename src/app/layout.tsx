import 'server-only';

import React, { type PropsWithChildren, type ReactNode, useMemo } from 'react';

import { type Metadata, type Viewport } from 'next';
import localFont from 'next/font/local';
import PlausibleProvider from 'next-plausible';

import './styles/global.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT ?? 3000}`,
  ),
  title: {
    absolute: 'aylett.co.uk',
    template: '%s - aylett.co.uk',
  },
  icons: '/favicon.ico',
  publisher: 'Andrew Aylett',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
};

const PLEX_SANS = localFont({
  display: 'fallback',
  variable: '--font-plex-sans',
  preload: false,
  src: [
    {
      path: './styles/IBMPlexSans-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-ThinItalic.woff2',
      weight: '100',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-ExtraLight.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-ExtraLightItalic.woff2',
      weight: '200',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-LightItalic.woff2',
      weight: '300',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-Italic.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-Text.woff2',
      weight: '450',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-TextItalic.woff2',
      weight: '450',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-MediumItalic.woff2',
      weight: '500',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-SemiBoldItalic.woff2',
      weight: '600',
      style: 'italic',
    },
    {
      path: './styles/IBMPlexSans-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './styles/IBMPlexSans-BoldItalic.woff2',
      weight: '700',
      style: 'italic',
    },
  ],
});

function RootLayout({ children }: PropsWithChildren): ReactNode {
  const plexSans = useMemo(() => PLEX_SANS, []);
  const nodeEnv = useMemo(() => process.env.NODE_ENV, []);

  return (
    <html
      lang="en"
      className={`${plexSans.variable} bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200`}
    >
      <body className="oldstyle-nums">
        <PlausibleProvider
          domain="aylett.co.uk"
          scriptProps={{ src: '/js/script.js' }}
          enabled={nodeEnv === 'production'}
        >
          {children}
        </PlausibleProvider>
      </body>
    </html>
  );
}

export default RootLayout;
