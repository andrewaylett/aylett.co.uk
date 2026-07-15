import { describe, expect, it } from '@jest/globals';

import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react';

import { analyseMatrix } from '@/client/qr/decoder/analyseMatrix';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';
import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';

const LEVELS: [ErrorCorrectionLevel, Ecc][] = [
  ['L', Ecc.LOW],
  ['M', Ecc.MEDIUM],
  ['Q', Ecc.QUARTILE],
  ['H', Ecc.HIGH],
];

const TEXT = 'HTTPS://WWW.AYLETT.CO.UK/TOOLS/QR/DEBUG?N=12345678';

function encode(version: number, ecl: Ecc): QrCode {
  const segs = QrSegment.makeSegments(TEXT, version);
  // boostEcl off so the requested level is what ends up in the symbol.
  return QrCode.encodeSegments(segs, ecl, version, version, -1, false);
}

function clone(m: readonly boolean[][]): boolean[][] {
  return m.map((row) => [...row]);
}

function transpose(m: readonly boolean[][]): boolean[][] {
  return m.map((row, y) => row.map((_, x) => m[x][y]));
}

/** Deterministically pick data-region module coordinates to corrupt.
 * Every block can correct at least three codeword errors (minimum ECC length
 * in the spec is 7), so flipping three modules is always within capacity. */
function pickDataModules(
  version: number,
  count: number,
): { x: number; y: number }[] {
  const regions = functionModuleMap(version);
  const picked: { x: number; y: number }[] = [];
  const size = version * 4 + 17;
  // Scan from the bottom-right, where the first data codewords live, spacing
  // picks out so they tend to land in different codewords.
  for (let y = size - 1; y >= 0 && picked.length < count; y -= 3) {
    for (let x = size - 1; x >= 0 && picked.length < count; x -= 5) {
      if (regions[y][x] === 'data') {
        picked.push({ x, y });
      }
    }
  }
  expect(picked).toHaveLength(count);
  return picked;
}

// v1 and v2 cannot hold the 50-char TEXT (byte mode); starting from v5 keeps
// coverage of the smallest practically relevant sizes while all ECL levels fit.
describe.each([5, 7, 10])('analyseMatrix at version %i', (version) => {
  describe.each(LEVELS)('level %s', (letter, ecc) => {
    it('decodes a clean matrix with full metadata and no corrections', () => {
      const qr = encode(version, ecc);
      const result = analyseMatrix(qr.getModules());
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      const { analysis } = result;
      expect(analysis.size).toBe(version * 4 + 17);
      expect(analysis.mirrored).toBe(false);
      expect(analysis.format.ecl).toBe(letter);
      expect(analysis.format.mask).toBe(qr.mask);
      expect(analysis.format.totalBitErrors).toBe(0);
      expect(analysis.version.version).toBe(version);
      expect(analysis.version.discrepancy).toBe(false);
      // Version info blocks only exist in the symbol from version 7 up.
      expect(analysis.version.decodedCopies === undefined).toBe(version < 7);
      expect(analysis.totalErrorsCorrected).toBe(0);
      expect(analysis.correctionFailed).toBe(false);
      expect(analysis.stream?.text).toBe(TEXT);
      expect(analysis.stream?.paddingConforms).toBe(true);
      expect(analysis.remainderBitsSet).toBe(0);
      expect(analysis.diffs).toEqual([]);
      expect(analysis.canonicalMatrix).toEqual(analysis.sampledMatrix);
    });

    it('corrects flipped data modules and reports exactly those in the diff', () => {
      const qr = encode(version, ecc);
      const damaged = clone(qr.getModules());
      const flips = pickDataModules(version, 3);
      for (const { x, y } of flips) {
        damaged[y][x] = !damaged[y][x];
      }
      const result = analyseMatrix(damaged);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      const { analysis } = result;
      expect(analysis.stream?.text).toBe(TEXT);
      expect(analysis.totalErrorsCorrected).toBeGreaterThanOrEqual(1);
      const diffCoords = analysis.diffs?.map(({ x, y }) => `${x},${y}`).sort();
      expect(diffCoords).toEqual(flips.map(({ x, y }) => `${x},${y}`).sort());
      for (const diff of analysis.diffs ?? []) {
        expect(['data', 'ecc']).toContain(diff.region);
      }
      // The canonical matrix must match the original, undamaged symbol.
      expect(analysis.canonicalMatrix).toEqual(qr.getModules());
    });
  });

  it('decodes a mirrored matrix and flags it', () => {
    const qr = encode(version, Ecc.MEDIUM);
    const result = analyseMatrix(transpose(qr.getModules()));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.mirrored).toBe(true);
    expect(result.analysis.stream?.text).toBe(TEXT);
  });
});

