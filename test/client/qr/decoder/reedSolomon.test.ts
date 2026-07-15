import { describe, expect, it } from '@jest/globals';

import { gfExp, gfMul } from '@/client/qr/decoder/gf256';
import { rsDecode } from '@/client/qr/decoder/reedSolomon';

// ---------------------------------------------------------------------------
// Test-local RS encoder, mirroring qrCode.ts reedSolomonComputeDivisor and
// reedSolomonComputeRemainder exactly (see src/client/qr/thirdparty/qrcodegen/qrCode.ts).
//
// Generator polynomial g(x) = ∏_{i=0}^{eccLen-1} (x − α^i), stored
// highest-degree first (index 0 is coefficient of x^{eccLen-1}).
// ---------------------------------------------------------------------------

function computeDivisor(eccLen: number): Uint8Array {
  const result = new Uint8Array(eccLen);
  result[eccLen - 1] = 1; // start as x^0 = constant 1
  let root = 1;
  for (let i = 0; i < eccLen; i++) {
    for (let j = 0; j < eccLen; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < eccLen) {
        result[j] ^= result[j + 1];
      }
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function computeRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[divisor.length - 1] = 0;
    for (const [i, coef] of divisor.entries()) {
      result[i] ^= gfMul(coef, factor);
    }
  }
  return result;
}

/** Build a full codeword: data bytes followed by RS ECC bytes. */
function encode(data: Uint8Array, eccLen: number): Uint8Array {
  const divisor = computeDivisor(eccLen);
  const remainder = computeRemainder(data, divisor);
  const out = new Uint8Array(data.length + eccLen);
  out.set(data);
  out.set(remainder, data.length);
  return out;
}

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32.  Deterministic; no flakiness.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    // Math.imul(1, x) truncates to a 32-bit signed integer — same as x | 0.
    s = Math.imul(1, s + 0x6d_2b_79_f5);
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Choose k distinct indices from 0..n-1 using the supplied PRNG.
 * Fisher–Yates on a short prefix to remain deterministic.
 */
function pickDistinct(n: number, k: number, rand: () => number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, k).sort((a, b) => a - b);
}

