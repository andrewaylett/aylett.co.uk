export async function asyncSortByKey<T, K>(
  input: T[],
  keyExtractor: (v: T) => PromiseLike<K>
): Promise<T[]> {
  const withKeys = await Promise.all(
    input.map(
      async (item): Promise<[Awaited<K>, T]> => [await keyExtractor(item), item]
    )
  );

  withKeys.sort();

  return withKeys.map(([_, value]) => value);
}