describe('analyseMatrix failure handling', () => {
  it('rejects matrices of invalid size', () => {
    const result = analyseMatrix(
      Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => false)),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.stage).toBe('extract');
  });

  it('reports a clean partial result when damage exceeds capacity', () => {
    const qr = encode(5, Ecc.LOW);
    const damaged = clone(qr.getModules());
    const regions = functionModuleMap(5);
    // Trash a whole band of the data area: far beyond what the symbol can correct.
    for (let y = 9; y <= 16; y++) {
      for (let x = 9; x <= 24; x++) {
        if (regions[y][x] === 'data') {
          damaged[y][x] = !damaged[y][x];
        }
      }
    }
    const result = analyseMatrix(damaged);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.stage).toBe('correction');
    expect(result.partial?.correctionFailed).toBe(true);
    expect(result.partial?.format?.ecl).toBe('L');
    expect(result.partial?.version?.version).toBe(5);
    expect(result.partial?.blocks?.some((b) => b.failed)).toBe(true);
  });

  it('fails at the format stage when format information is destroyed', () => {
    const qr = encode(5, Ecc.MEDIUM);
    const damaged = clone(qr.getModules());
    const size = damaged.length;

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
    // When a matrix is transposed, each format copy reads the bit-reversal of
    // the original copy's 15-bit value. Find a value that is Hamming distance
    // > 3 from all valid patterns AND whose 15-bit reversal is also > 3 from
    // all valid patterns, so both copies fail in BOTH orientations.
    const reverseBits15 = (n: number): number => {
      let r = 0;
      let v = n;
      for (let i = 0; i < 15; i++) {
        r = (r << 1) | (v & 1);
        v >>>= 1;
      }
      return r;
    };
    let badBits = -1;
    for (let bits = 0; bits < 0x80_00; bits++) {
      if (
        validPatterns.every((p) => bitCount(bits ^ p) > 3) &&
        validPatterns.every((p) => bitCount(reverseBits15(bits) ^ p) > 3)
      ) {
        badBits = bits;
        break;
      }
    }
    expect(badBits).toBeGreaterThan(-1);

    // Write badBits into both format copies so all four readings (copy 0 and
    // copy 1 in both normal and transposed orientations) produce bad patterns.
    // Copy 0: column 8 (rows 0-5, 7-8) then row 8 (cols 7, 5-0).
    for (let i = 0; i <= 5; i++) {
      damaged[i][8] = ((badBits >> i) & 1) === 1;
    }
    damaged[7][8] = ((badBits >> 6) & 1) === 1;
    damaged[8][8] = ((badBits >> 7) & 1) === 1;
    damaged[8][7] = ((badBits >> 8) & 1) === 1;
    for (let i = 9; i < 15; i++) {
      damaged[8][14 - i] = ((badBits >> i) & 1) === 1;
    }
    // Copy 1: row 8 (cols size-1..size-8) then column 8 (rows size-7..size-1).
    for (let i = 0; i < 8; i++) {
      damaged[8][size - 1 - i] = ((badBits >> i) & 1) === 1;
    }
    for (let i = 8; i < 15; i++) {
      damaged[size - 15 + i][8] = ((badBits >> i) & 1) === 1;
    }

    const result = analyseMatrix(damaged);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.stage).toBe('format');
  });
});