/** Non-zero random byte (non-zero XOR means the corrupt byte definitely changes). */
function nonZeroByte(rand: () => number): number {
  return (Math.floor(rand() * 255) + 1) & 0xff;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const ECC_LENGTHS = [7, 10, 16, 22, 30] as const;

describe('rsDecode — clean codewords', () => {
  for (const eccLen of ECC_LENGTHS) {
    it(`returns zero corrections for eccLen=${eccLen}`, () => {
      const data = Uint8Array.from(
        { length: 10 },
        (_, i) => (i * 37 + 13) & 0xff,
      );
      const block = encode(data, eccLen);
      const result = rsDecode(block, eccLen);
      expect(result).not.toBeNull();
      if (result === null) {
        return;
      }
      expect(result.errorPositions).toHaveLength(0);
      expect(result.corrected).toEqual(block);
    });
  }
});

describe('rsDecode — correctable errors', () => {
  for (const eccLen of ECC_LENGTHS) {
    const capacity = Math.floor(eccLen / 2);
    for (let k = 1; k <= capacity; k++) {
      it(`eccLen=${eccLen}, k=${k} errors: corrects and reports positions`, () => {
        const seed = eccLen * 1000 + k;
        const rand = mulberry32(seed);
        const dataLen = 10 + eccLen; // longer than eccLen to exercise data-region errors
        const data = Uint8Array.from({ length: dataLen }, () =>
          Math.floor(rand() * 256),
        );
        const block = encode(data, eccLen);
        const n = block.length;

        // Corrupt k distinct positions with non-zero XOR masks.
        const positions = pickDistinct(n, k, rand);
        const corrupted = new Uint8Array(block);
        for (const pos of positions) {
          corrupted[pos] ^= nonZeroByte(rand);
        }

        const result = rsDecode(corrupted, eccLen);
        expect(result).not.toBeNull();
        if (result === null) {
          return;
        }
        expect(result.corrected).toEqual(block);
        expect([...result.errorPositions].sort((a, b) => a - b)).toEqual(
          positions,
        );
      });
    }
  }
});

describe('rsDecode — over-capacity errors return null', () => {
  for (const eccLen of ECC_LENGTHS) {
    const capacity = Math.floor(eccLen / 2);
    const overcapacity = capacity + 1;

    // Two seeds per eccLen to reduce the chance of landing on a valid codeword.
    // The recompute-syndromes guard handles stray valid codewords, but two seeds
    // give extra confidence with no test-count overhead.
    for (const seed of [eccLen * 7919 + 1, eccLen * 6571 + 2]) {
      it(`eccLen=${eccLen}, ${overcapacity} errors (seed=${seed}): returns null`, () => {
        const rand = mulberry32(seed);
        const dataLen = 10 + eccLen;
        const data = Uint8Array.from({ length: dataLen }, () =>
          Math.floor(rand() * 256),
        );
        const block = encode(data, eccLen);
        const n = block.length;

        const positions = pickDistinct(n, overcapacity, rand);
        const corrupted = new Uint8Array(block);
        for (const pos of positions) {
          corrupted[pos] ^= nonZeroByte(rand);
        }

        expect(rsDecode(corrupted, eccLen)).toBeNull();
      });
    }
  }
});

describe('rsDecode — asymmetric position check', () => {
  // These three tests pin the index-to-locator mapping.  A mirrored mapping
  // would swap index 0 with index n-1 and pass symmetric tests but fail here.

  it('correctly identifies index 0 as corrupted (not n-1)', () => {
    const eccLen = 10;
    const data = Uint8Array.from({ length: 8 }, (_, i) => i + 1);
    const block = encode(data, eccLen);
    const corrupted = new Uint8Array(block);
    corrupted[0] ^= 0x42;
    const result = rsDecode(corrupted, eccLen);
    expect(result).not.toBeNull();
    if (result === null) {
      return;
    }
    expect(result.errorPositions).toEqual([0]);
    expect(result.corrected).toEqual(block);
  });

  it('correctly identifies index n-1 as corrupted (not index 0)', () => {
    const eccLen = 10;
    const data = Uint8Array.from({ length: 8 }, (_, i) => i + 1);
    const block = encode(data, eccLen);
    const n = block.length;
    const corrupted = new Uint8Array(block);
    corrupted[n - 1] ^= 0x17;
    const result = rsDecode(corrupted, eccLen);
    expect(result).not.toBeNull();
    if (result === null) {
      return;
    }
    expect(result.errorPositions).toEqual([n - 1]);
    expect(result.corrected).toEqual(block);
  });

  it('distinguishes index 1 from index 0', () => {
    const eccLen = 10;
    const data = Uint8Array.from({ length: 8 }, (_, i) => i * 17 + 5);
    const block = encode(data, eccLen);
    const corrupted = new Uint8Array(block);
    corrupted[1] ^= 0xff;
    const result = rsDecode(corrupted, eccLen);
    expect(result).not.toBeNull();
    if (result === null) {
      return;
    }
    expect(result.errorPositions).toEqual([1]);
  });
});

describe('rsDecode — syndrome-clean baseline', () => {
  it('clean encode has all-zero syndromes (confirmed by zero-correction decode)', () => {
    // If syndromes were non-zero on a clean codeword, rsDecode would attempt
    // corrections and either miscorrect or return null.
    for (const eccLen of ECC_LENGTHS) {
      const data = Uint8Array.from({ length: 5 }, (_, i) => i + 1);
      const block = encode(data, eccLen);
      const result = rsDecode(block, eccLen);
      expect(result).not.toBeNull();
      if (result === null) {
        continue;
      }
      expect(result.errorPositions).toHaveLength(0);
    }
  });
});

describe('rsDecode — single-error convention pin', () => {
  // For b=0, a single error at index j with magnitude e gives S_0=e, S_1=e·X,
  // so X = S_1/S_0.  Correcting every position confirms both the b=0 Forney
  // factor (X_k^1) and the locator-to-index mapping are right.
  it('corrects every single-byte error position for eccLen=10, dataLen=5', () => {
    const eccLen = 10;
    const data = Uint8Array.from([0x12, 0x34, 0x56, 0x78, 0x9a]);
    const block = encode(data, eccLen);
    for (let j = 0; j < block.length; j++) {
      const corrupted = new Uint8Array(block);
      corrupted[j] ^= gfExp((j % 254) + 1); // non-zero, varies by position
      const result = rsDecode(corrupted, eccLen);
      expect(result).not.toBeNull();
      if (result === null) {
        continue;
      }
      expect(result.corrected).toEqual(block);
      expect(result.errorPositions).toEqual([j]);
    }
  });
});
