/*
 * Reads and validates the two copies of QR format information.
 *
 * The encoder XORs the 15-bit BCH-protected field with 0x5412 before writing.
 * We enumerate all 32 valid pre-XOR'd patterns, find the nearest match for
 * each copy, and pick whichever copy has fewer bit errors.
 */

import type {
  FormatCopy,
  FormatReport,
  VersionReport,
} from '@/client/qr/decoder/types';
import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react';

import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';

// Maps the 2-bit formatBits field → ErrorCorrectionLevel string.
// Ecc formatBits: LOW=1, MEDIUM=0, QUARTILE=3, HIGH=2.
const FORMAT_BITS_TO_ECL: Record<number, ErrorCorrectionLevel> = {
  1: 'L',
  0: 'M',
  3: 'Q',
  2: 'H',
};

// Precomputes all 32 valid masked 15-bit patterns, keyed by (ecl ordinal, mask).
// Mirrors drawFormatBits exactly: data = (formatBits << 3) | mask, BCH, XOR 0x5412.
function buildFormatTable(): {
  masked: number;
  eclBits: number;
  mask: number;
}[] {
  const table: { masked: number; eclBits: number; mask: number }[] = [];
  for (const ecl of [Ecc.LOW, Ecc.MEDIUM, Ecc.QUARTILE, Ecc.HIGH]) {
    for (let mask = 0; mask < 8; mask++) {
      const data = (ecl.formatBits << 3) | mask;
      let rem = data;
      for (let i = 0; i < 10; i++) {
        rem = (rem << 1) ^ ((rem >>> 9) * 0x5_37);
      }
      const bits = ((data << 10) | rem) ^ 0x54_12;
      table.push({ masked: bits, eclBits: ecl.formatBits, mask });
    }
  }
  return table;
}

const FORMAT_TABLE = buildFormatTable();

function hammingDistance(a: number, b: number): number {
  let diff = a ^ b;
  let count = 0;
  while (diff !== 0) {
    count += diff & 1;
    diff >>>= 1;
  }
  return count;
}

/** Reads the 15-bit format word from copy 0 (top-left area). */
function readCopy0(m: boolean[][]): number {
  const size = m.length;
  void size; // used implicitly via m indexing
  let bits = 0;
  // Mirrors the write loop in drawFormatBits copy 1:
  //   i=0..5 → (x=8, y=i)  = bit i
  //   i=6    → (x=8, y=7)  = bit 6
  //   i=7    → (x=8, y=8)  = bit 7
  //   i=8    → (x=7, y=8)  = bit 8
  //   i=9..14 → (x=14-i, y=8) = bits 9..14
  for (let i = 0; i <= 5; i++) {
    if (m[i][8]) {
      bits |= 1 << i;
    }
  }
  if (m[7][8]) {
    bits |= 1 << 6;
  }
  if (m[8][8]) {
    bits |= 1 << 7;
  }
  if (m[8][7]) {
    bits |= 1 << 8;
  }
  for (let i = 9; i < 15; i++) {
    if (m[8][14 - i]) {
      bits |= 1 << i;
    }
  }
  return bits;
}

/** Reads the 15-bit format word from copy 1 (top-right + bottom-left). */
function readCopy1(m: boolean[][]): number {
  const size = m.length;
  let bits = 0;
  // Mirrors the write loop in drawFormatBits copy 2:
  //   i=0..7  → (x=size-1-i, y=8)   = bits 0..7
  //   i=8..14 → (x=8, y=size-15+i)  = bits 8..14
  for (let i = 0; i < 8; i++) {
    if (m[8][size - 1 - i]) {
      bits |= 1 << i;
    }
  }
  for (let i = 8; i < 15; i++) {
    if (m[size - 15 + i][8]) {
      bits |= 1 << i;
    }
  }
  return bits;
}

/**
 * Reads both 15-bit format information copies and returns the decoded ECL and
 * mask, with per-copy error counts.  Returns null if the best candidate across
 * both copies has a Hamming distance greater than 3.
 */
export function readFormatInfo(m: boolean[][]): FormatReport | null {
  const raw0 = readCopy0(m);
  const raw1 = readCopy1(m);

  // Find the best-matching candidate for each copy independently.
  let best0 = { dist: 16, entry: FORMAT_TABLE[0] };
  let best1 = { dist: 16, entry: FORMAT_TABLE[0] };

  for (const entry of FORMAT_TABLE) {
    const d0 = hammingDistance(raw0, entry.masked);
    const d1 = hammingDistance(raw1, entry.masked);
    if (d0 < best0.dist) {
      best0 = { dist: d0, entry };
    }
    if (d1 < best1.dist) {
      best1 = { dist: d1, entry };
    }
  }

  // Both copies failed: no trustworthy reading.
  if (best0.dist > 3 && best1.dist > 3) {
    return null;
  }

  // Choose the copy with fewer errors; prefer copy 0 on a tie.
  const chosen = best0.dist <= best1.dist ? best0 : best1;

  const copy0: FormatCopy = { rawBits: raw0, bitErrors: best0.dist };
  const copy1: FormatCopy = { rawBits: raw1, bitErrors: best1.dist };

  // The rawBits field is documented as "after the 0x5412 unmasking XOR" in
  // types.ts, so we store the XOR'd value regardless of which copy we choose.
  // (Hamming distance is XOR-invariant so bitErrors is computed either way.)

  const eclBits = chosen.entry.eclBits;
  const ecl: ErrorCorrectionLevel = FORMAT_BITS_TO_ECL[eclBits] ?? 'L';

  return {
    ecl,
    mask: chosen.entry.mask,
    copies: [copy0, copy1],
    totalBitErrors: chosen.dist,
  };
}

/** Computes the 18-bit version codeword for a given version number. */
function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f_25);
  }
  return (version << 12) | rem;
}

/**
 * Derives the version from the matrix size and, for v7+, also reads and
 * validates the two 18-bit version information blocks.
 */
export function readVersionInfo(m: boolean[][]): VersionReport {
  const size = m.length;
  const version = (size - 17) / 4;

  if (version < 7) {
    return { version, discrepancy: false };
  }

  // Read both 18-bit blocks using the same (a, b) coordinates as drawVersion.
  // Copy 1: setFunctionModule(a, b, ...) → x=a, y=b.
  // Copy 2: setFunctionModule(b, a, ...) → x=b, y=a.
  let bits0 = 0; // copy 1: x=a, y=b
  let bits1 = 0; // copy 2: x=b, y=a
  for (let i = 0; i < 18; i++) {
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    if (m[b][a]) {
      bits0 |= 1 << i;
    } // y=b, x=a
    if (m[a][b]) {
      bits1 |= 1 << i;
    } // y=a, x=b
  }

  // Validate against the size-derived version's codeword.
  const expectedBits = versionBits(version);
  const dist0 = hammingDistance(bits0, expectedBits);
  const dist1 = hammingDistance(bits1, expectedBits);

  // Check whether either copy, corrected, implies a different version.
  let discrepancy = false;
  for (let v = 7; v <= 40; v++) {
    const codeword = versionBits(v);
    const d0 = hammingDistance(bits0, codeword);
    const d1 = hammingDistance(bits1, codeword);
    if (v !== version && (d0 <= 3 || d1 <= 3)) {
      discrepancy = true;
      break;
    }
  }

  return {
    version,
    decodedCopies: [
      { rawBits: bits0, bitErrors: dist0 },
      { rawBits: bits1, bitErrors: dist1 },
    ],
    discrepancy,
  };
}
