import { withPlausibleProxy } from 'next-plausible';
import { NextConfig } from 'next';
import {
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} from 'next/constants';

import type { Header, Rewrite } from 'next/dist/lib/load-custom-routes';

const BASIC_HEADERS: Header['headers'] = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
];

const PRODUCTION_HEADERS: Header['headers'] = [
  {
    key: 'Report-To',
    value: JSON.stringify({
      group: 'default',
      max_age: 31536000,
      endpoints: [{ url: 'https://aylett.report-uri.com/a/d/g' }],
      include_subdomains: true,
    }),
  },
  {
    key: 'NEL',
    value: JSON.stringify({
      report_to: 'default',
      max_age: 31536000,
      include_subdomains: true,
    }),
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "script-src 'self' 'unsafe-inline'",
      "script-src-elem 'self' 'unsafe-inline'",
      "script-src-attr 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "object-src 'none'",
      "child-src 'none'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      'upgrade-insecure-requests',
      'block-all-mixed-content',
      'disown-opener',
      "base-uri 'self'",
      'report-to default',
      'report-uri https://aylett.report-uri.com/r/d/csp/enforce',
    ].join('; '),
  },
];

const CORS_HEADERS: Header['headers'] = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
];

export default async (
  phase: string,
  { defaultConfig }: { defaultConfig: NextConfig },
): Promise<NextConfig> => {
  const headers = [
    ...BASIC_HEADERS,
    ...([PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER].includes(phase)
      ? PRODUCTION_HEADERS
      : []),
  ];
  const headerSets = Promise.resolve([
    {
      source: '/.well-known/(.*)*',
      headers: [...headers, ...CORS_HEADERS],
    },
    {
      source: '/(.*)*',
      headers,
    },
  ] satisfies Header[]);

  const rewriteSets = Promise.resolve([
    {
      source: '/api/event',
      destination: 'https://plausible.io/api/event',
    },
  ] satisfies Rewrite[]);

  return withPlausibleProxy()({
    ...defaultConfig,
    ...({
      experimental: {
        typedRoutes: true,
      },
      reactStrictMode: true,
      pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
      productionBrowserSourceMaps: true,
      headers: () => headerSets,
      rewrites: () => rewriteSets,
    } satisfies NextConfig),
  });
};
