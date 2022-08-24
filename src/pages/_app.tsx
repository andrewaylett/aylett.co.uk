import React from 'react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

import App from 'next/app';
import { MDXProvider } from '@mdx-js/react';
import Link from 'next/link';
import Head from 'next/head';
import { PathReporter } from 'io-ts/PathReporter';
import * as t from 'io-ts';
import PlausibleProvider from 'next-plausible';

import Footer from '../footer';
import { GITHUB_URL } from '../github';
import { fcProps, PageMetadata } from '../types';

import type { MDXComponents } from 'mdx/types';
import type { AppProps } from 'next/dist/pages/_app';

import 'normalize.css';
import './global.scss';

const OptionalProps = t.partial({ text: t.string }, 'OptionalProps');

const Optional = fcProps(({ children, text }) => <>{text ? <span>{children}</span> : null}</>, OptionalProps);

const RevisionsProps = t.intersection([PageMetadata, t.interface({ url: t.string })], 'RevisionsProps');

const Revisions = fcProps(
  ({ expires, revised, revision, url }) => (
    <>
      {revision || revised || expires ? (
        <div className="revisions">
          <Optional text={revision}>Version:&nbsp;{revision}</Optional>
          <Optional text={revised}>
            <a href={GITHUB_URL(url)}>Last Revised:&nbsp;{revised}</a>
          </Optional>
          <Optional text={expires}>Expires:&nbsp;{expires}</Optional>
        </div>
      ) : (
        ''
      )}
    </>
  ),
  RevisionsProps
);

type WrapperProps = React.PropsWithChildren<{ metadata: PageMetadata }>;

const components: (url: string) => MDXComponents = (url) => ({
  wrapper: (props: WrapperProps) => {
    const { children, metadata: hopefullyMetadata } = props;
    const decoded = PageMetadata.decode(hopefullyMetadata);
    if (decoded._tag !== 'Right') {
      throw PathReporter.report(decoded);
    }
    const metadata = decoded.right;
    return (
      <div className="mdx">
        <Head>
          <title>{metadata.title} - aylett.co.uk</title>
        </Head>
        <nav>
          <Link href="/">Home</Link> | <Link href="/articles">Articles</Link>
        </nav>
        <header>
          <h1>{metadata.title}</h1>
          {metadata.abstract ? metadata.abstract : ''}
          <div className="meta">
            {metadata.author ? <div className="author">Author: {metadata.author}</div> : ''}
            <Revisions url={url} {...metadata} />
          </div>
        </header>
        <main>{children}</main>
        <Footer author={metadata.author} copyright={metadata.copyright || metadata.revised.split('/')[0]} />
      </div>
    );
  },
  h1: ({ children }: DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>) => (
    <h1 id={children?.toString().replaceAll(/[ ']/g, '_').toLowerCase()}>{children}</h1>
  ),
});

const WrappedApp: React.FunctionComponent<AppProps> = ({ ...props }, context) => (
  <PlausibleProvider domain="aylett.co.uk">
    <MDXProvider components={components(props.router.asPath)}>
      <App {...props} context={context} />
    </MDXProvider>
  </PlausibleProvider>
);

// noinspection JSUnusedGlobalSymbols
export default WrappedApp;
