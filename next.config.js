const withMDX = require('@next/mdx')()
module.exports = withMDX({
    webpack(config, { dev }) {
        if (!dev) {
            config.devtool = 'source-map'
            for (const plugin of config.plugins) {
                if (plugin['constructor']['name'] === 'UglifyJsPlugin') {
                    plugin.options.sourceMap = true
                    break
                }
            }
        }
        return config
    },
})
