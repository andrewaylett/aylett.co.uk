// @ts-check

const { withPlausibleProxy } = require('next-plausible');

/**
 * @typedef {import('next/dist/server/config-shared').NextConfig} NextConfig
 * @typedef {import('next/dist/lib/load-custom-routes').Header} Header
 */

module.exports = withPlausibleProxy()(
    /** @type {NextConfig} */ {
        experimental: { appDir: true },
        swcMinify: true,
        reactStrictMode: true,
        pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
        productionBrowserSourceMaps: true,
        async headers() {
            const headers = [
                {
                    key: 'X-XSS-Protection',
                    value: '1; mode=block',
                },
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
                    key: 'Report-To',
                    value: [
                        '{"group":"default"',
                        '"max_age":31536000',
                        '"endpoints":[{"url":"https://aylett.report-uri.com/a/d/g"}]',
                        '"include_subdomains":true}',
                    ].join(','),
                },
                {
                    key: 'NEL',
                    value: '{"report_to":"default","max_age":31536000,"include_subdomains":true}',
                },
            ];
            if (process.env.NODE_ENV === 'production') {
                headers.push({
                    key: 'Content-Security-Policy',
                    value: [
                        "default-src 'self'",
                        "script-src 'self' 'unsafe-inline'",
                        "script-src-elem 'self' 'unsafe-inline'",
                        "script-src-attr 'self'",
                        "font-src 'none'",
                        "object-src 'none'",
                        "child-src 'none'",
                        "worker-src 'self'",
                        "frame-ancestors 'none'",
                        "form-action 'self'",
                        'upgrade-insecure-requests',
                        'block-all-mixed-content',
                        'disown-opener',
                        "base-uri 'self'",
                        'report-uri https://aylett.report-uri.com/r/d/csp/wizard',
                    ].join('; '),
                });
            }
            return [
                {
                    source: '/(.*)*',
                    headers,
                },
            ];
        },
    }
);
