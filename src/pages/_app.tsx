import App from 'next/app'
import 'normalize.css'
import './global.scss'
import React from 'react'
import { AppProps } from 'next/dist/pages/_app'
import { MDXProvider } from '@mdx-js/react'
import Link from 'next/link'
import Footer from '../footer'
import Head from 'next/head'
import { github_url } from '../github'

const Optional = ({ text, formatter: formatted }) => <>{text ? <span>{formatted}</span> : null}</>

const Revisions = ({ revision, revised, expires, url }) => (
  <>
    {revision || revised || expires ? (
      <div className="revisions">
        <Optional text={revision} formatter={`Version: ${revision}`} />
        <Optional text={revised} formatter={<a href={github_url(url)}>Last Revised: {revised}</a>} />
        <Optional text={expires} formatter={`Expires: ${expires}`} />
      </div>
    ) : (
      ''
    )}
  </>
)

const components = (url) => ({
  wrapper: ({ children, metadata }) => (
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
  ),
})

const WrappedApp: React.VoidFunctionComponent<AppProps> = (props, context) => (
  <MDXProvider components={components(props.router.asPath)}>
    <App {...props} context={context} />
  </MDXProvider>
)

export default WrappedApp
