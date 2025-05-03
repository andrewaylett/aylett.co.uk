import { allArticles } from '../articles/articles';
import { allThoughts } from '../thoughts/thoughts';

export async function allTags() {
  const articles = await allArticles();
  const thoughts = await allThoughts();

  const tags = new Set<string>();
  for (const article of articles) {
    const metadata = await article.metadata;
    metadata.tags.forEach((tag) => tags.add(tag));
  }
  for (const thought of thoughts) {
    const metadata = await thought.metadata;
    metadata.tags.forEach((tag) => tags.add(tag));
  }
  return tags;
}
