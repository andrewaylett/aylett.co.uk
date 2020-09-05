import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import React from 'react'
import { ParsedUrlQuery } from 'querystring'
import articles, { Article } from '../../articles'

export default function Page({ name }: InferGetStaticPropsType<typeof getStaticProps>) {
  return articles[name].body({})
}

class NamedPost implements ParsedUrlQuery {
  name: string;

  [key: string]: string | string[] | undefined
}

export const getStaticProps: GetStaticProps<NamedPost, NamedPost> = async ({ params }) => {
  return { props: params }
}

export const getStaticPaths: GetStaticPaths<NamedPost> = async () => {
  return {
    paths: Object.entries(articles).map(([k]) => ({ params: { name: k } })),
    fallback: false,
  }
}
