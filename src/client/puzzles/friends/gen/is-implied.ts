// A is implied by B if you'd necessarily find A when B is traceable on the board.
// Since edges are undirected, any subpath can be traversed in reverse, so A is
// implied if A (or A reversed) is a contiguous substring of B.
export function isImplied(a: string, b: string): boolean {
  if (a.length >= b.length) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  const rev = [...a].reverse().join('');
  return b.includes(a) || b.includes(rev);
}
