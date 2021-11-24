// @ts-check

const { printAndExit } = require('next/dist/server/lib/utils');
const remarkFrontmatter = require('remark-frontmatter');
const yaml = require('yaml');
// eslint-disable-next-line import/order
const { withPlausibleProxy } = require('next-plausible');

const visitP = import('unist-util-visit');
const removeP = import('unist-util-remove');

/** @type {typeof import('unist-util-visit').visit} */
let visit;
/** @type {typeof import('unist-util-remove').remove} */
let remove;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const resolve = async () => {
    visit = (await visitP).visit;
    remove = (await removeP).remove;
};

resolve().catch((reason) => {
    printAndExit(`${reason}`, 1);
});

/** @type {import('unified').Pluggable} */
const extractFrontmatter = () => (tree, file) => {
    visit(tree, 'yaml', (node) => {
        // eslint-disable-next-line no-param-reassign
        file.data.frontmatter = {
            title: file.stem,
            ...yaml.parse(node.value),
        };
    });
    remove(tree, 'yaml');
};

/**
 * @typedef {import('next/dist/server/config-shared').NextConfig} NextConfig
 * @typedef {import('next/dist/lib/load-custom-routes').Header} Header
 */

/**
 * @type {function(NextConfig): NextConfig}
 */
const withMDX = require('@next/mdx')({
    options: {
        remarkPlugins: [remarkFrontmatter, extractFrontmatter],
    },
    extension: /\.mdx?$/,
});

module.exports = withPlausibleProxy()(
    withMDX(
        /** @type {NextConfig} */ {
            swcMinify: true,
            reactStrictMode: true,
            pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
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
                            "script-src-elem 'self' 'unsafe-inline'",
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
    )
);
