declare module '@next/mdx' {
  import { NextConfig } from 'next';
  import { Pluggable, Settings } from 'unified';

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
