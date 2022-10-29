import { allArticles } from '../../../ssr/articles';

import 'server-only';

export const config = {
  dynamicParams: false,
};

export async function generateStaticParams() {
  const pages = await allArticles();
  return pages.map((page) => ({
    id: page.id,
  }));
}
