declare module '@next/mdx' {
  import type { NextConfig } from 'next';
  import type { Pluggable, Settings } from 'unified';

  interface MDXPluginOptions extends Settings {
    remarkPlugins: Pluggable[];
  }

  interface NextMDXPluginOptions {
    extension?: RegExp;
    options?: MDXPluginOptions;
  }

  declare function mdx(pluginOptions: NextMDXPluginOptions): (nextConfig: NextConfig) => NextConfig;
  export = mdx;
}
