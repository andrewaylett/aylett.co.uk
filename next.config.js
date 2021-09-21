// @ts-check

const utils = import('next/dist/server/lib/utils');

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
/** @type {typeof import('next/dist/server/lib/utils').printAndExit} */
let printAndExit;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const resolve = async () => {
    printAndExit = (await utils).printAndExit;
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
            webpack(/** @type {import('webpack/types').Configuration} */ config, { dev }) {
                if (!dev) {
                    // eslint-disable-next-line no-param-reassign
                    config.devtool = 'source-map';
                    (config.plugins || []).forEach((plugin) => {
                        if (plugin.constructor.name === 'UglifyJsPlugin') {
                            if ('options' in plugin) {
                                // eslint-disable-next-line no-param-reassign
                                plugin.options.sourceMap = true;
                            }
                        }
                    });
                }
                return config;
            },
            reactStrictMode: true,
            pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
            productionBrowserSourceMaps: true,
            async headers() {
                return [
                    {
                        source: '/*',
                        headers: [
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
                        ],
                    },
                ];
            },
        }
    )
);
