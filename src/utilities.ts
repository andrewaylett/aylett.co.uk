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

/**
 * RFC 3986 allows:
 *   pchar = unreserved / pct-encoded / sub-delims / ":" / "@"
 *   query = *( pchar / "/" / "?" )
 * So we replace everything else with its percent-encoded value.
 * @param component
 */
export function encodeQueryComponent(component: string): string {
  return component.replaceAll(/[^a-zA-Z0-9:@/?]/g, (c) => {
    const codePoint = c.codePointAt(0);
    return codePoint ? `%${codePoint.toString(16).toUpperCase()}` : c;
  });
}

/** Returns a GitHub URL pointing to the commit history for a given page's markdown source. */
export const gitHubUrl = (pageName: string): string =>
  `https://github.com/andrewaylett/aylett.co.uk/commits/main/md${pageName.replace(
    /#.*/,
    '',
  )}.md`;

/** Sorts an array by an async-derived key, resolving all keys in parallel before sorting. */
export async function asyncSortByKey<T, K>(
  input: T[],
  keyExtractor: (v: T) => PromiseLike<K>,
): Promise<T[]> {
  const withKeys = await Promise.all(
    input.map(
      async (item): Promise<[Awaited<K>, T]> => [
        await keyExtractor(item),
        item,
      ],
    ),
  );

  withKeys.sort();

  return withKeys.map(([_, value]) => value);
}
