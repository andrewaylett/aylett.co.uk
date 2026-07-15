/*
 * Extracts and de-interleaves codewords from a QR matrix.
 *
 * The encoder writes codewords in a specific zigzag order and interleaves
 * blocks from multiple Reed–Solomon groups.  This module reverses both
 * operations, yielding per-block codeword arrays ready for RS decoding.
 */

import type { Point } from '@/client/qr/decoder/types';
import type { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';

import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';

export interface BlockStructure {
  blocks: { dataLen: number; eccLen: number }[];
  totalCodewords: number;
}

/**
 * Returns the block layout for a given version and ECL, mirroring
 * addEccAndInterleave's parameter calculations.
 */
export function getBlockStructure(version: number, ecl: Ecc): BlockStructure {
  const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][version];
  const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][version];
  const rawCodewords = Math.floor(QrCode.getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: { dataLen: number; eccLen: number }[] = [];
  for (let i = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    blocks.push({ dataLen, eccLen: blockEccLen });
  }

  return { blocks, totalCodewords: rawCodewords };
}

/**
 * Walks the encoder's zigzag, unmasking non-function modules and collecting
 * bits into bytes.  Returns the interleaved codeword stream, the per-bit
 * module coordinates, and the count of dark remainder bits.
 */
export function extractCodewords(
  m: boolean[][],
  version: number,
  mask: number,
): { codewords: Uint8Array; bitModules: Point[]; remainderBitsSet: number } {
  const size = m.length;
  const fmap = functionModuleMap(version);
  const rawCodewords = Math.floor(QrCode.getNumRawDataModules(version) / 8);

  const codewords = new Uint8Array(rawCodewords);
  const bitModules: Point[] = [];
  let remainderBitsSet = 0;

  let bitIndex = 0;

  // Mask predicate: mirrors applyMask's 8 cases.
  const maskBit = (x: number, y: number): boolean => {
    switch (mask) {
      case 0: {
        return (x + y) % 2 === 0;
      }
      case 1: {
        return y % 2 === 0;
      }
      case 2: {
        return x % 3 === 0;
      }
      case 3: {
        return (x + y) % 3 === 0;
      }
      case 4: {
        return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      }
      case 5: {
        return ((x * y) % 2) + ((x * y) % 3) === 0;
      }
      case 6: {
        return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      case 7: {
        return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      default: {
        throw new Error('Invalid mask');
      }
    }
  };

  // Zigzag — mirrors drawCodewords exactly.
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;

        if (fmap[y][x] !== 'data') {
          continue;
        }

        // Unmask the module value to recover the original encoded bit.
        const unmasked = maskBit(x, y) ? !m[y][x] : m[y][x];

        if (bitIndex < rawCodewords * 8) {
          // Regular codeword bit.
          if (unmasked) {
            codewords[bitIndex >>> 3] |= 1 << (7 - (bitIndex & 7));
          }
          bitModules.push({ x, y });
          bitIndex++;
        } else {
          // Remainder bit — should be zero in a well-formed code.
          if (unmasked) {
            remainderBitsSet++;
          }
        }
      }
    }
  }

  return { codewords, bitModules, remainderBitsSet };
}

/**
 * Inverts the interleave loop from addEccAndInterleave, splitting the flat
 * codeword stream back into per-block arrays (data + ECC contiguous).
 *
 * Short blocks have a conceptual padding byte at position `dataLen_short` in
 * the encoder's internal block array, which the encoder skips during interleave.
 * We replicate the same skip condition so that block positions align with the
 * stream exactly, then translate encoder-array indices into our compact
 * (data ++ ecc, no padding) output layout.
 */
export function deinterleave(
  codewords: Uint8Array,
  structure: BlockStructure,
): {
  blocks: Uint8Array[];
  globalIndex: (blockIndex: number, codewordIndex: number) => number;
} {
  const { blocks: blockDefs, totalCodewords } = structure;
  const numBlocks = blockDefs.length;
  const eccLen = blockDefs[0].eccLen;

  // Mirror the encoder's variable names exactly.
  // shortBlockLen = Math.floor(rawCodewords / numBlocks)  [encoder variable]
  // numShortBlocks = numBlocks - (rawCodewords % numBlocks)
  // The encoder's per-block array length is always shortBlockLen + 1 (both
  // short and long blocks); for short blocks position [dataLen_short] holds
  // a padding zero that is skipped during interleave.
  const shortBlockLen = Math.floor(totalCodewords / numBlocks);
  const numShortBlocks = numBlocks - (totalCodewords % numBlocks);

  // Encoder block array length (same for all blocks after dat.push(0)/ecc append).
  const encoderBlockLen = shortBlockLen + 1;
  // The skip slot: encoder position that holds the short-block padding byte.
  const skipSlot = shortBlockLen - eccLen; // = dataLen_short

  // Simulate the interleave loop to build a map from stream index to
  // (blockIndex, encoderPos).
  const slotBlock: number[] = [];
  const slotPos: number[] = [];

  for (let i = 0; i < encoderBlockLen; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i === skipSlot && j < numShortBlocks) {
        continue;
      }
      slotBlock.push(j);
      slotPos.push(i);
    }
  }

  // Translate an encoder array position into a compact output index.
  // Compact layout: 0..dataLen-1 = data, dataLen..dataLen+eccLen-1 = ECC.
  // Short block encoder layout: 0..dataLen_short-1 = data,
  //   dataLen_short = padding (skipped), dataLen_short+1..shortBlockLen = ECC.
  // Long block encoder layout:  0..dataLen_long-1  = data,
  //   dataLen_long..shortBlockLen = ECC (no padding).
  const encoderToCompact = (bIdx: number, pos: number): number => {
    const dataLen = blockDefs[bIdx].dataLen;
    if (pos < dataLen) {
      return pos; // data byte
    }
    if (bIdx < numShortBlocks) {
      // ECC byte in short block: encoder stored it at pos ≥ dataLen+1.
      return dataLen + (pos - dataLen - 1);
    }
    // Long block: ECC byte immediately follows data.
    return pos;
  };

  // Fill compact per-block arrays.
  const blockArrays: number[][] = blockDefs.map((def) =>
    Array.from({ length: def.dataLen + def.eccLen }, () => 0),
  );
  for (const [streamIdx, codeword] of codewords.entries()) {
    const bIdx = slotBlock[streamIdx];
    const pos = slotPos[streamIdx];
    blockArrays[bIdx][encoderToCompact(bIdx, pos)] = codeword;
  }

  // Build inverse map for globalIndex().
  const inverseMap = new Map<string, number>();
  for (const [streamIdx, bIdx] of slotBlock.entries()) {
    const pos = slotPos[streamIdx];
    const compact = encoderToCompact(bIdx, pos);
    inverseMap.set(`${bIdx}:${compact}`, streamIdx);
  }

  const blocks = blockArrays.map((arr) => Uint8Array.from(arr));

  const globalIndex = (blockIndex: number, codewordIndex: number): number => {
    const key = `${blockIndex}:${codewordIndex}`;
    const idx = inverseMap.get(key);
    if (idx === undefined) {
      throw new Error(
        `No mapping for block ${blockIndex} index ${codewordIndex}`,
      );
    }
    return idx;
  };

  return { blocks, globalIndex };
}
