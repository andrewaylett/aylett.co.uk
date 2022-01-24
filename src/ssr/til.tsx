import { GetStaticProps } from 'next';

import { ArticlesProps } from '../types';

import { findPages } from './page-utils';

export const getStaticProps: GetStaticProps<ArticlesProps> = async () => findPages('til');
