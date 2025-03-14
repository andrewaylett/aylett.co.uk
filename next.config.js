// @ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withPlausibleProxy } = require('next-plausible');

/**
 * @typedef {import('next/dist/server/config-shared').NextConfig} NextConfig
 * @typedef {import('next/dist/lib/load-custom-routes').Header} Header
 */

module.exports = withPlausibleProxy()(
  /** @type {NextConfig} */ {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    productionBrowserSourceMaps: true,
    headers() {
      /** @type {{ key: string; value: string; }[]} */
      const headers = [
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
      if (process.env.NODE_ENV === 'production') {
        headers.push(
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
        );
      }
      return Promise.resolve([
        {
          source: '/.well-known/(.*)*',
          headers: [
            ...headers,
            {
              key: 'Access-Control-Allow-Origin',
              value: '*',
            },
          ],
        },
        {
          source: '/(.*)*',
          headers,
        },
      ]);
    },
    rewrites() {
      return Promise.resolve([
        {
          source: '/api/event',
          destination: 'https://plausible.io/api/event',
        },
      ]);
    },
  },
);
