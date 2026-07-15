/*
 * Orchestrates the instrumented decode of a sampled QR module matrix.
 *
 * Unlike a normal decoder, every stage's diagnostics are preserved: format
 * bit errors, per-block correction counts and positions, the parsed segment
 * structure, and a module-level diff between what was sampled and what the
 * symbol should canonically contain. Failures return the partial analysis
 * gathered so far rather than throwing, so the UI can explain how far the
 * decode got.
 */

import type {
  AnalysisResult,
  BlockReport,
  FormatReport,
  MatrixAnalysis,
  ModuleRegion,
  Point,
} from '@/client/qr/decoder/types';
import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react';

import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { buildCanonical, diffMatrices } from '@/client/qr/decoder/canonical';
import {
  deinterleave,
  extractCodewords,
  getBlockStructure,
} from '@/client/qr/decoder/codewords';
import {
  readFormatInfo,
  readVersionInfo,
} from '@/client/qr/decoder/formatInfo';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';
import { rsDecode } from '@/client/qr/decoder/reedSolomon';
import { parseDataStream } from '@/client/qr/decoder/segments';

const ECL_BY_LETTER: Record<ErrorCorrectionLevel, Ecc> = {
  L: Ecc.LOW,
  M: Ecc.MEDIUM,
  Q: Ecc.QUARTILE,
  H: Ecc.HIGH,
};

function transpose(m: readonly boolean[][]): boolean[][] {
  return m.map((row, y) => row.map((_, x) => m[x][y]));
}

/**
 * Refines the function-module map's uniform 'data' region into 'data', 'ecc'
 * and 'remainder', using the recorded module coordinate of every codeword bit
 * and the block structure. This lets the diff say whether a corrected module
 * held payload or error-correction information.
 */
function refineRegions(
  regions: ModuleRegion[][],
  bitModules: readonly Point[],
  codewordKinds: readonly ('data' | 'ecc')[],
): ModuleRegion[][] {
  for (const row of regions) {
    for (const [x, region] of row.entries()) {
      if (region === 'data') {
        row[x] = 'remainder';
      }
    }
  }
  for (const [i, { x, y }] of bitModules.entries()) {
    regions[y][x] = codewordKinds[i >>> 3];
  }
  return regions;
}

export function analyseMatrix(
  m: readonly boolean[][],
): AnalysisResult<MatrixAnalysis> {
  const size = m.length;
  if (
    size < 21 ||
    size > 177 ||
    (size - 17) % 4 !== 0 ||
    m.some((row) => row.length !== size)
  ) {
    return {
      ok: false,
      stage: 'extract',
      message: `Matrix is ${size} modules square, which is not a valid QR size (21–177, size ≡ 1 mod 4).`,
    };
  }

  // A mirrored (transposed) symbol scans plausibly but its format information
  // can only BCH-decode from the correct orientation. Compare format bit errors
  // from both orientations and prefer the one with fewer errors: a genuine
  // mirrored code has zero errors in the transposed reading and typically many
  // in the original, while a non-mirrored code is the reverse. Checking both
  // upfront avoids a subtle false-positive: for certain mask/ECL combinations
  // the scrambled format bits from the wrong orientation can accidentally fall
  // within 3 errors of some valid codeword and pass a simple "try if null"
  // check, leading the decoder to proceed with the wrong ECL and mask.
  const unmirrored = m.map((row) => [...row]);
  const format0 = readFormatInfo(unmirrored);
  const flipped = transpose(m);
  const format1 = readFormatInfo(flipped);

  // On a tie prefer the unmirrored orientation; only use the transposed reading
  // when it is strictly better (fewer bit errors).
  let matrix: boolean[][];
  let mirrored: boolean;
  let format: FormatReport;
  if (
    format1 &&
    (!format0 || format1.totalBitErrors < format0.totalBitErrors)
  ) {
    format = format1;
    matrix = flipped;
    mirrored = true;
  } else if (format0) {
    format = format0;
    matrix = unmirrored;
    mirrored = false;
  } else {
    return {
      ok: false,
      stage: 'format',
      message:
        'Format information could not be decoded from either orientation: more than 3 bit errors in both copies.',
      partial: { size, sampledMatrix: unmirrored },
    };
  }

  const version = readVersionInfo(matrix);
  const ecl = ECL_BY_LETTER[format.ecl];
  const structure = getBlockStructure(version.version, ecl);
  const { codewords, bitModules, remainderBitsSet } = extractCodewords(
    matrix,
    version.version,
    format.mask,
  );
  const { blocks, globalIndex } = deinterleave(codewords, structure);

  // Map each interleaved codeword to data/ecc so corrected modules can be
  // classified, and RS error positions can be reported per block.
  const codewordKinds: ('data' | 'ecc')[] = Array.from({
    length: structure.totalCodewords,
  });
  for (const [b, { dataLen }] of structure.blocks.entries()) {
    const blockLen = blocks[b].length;
    for (let p = 0; p < blockLen; p++) {
      codewordKinds[globalIndex(b, p)] = p < dataLen ? 'data' : 'ecc';
    }
  }

  const blockReports: BlockReport[] = [];
  const correctedBlocks: Uint8Array[] = [];
  for (const [i, block] of blocks.entries()) {
    const { dataLen, eccLen } = structure.blocks[i];
    const result = rsDecode(block, eccLen);
    blockReports.push({
      index: i,
      dataCodewords: dataLen,
      eccCodewords: eccLen,
      errorsCorrected: result ? result.errorPositions.length : 0,
      errorPositions: result ? result.errorPositions : [],
      failed: !result,
    });
    if (result) {
      correctedBlocks.push(result.corrected);
    }
  }
  const totalErrorsCorrected = blockReports.reduce(
    (sum, b) => sum + b.errorsCorrected,
    0,
  );

  const common = {
    size,
    mirrored,
    format,
    version,
    blocks: blockReports,
    totalErrorsCorrected,
    sampledMatrix: matrix,
    remainderBitsSet,
  };

  if (blockReports.some((b) => b.failed)) {
    const failedCount = blockReports.filter((b) => b.failed).length;
    return {
      ok: false,
      stage: 'correction',
      message: `${failedCount} of ${blockReports.length} error-correction block(s) had more errors than can be corrected.`,
      partial: { ...common, correctionFailed: true },
    };
  }

  const dataCodewords = new Uint8Array(
    structure.blocks.reduce((sum, b) => sum + b.dataLen, 0),
  );
  let offset = 0;
  for (const [i, corrected] of correctedBlocks.entries()) {
    dataCodewords.set(
      corrected.subarray(0, structure.blocks[i].dataLen),
      offset,
    );
    offset += structure.blocks[i].dataLen;
  }

  const stream = parseDataStream(dataCodewords, version.version);
  const canonicalMatrix = buildCanonical(
    version.version,
    ecl,
    format.mask,
    dataCodewords,
  );
  const regions = refineRegions(
    functionModuleMap(version.version),
    bitModules,
    codewordKinds,
  );
  const diffs = diffMatrices(matrix, canonicalMatrix, regions);

  return {
    ok: true,
    analysis: {
      ...common,
      correctionFailed: false,
      stream,
      canonicalMatrix,
      diffs,
    },
  };
}
