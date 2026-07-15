import { describe, expect, it } from '@jest/globals';

import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';
import {
  readFormatInfo,
  readVersionInfo,
} from '@/client/qr/decoder/formatInfo';

// Encodes at a fixed version/mask so the result is fully predictable.
function encode(
  text: string,
  ecl: Ecc,
  minVersion: number,
  maxVersion: number,
  mask: number,
): QrCode {
  return QrCode.encodeSegments(
    QrSegment.makeSegments(text),
    ecl,
    minVersion,
    maxVersion,
    mask,
    false, // boostEcl=false so ecl is preserved exactly
  );
}

describe('readFormatInfo', () => {
  const ECL_CASES: { ecl: Ecc; letter: 'L' | 'M' | 'Q' | 'H' }[] = [
    { ecl: Ecc.LOW, letter: 'L' },
    { ecl: Ecc.MEDIUM, letter: 'M' },
    { ecl: Ecc.QUARTILE, letter: 'Q' },
    { ecl: Ecc.HIGH, letter: 'H' },
  ];

  // Full matrix of ECL × mask — every combination must round-trip cleanly.
  for (const { ecl, letter } of ECL_CASES) {
    for (let mask = 0; mask < 8; mask++) {
      it(`round-trips ECL=${letter} mask=${mask}`, () => {
        const qr = encode('FORMAT TEST 123', ecl, 1, 40, mask);
        const report = readFormatInfo(qr.getModules());
        expect(report).not.toBeNull();
        expect(report?.ecl).toBe(letter);
        expect(report?.mask).toBe(mask);
        expect(report?.totalBitErrors).toBe(0);
      });
    }
  }

  it('corrects 1 flipped bit in copy 0 and reports bitErrors=1', () => {
    const qr = encode('FORMAT TEST 123', Ecc.LOW, 1, 40, 3);
    const m = qr.getModules().map((row) => [...row]);
    // Flip one known format module in copy 0: (x=8, y=0) which carries bit 0.
    m[0][8] = !m[0][8];
    const report = readFormatInfo(m);
    expect(report).not.toBeNull();
    expect(report?.ecl).toBe('L');
    expect(report?.mask).toBe(3);
    expect(report?.copies[0].bitErrors).toBe(1);
  });

  it('corrects 2 flipped bits in copy 0', () => {
    const qr = encode('FORMAT TEST 123', Ecc.MEDIUM, 1, 40, 5);
    const m = qr.getModules().map((row) => [...row]);
    m[0][8] = !m[0][8];
    m[1][8] = !m[1][8];
    const report = readFormatInfo(m);
    expect(report).not.toBeNull();
    expect(report?.ecl).toBe('M');
    expect(report?.mask).toBe(5);
  });

  it('corrects 3 flipped bits in copy 0', () => {
    const qr = encode('FORMAT TEST 123', Ecc.QUARTILE, 1, 40, 2);
    const m = qr.getModules().map((row) => [...row]);
    m[0][8] = !m[0][8];
    m[1][8] = !m[1][8];
    m[2][8] = !m[2][8];
    const report = readFormatInfo(m);
    expect(report).not.toBeNull();
    expect(report?.ecl).toBe('Q');
    expect(report?.mask).toBe(2);
    expect(report?.copies[0].bitErrors).toBe(3);
  });

  it('returns null when both format copies are more than 3 bit errors from any valid codeword', () => {
    // Precompute all 32 valid masked patterns (same BCH logic as the implementation).
    const validPatterns: number[] = [];
    for (const ecc of [Ecc.LOW, Ecc.MEDIUM, Ecc.QUARTILE, Ecc.HIGH]) {
      for (let mask = 0; mask < 8; mask++) {
        const data = (ecc.formatBits << 3) | mask;
        let rem = data;
        for (let i = 0; i < 10; i++) {
          rem = (rem << 1) ^ ((rem >>> 9) * 0x5_37);
        }
        validPatterns.push(((data << 10) | rem) ^ 0x54_12);
      }
    }
    const bitCount = (n: number): number => {
      let c = 0;
      let v = n;
      while (v !== 0) {
        c += v & 1;
        v >>>= 1;
      }
      return c;
    };
    // Find a 15-bit value guaranteed to be Hamming distance > 3 from every
    // valid pattern. 14336 of the 32768 possible values satisfy this, so the
    // search always terminates quickly.
    let badBits = -1;
    for (let bits = 0; bits < 0x80_00; bits++) {
      if (validPatterns.every((p) => bitCount(bits ^ p) > 3)) {
        badBits = bits;
        break;
      }
    }
    expect(badBits).toBeGreaterThan(-1);

    // Build a 21×21 all-false matrix and write badBits into both format copies,
    // mirroring the bit positions read by readCopy0 and readCopy1.
    const size = 21;
    const m: boolean[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false),
    );
    // Copy 0: column 8 (rows 0-5, 7-8) then row 8 (cols 7, 5-0).
    for (let i = 0; i <= 5; i++) {
      m[i][8] = ((badBits >> i) & 1) === 1;
    }
    m[7][8] = ((badBits >> 6) & 1) === 1;
    m[8][8] = ((badBits >> 7) & 1) === 1;
    m[8][7] = ((badBits >> 8) & 1) === 1;
    for (let i = 9; i < 15; i++) {
      m[8][14 - i] = ((badBits >> i) & 1) === 1;
    }
    // Copy 1: row 8 (cols size-1..size-8) then column 8 (rows size-7..size-1).
    for (let i = 0; i < 8; i++) {
      m[8][size - 1 - i] = ((badBits >> i) & 1) === 1;
    }
    for (let i = 8; i < 15; i++) {
      m[size - 15 + i][8] = ((badBits >> i) & 1) === 1;
    }

    expect(readFormatInfo(m)).toBeNull();
  });
});

describe('readVersionInfo', () => {
  it('version 1 has no decodedCopies and no discrepancy', () => {
    const qr = encode('V1', Ecc.LOW, 1, 1, 0);
    expect(qr.version).toBe(1);
    const report = readVersionInfo(qr.getModules());
    expect(report.version).toBe(1);
    expect(report.decodedCopies).toBeUndefined();
    expect(report.discrepancy).toBe(false);
  });

  it('version 7 decodes with bitErrors=0 and no discrepancy', () => {
    const qr = encode('VERSION 7 TEST STRING ABCDEFGH', Ecc.LOW, 7, 7, 0);
    expect(qr.version).toBe(7);
    const report = readVersionInfo(qr.getModules());
    expect(report.version).toBe(7);
    expect(report.decodedCopies).toBeDefined();
    expect(report.decodedCopies?.[0].bitErrors).toBe(0);
    expect(report.decodedCopies?.[1].bitErrors).toBe(0);
    expect(report.discrepancy).toBe(false);
  });

  it('version 10 decodes with bitErrors=0 and no discrepancy', () => {
    const qr = encode(
      'VERSION 10 TEST STRING ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      Ecc.LOW,
      10,
      10,
      0,
    );
    expect(qr.version).toBe(10);
    const report = readVersionInfo(qr.getModules());
    expect(report.version).toBe(10);
    expect(report.decodedCopies).toBeDefined();
    expect(report.decodedCopies?.[0].bitErrors).toBe(0);
    expect(report.decodedCopies?.[1].bitErrors).toBe(0);
    expect(report.discrepancy).toBe(false);
  });
});
