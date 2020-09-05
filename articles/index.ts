import dummy, { metadata } from './dummy.mdx'

export type Articles = Record<string, Article>
export const Articles: Articles = {
  dummy: { body: dummy, metadata },
}

export default Articles

export interface Article {
  body: (props: any) => JSX.Element
  metadata: Record<string, any>
}
