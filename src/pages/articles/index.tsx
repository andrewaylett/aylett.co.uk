import React from 'react'
import { GetStaticProps, InferGetStaticPropsType } from 'next'
import path from 'path'
import fs from 'fs-extra'
import Link from 'next/link'
import style from './index.module.scss'
import Footer from '../../footer'
import sort_by from '../../sort_by'

const BlogList: InferGetStaticPropsType<typeof getStaticProps> = ({ pages }) => {
  return (
    <div className={style.page}>
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
}

export default BlogList

export const getStaticProps: GetStaticProps = async () => {
  const ARTICLES_PATH = path.join(process.cwd(), 'src', 'pages', 'articles')
  let items = await fs.readdir(ARTICLES_PATH)
  const arr = []
  for (let i = 0; i < items.length; i++) {
    const filePath = path.join(ARTICLES_PATH, items[i])
    const { ext, name } = path.parse(filePath)
    // Only process markdown/mdx files that are not index.tsx pages
    if (ext.startsWith('.md') && name !== 'index') {
      const module = await import(`./${items[i]}`)
      arr.push({ name, metadata: module.metadata })
    }
  }

  sort_by(arr, (entry) => entry.metadata.title)

  return {
    props: {
      pages: arr,
    },
  }
}
