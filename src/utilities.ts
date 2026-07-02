/** Awaits a nullable promise and throws if the result is null. */
export async function nullToError<T>(
  value: Promise<T | null>,
  message?: string,
): Promise<T> {
  const result = await value;
  if (result === null) {
    throw new Error(message ?? 'value is null');
  }
  return result;
}

/** Returns a GitHub URL pointing to the commit history for a given page's markdown source. */
export const gitHubUrl = (pageName: string): string =>
  `https://github.com/andrewaylett/aylett.co.uk/commits/main/md${pageName.replace(
    /#.*/,
    '',
  )}.md`;

/** Sorts an array by a derived key, resolving all keys before sorting. */
export function sortByKey<T>(input: T[], keyExtractor: (v: T) => unknown): T[] {
  const withKeys = input.map((item): [unknown, T] => [
    keyExtractor(item),
    item,
  ]);

  withKeys.sort((a, b) => {
    const [keyA] = a;
    const [keyB] = b;
    // @ts-expect-error - we want to use JS's native comparison, which doesn't depend on TS types
    if (keyA < keyB) {
      return -1;
    }
    // @ts-expect-error - we want to use JS's native comparison, which doesn't depend on TS types
    if (keyA > keyB) {
      return 1;
    }
    return 0;
  });

  return withKeys.map(([_, value]) => value);
}
