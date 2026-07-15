import { describe, expect, it } from '@jest/globals';

import {
  gfDiv,
  gfExp,
  gfLog,
  gfMul,
  polyEval,
} from '@/client/qr/decoder/gf256';

// Russian-peasant multiplication reimplemented locally as a reference to
// cross-check gfMul without depending on the impl under test.
function refMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x1_1d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

describe('gfExp / gfLog', () => {
  it('satisfies log(exp(i)) === i for all i in 0..254', () => {
    for (let i = 0; i < 255; i++) {
      expect(gfLog(gfExp(i))).toBe(i);
    }
  });

  it('satisfies exp(log(a)) === a for all non-zero a in 1..255', () => {
    for (let a = 1; a < 256; a++) {
      expect(gfExp(gfLog(a))).toBe(a);
    }
  });

  it('gfExp is periodic with period 255', () => {
    for (let i = 0; i < 255; i++) {
      expect(gfExp(i + 255)).toBe(gfExp(i));
    }
  });

  it('gfLog throws RangeError for zero', () => {
    expect(() => gfLog(0)).toThrow(RangeError);
  });

  it('α^0 = 1 and α^1 = 2', () => {
    expect(gfExp(0)).toBe(1);
    expect(gfExp(1)).toBe(2);
  });
});

describe('gfMul', () => {
  it('matches the Russian-peasant reference for all pairs of two representative values', () => {
    // Check a representative sample rather than all 256×256 — enough to
    // expose any table-index bug while keeping the test fast.
    const samples = [0, 1, 2, 3, 0x02, 0x1d, 0x7f, 0x80, 0xfe, 0xff];
    for (const a of samples) {
      for (const b of samples) {
        expect(gfMul(a, b)).toBe(refMul(a, b));
      }
    }
  });

  it('matches the reference for every element multiplied by the generator', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 2)).toBe(refMul(a, 2));
    }
  });

  it('is commutative', () => {
    expect(gfMul(0x12, 0x34)).toBe(gfMul(0x34, 0x12));
  });

  it('has multiplicative identity 1', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 1)).toBe(a);
    }
  });

  it('anything times 0 is 0', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 0)).toBe(0);
    }
  });
});

describe('gfDiv', () => {
  it('throws RangeError when dividing by zero', () => {
    expect(() => gfDiv(1, 0)).toThrow(RangeError);
    expect(() => gfDiv(0, 0)).toThrow(RangeError);
  });

  it('a / a === 1 for all non-zero a', () => {
    for (let a = 1; a < 256; a++) {
      expect(gfDiv(a, a)).toBe(1);
    }
  });

  it('(a * b) / b === a for non-zero b', () => {
    const pairs: [number, number][] = [
      [0x02, 0x03],
      [0x7f, 0x80],
      [0xff, 0x12],
      [1, 0xfe],
    ];
    for (const [a, b] of pairs) {
      expect(gfDiv(gfMul(a, b), b)).toBe(a);
    }
  });

  it('0 / b === 0 for non-zero b', () => {
    expect(gfDiv(0, 0x42)).toBe(0);
  });
});

describe('polyEval', () => {
  it('evaluates constant polynomial', () => {
    // poly = [5] represents the constant 5
    expect(polyEval([5], 0x02)).toBe(5);
    expect(polyEval([5], 0)).toBe(5);
  });

  it('evaluates linear polynomial x + 1 at x=1: result should be 1^1 = 0', () => {
    // poly = [1, 1] represents x + 1; in GF(2), 1+1=0
    expect(polyEval([1, 1], 1)).toBe(0);
  });

  it('evaluates linear polynomial 2x + 3 at x=0: result should be 3', () => {
    // poly[0]=2 (highest degree), poly[1]=3 (constant)
    expect(polyEval([2, 3], 0)).toBe(3);
  });

  it('poly[0] is highest-degree: x^2 at x=2 equals 4 in GF(2^8)', () => {
    // poly = [1, 0, 0] represents x^2; 2^2 = 4 in GF(2^8)
    expect(polyEval([1, 0, 0], 2)).toBe(4);
  });

  it('empty polynomial evaluates to 0', () => {
    expect(polyEval([], 0x42)).toBe(0);
  });

  it('matches manual Horner evaluation for a concrete case', () => {
    // poly = [3, 5, 7] represents 3x^2 + 5x + 7
    // at x=2: gfMul(gfMul(3,2)^5, 2) ^ 7
    const x = 2;
    const manual = gfMul(gfMul(3, x) ^ 5, x) ^ 7;
    expect(polyEval([3, 5, 7], x)).toBe(manual);
  });
});
