import App from 'next/app'
import 'normalize.css'
import './global.scss'
import React from 'react'
import { AppProps } from 'next/dist/pages/_app'
import { MDXProvider } from '@mdx-js/react'
import Link from 'next/link'
import Footer from '../footer'

const Optional = ({ text, formatter: formatted }) => <>{text ? <span>{formatted}</span> : null}</>

const Revisions = ({ revision, revised, expires }) => (
  <>
    {revision || revised || expires ? (
      <p className="revisions">
        <Optional text={revision} formatter={`Version ${revision}`} />
        <Optional text={revised} formatter={`Last Revised: ${revised}`} />
        <Optional text={expires} formatter={`Expires: ${expires}`} />
      </p>
    ) : (
      ''
    )}
  </>
)

const components = {
  wrapper: ({ children, metadata }) => (
    <div className="mdx">
      <header>
        <h1>{metadata.title}</h1>
        <Revisions {...metadata} />
        {metadata.author ? <p className="author">{metadata.author}</p> : ''}
      </header>
      <nav>
        <Link href="/">Home</Link> | <Link href="/articles">Articles</Link>
      </nav>
      <main>{children}</main>
      <Footer />
    </div>
  ),
}

const WrappedApp: React.VoidFunctionComponent<AppProps> = (props, context) => (
  <MDXProvider components={components}>
    <App {...props} context={context} />
  </MDXProvider>
)

export default WrappedApp
