import React from 'react'
import { InferGetStaticPropsType } from 'next'
import Link from 'next/link'
import style from '../../articles.module.scss'
import Footer from '../../footer'
import Head from 'next/head'
import { getStaticProps } from '../../ssr/articles'
import { ArticlesProps, fc_props } from '../../types'

export { getStaticProps } from '../../ssr/articles'

const Articles: React.VoidFunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = fc_props(({ pages }) => {
  return (
    <div className={style.page}>
      <Head>
        <title>Articles - aylett.co.uk</title>
      </Head>
      <nav>
        <Link href="/">Home</Link>
      </nav>
      <header>
        <h1>Articles</h1>
      </header>
      <main>
        {pages.map(({ name, metadata }) => (
          <p key={name}>
            <Link href={`/articles/${name}`}>{metadata.title}</Link>
            {metadata.author ? ` - ${metadata.author}` : ''}
            {metadata.revision ? <span className={style.revision}>{`v${metadata.revision}`}</span> : ''}
            {metadata.abstract ? `: ${metadata.abstract}` : ''}
          </p>
        ))}
      </main>
      <Footer />
    </div>
  )
}, ArticlesProps)

export default Articles
