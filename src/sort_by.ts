type Comparable = number | string | [Comparable]

const sort_by = <P>(array: P[], keyExtractor: (P) => Comparable): P[] =>
  array
    .map((entry): [Comparable, P] => [keyExtractor(entry), entry])
    .sort()
    .map(([_, entry]) => entry)

export default sort_by
