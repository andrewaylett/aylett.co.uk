const sortBy = <P, Q>(array: P[], keyExtractor: (a: P) => Q): P[] =>
  array
    .map((entry): [Q, P] => [keyExtractor(entry), entry])
    .sort()
    .map(([_, entry]) => entry);

export default sortBy;
