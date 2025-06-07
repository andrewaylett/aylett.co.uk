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
  return component.replaceAll(
    /[^a-zA-Z0-9:@/?]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export const gitHubUrl = (pageName: string): string =>
  `https://github.com/andrewaylett/aylett.co.uk/commits/main/src/pages${pageName.replace(
    /#.*/,
    '',
  )}.md`;

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
