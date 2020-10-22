import { GetStaticProps } from 'next'
import path from 'path'
import fs from 'fs-extra'
import sort_by from '../sort_by'
import { Page, PageMetadata } from '../types'
import { PathReporter } from 'io-ts/PathReporter'

export const getStaticProps: GetStaticProps<{ pages: Page[] }> = async () => {
  const ARTICLES_PATH = path.join(process.cwd(), 'src', 'pages', 'articles')
  const items = await fs.readdir(ARTICLES_PATH)
  const promises: Promise<Page[]>[] = items.map(async (item) => {
    const filePath = path.join(ARTICLES_PATH, item)
    const { ext, name } = path.parse(filePath)
    // Only process markdown/mdx files that are not index.tsx pages
    if (ext.startsWith('.md') && name !== 'index') {
      const module = await import(`../pages/articles/${item}`)
      const maybeMetadata = PageMetadata.decode(module.metadata)
      if (maybeMetadata._tag === 'Right') {
        return [{ name, metadata: maybeMetadata.right }]
      }
      throw PathReporter.report(maybeMetadata)
    }
    return []
  })

  const entries: Page[] = (await Promise.all(promises)).flat(1)

  const sorted: Page[] = sort_by(entries, (entry) => entry.metadata.title)

  return {
    props: {
      pages: sorted,
    },
  }
}
