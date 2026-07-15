import { describe, expect, it } from '@jest/globals';

import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';
import {
  extractCodewords,
  deinterleave,
  getBlockStructure,
} from '@/client/qr/decoder/codewords';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';

// Encodes at a fixed version and mask so the result is deterministic.
function encode(text: string, ecl: Ecc, version: number, mask: number): QrCode {
  return QrCode.encodeSegments(
    QrSegment.makeSegments(text),
    ecl,
    version,
    version,
    mask,
    false, // boostEcl=false
  );
}

// GF(2^8) arithmetic for Reed–Solomon verification, mirroring qrCode.ts.
function rsMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x1_1d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsComputeDivisor(degree: number): number[] {
  const result: number[] = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = rsMultiply(result[j], root);
      if (j + 1 < result.length) {
        result[j] ^= result[j + 1];
      }
    }
    root = rsMultiply(root, 0x02);
  }
  return result;
}

function rsComputeRemainder(data: Uint8Array, divisor: number[]): number[] {
  const result: number[] = Array.from({ length: divisor.length }, () => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() ?? 0);
    result.push(0);
    for (const [i, coef] of divisor.entries()) {
      result[i] ^= rsMultiply(coef, factor);
    }
  }
  return result;
}

describe('getBlockStructure', () => {
  it('totalCodewords matches getNumRawDataModules / 8', () => {
    for (const [ver, ecl] of [
      [1, Ecc.LOW],
      [5, Ecc.QUARTILE],
      [7, Ecc.HIGH],
      [10, Ecc.LOW],
    ] as [number, Ecc][]) {
      const structure = getBlockStructure(ver, ecl);
      const expected = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
      expect(structure.totalCodewords).toBe(expected);
    }
  });
});

describe('extractCodewords + deinterleave round-trip', () => {
  const CASES: [number, Ecc, number][] = [
    [1, Ecc.LOW, 3],
    [1, Ecc.HIGH, 2],
    [5, Ecc.LOW, 0],
    [5, Ecc.QUARTILE, 1],
    [7, Ecc.LOW, 4],
    [7, Ecc.HIGH, 5],
    [10, Ecc.LOW, 6],
    [10, Ecc.QUARTILE, 7],
    [10, Ecc.HIGH, 0],
  ];

  // Generates a string long enough to fill the chosen version at HIGH ecl.
  function payloadFor(version: number): string {
    // 7 alphanumeric chars per version fits all ECL levels, including the
    // tightest (v1-H alphanumeric capacity is 7).
    const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    while (s.length < version * 7) {
      s += base;
    }
    return s.slice(0, version * 7);
  }

  for (const [version, ecl, mask] of CASES) {
    const eclName =
      ecl === Ecc.LOW
        ? 'L'
        : ecl === Ecc.MEDIUM
          ? 'M'
          : ecl === Ecc.QUARTILE
            ? 'Q'
            : 'H';
    it(`v${version} ECL=${eclName} mask=${mask}: bitModules in-bounds and all 'data'`, () => {
      const qr = encode(payloadFor(version), ecl, version, mask);
      const modules = qr.getModules();
      const { bitModules, codewords } = extractCodewords(
        modules,
        version,
        mask,
      );
      const structure = getBlockStructure(version, ecl);
      const fmap = functionModuleMap(version);
      const size = modules.length;

      expect(bitModules).toHaveLength(structure.totalCodewords * 8);

      // All coordinates must be distinct.
      const seen = new Set<string>();
      for (const { x, y } of bitModules) {
        const key = `${x},${y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        // In-bounds.
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(size);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(size);
        // Classified as data.
        expect(fmap[y][x]).toBe('data');
      }

      expect(codewords).toHaveLength(structure.totalCodewords);
    });

    it(`v${version} ECL=${eclName} mask=${mask}: remainderBitsSet=0`, () => {
      const qr = encode(payloadFor(version), ecl, version, mask);
      const { remainderBitsSet } = extractCodewords(
        qr.getModules(),
        version,
        mask,
      );
      expect(remainderBitsSet).toBe(0);
    });

    it(`v${version} ECL=${eclName} mask=${mask}: ECC matches RS remainder of data`, () => {
      const qr = encode(payloadFor(version), ecl, version, mask);
      const { codewords } = extractCodewords(qr.getModules(), version, mask);
      const structure = getBlockStructure(version, ecl);
      const { blocks } = deinterleave(codewords, structure);

      const divisor = rsComputeDivisor(structure.blocks[0].eccLen);
      for (const [i, block] of blocks.entries()) {
        const dataLen = structure.blocks[i].dataLen;
        const eccLen = structure.blocks[i].eccLen;
        const data = block.slice(0, dataLen);
        const ecc = block.slice(dataLen, dataLen + eccLen);
        const expected = rsComputeRemainder(data, divisor);
        expect([...ecc]).toEqual(expected);
      }
    });

    it(`v${version} ECL=${eclName} mask=${mask}: data concatenation round-trips through QrCode constructor`, () => {
      const text = payloadFor(version);
      const qr = encode(text, ecl, version, mask);
      const { codewords } = extractCodewords(qr.getModules(), version, mask);
      const structure = getBlockStructure(version, ecl);
      const { blocks } = deinterleave(codewords, structure);

      // Concatenate just the data portions of all blocks.
      const dataParts: number[] = [];
      for (const [i, block] of blocks.entries()) {
        const dataLen = structure.blocks[i].dataLen;
        for (let j = 0; j < dataLen; j++) {
          dataParts.push(block[j]);
        }
      }

      // Re-encode using the low-level constructor — should produce identical matrix.
      const rebuilt = new QrCode(version, ecl, dataParts, mask);
      const originalModules = qr.getModules();
      const rebuiltModules = rebuilt.getModules();
      expect(rebuiltModules).toEqual(originalModules);
    });
  }
});
