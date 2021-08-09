const detectFrontmatter = require('remark-frontmatter');
const yaml = require('yaml');
// eslint-disable-next-line import/order
const { withPlausibleProxy } = require('next-plausible');

const visitP = import('unist-util-visit');
const removeP = import('unist-util-remove');

const extractFrontmatter = () => async (tree, file) => {
    const { visit } = await visitP;
    const { remove } = await removeP;
    visit(tree, 'yaml', (node) => {
        // eslint-disable-next-line no-param-reassign
        file.data.frontmatter = {
            title: file.stem,
            ...yaml.parse(node.value),
        };
    });
    remove(tree, 'yaml');
};

const withMDX = require('@next/mdx')({
    options: {
        remarkPlugins: [detectFrontmatter, extractFrontmatter],
    },
});

module.exports = withPlausibleProxy()(
    withMDX({
        webpack(config, { dev }) {
            if (!dev) {
                // eslint-disable-next-line no-param-reassign
                config.devtool = 'source-map';
                config.plugins.forEach((plugin) => {
                    if (plugin.constructor.name === 'UglifyJsPlugin') {
                        // eslint-disable-next-line no-param-reassign
                        plugin.options.sourceMap = true;
                    }
                });
            }
            return config;
        },
        reactStrictMode: true,
        pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    })
);
