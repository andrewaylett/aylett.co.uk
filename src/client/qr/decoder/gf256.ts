/*
 * GF(2^8) arithmetic over the reducing polynomial 0x11D, the same field
 * used by QR code Reed–Solomon.  Generator element α = 0x02.
 *
 * Tables are built once at module load.  The exp table is doubled to 512
 * entries so that gfMul can index exp[log[a] + log[b]] without a modulo.
 */

// α = 0x02 is the generator element of GF(2^8) / reducing polynomial 0x11D.
// The exp table is indexed by power (doubled to 512 entries to avoid mod in gfMul).
const EXP_SIZE = 512;
const FIELD_SIZE = 256;
const PRIMITIVE = 0x1_1d;

const expTable = new Uint8Array(EXP_SIZE);
const logTable = new Uint8Array(FIELD_SIZE);

(function buildTables() {
  // x walks through successive powers of α (= 0x02): multiply by 2 each step.
  let x = 1; // α^0 = 1
  for (let i = 0; i < 255; i++) {
    expTable[i] = x;
    expTable[i + 255] = x; // second copy avoids mod in gfMul
    logTable[x] = i;
    x = x << 1 >= FIELD_SIZE ? (x << 1) ^ PRIMITIVE : x << 1;
  }
  // expTable[255] wraps back to α^0 = 1; the second copy covers [255..509].
  // logTable[0] is undefined (log of 0 does not exist in GF(2^8)).
})();

/** α^power in GF(2^8).  Accepts any non-negative integer. */
export function gfExp(power: number): number {
  return expTable[power % 255];
}

/**
 * Discrete logarithm base α in GF(2^8).
 * Throws RangeError for a = 0, which has no logarithm.
 */
export function gfLog(a: number): number {
  if (a === 0) {
    throw new RangeError('gfLog: logarithm of zero is undefined');
  }
  return logTable[a];
}

/** Multiply two elements of GF(2^8). */
export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return expTable[logTable[a] + logTable[b]];
}

/**
 * Divide two elements of GF(2^8).
 * Throws RangeError when dividing by zero.
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) {
    throw new RangeError('gfDiv: division by zero');
  }
  if (a === 0) {
    return 0;
  }
  // a/b = α^(log a − log b); the + 255 keeps the index non-negative.
  return expTable[(logTable[a] + 255 - logTable[b]) % 255];
}

/**
 * Evaluate a polynomial at a field element using Horner's method.
 * poly[0] is the coefficient of the HIGHEST-degree term, matching QR
 * codeword order (most-significant coefficient first).
 */
export function polyEval(poly: Iterable<number>, x: number): number {
  let result = 0;
  for (const element of poly) {
    result = gfMul(result, x) ^ (element & 0xff);
  }
  return result;
}
