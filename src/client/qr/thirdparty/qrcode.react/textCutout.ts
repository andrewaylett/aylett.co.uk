/*
 * Implements the 'cutout' dot style: a legible hole shaped like `rasterText`
 * punched into the data modules, with every other module left as a normal
 * full square.
 *
 * Unlike the decorative 'text' style (which only ever redraws the true QR
 * value, just visually dressed up), this style actually forces modules
 * light regardless of their encoded value — a scanner reading those modules
 * sees plain white, exactly like any other reader would. That's only safe
 * because the affected modules are always Reed–Solomon data/ECC modules
 * (never finder/timing/alignment/format/version, which carry no redundancy
 * at all), and because every candidate layout is verified by literally
 * running this project's QR decoder over the resulting matrix before it's
 * accepted — the same simulation a real scan would produce, not a guess
 * about how much can safely be erased.
 */

import { useEffect, useState } from 'react';

import { fitFontSize } from './fontFit';
import {
  SPEC_MARGIN_SIZE,
  STRUCTURAL_TOP_ROWS,
  STRUCTURAL_BOTTOM_ROWS,
} from './constants';

import type { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import type { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';
import type { ModuleRegion } from '@/client/qr/decoder/types';

import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';
import {
  deinterleave,
  extractCodewords,
  getBlockStructure,
} from '@/client/qr/decoder/codewords';
import { rsDecode } from '@/client/qr/decoder/reedSolomon';

// Below this height (in modules) the cutout is no longer legible, so a
// smaller height is never attempted — the version is bumped instead.
const MIN_TEXT_HEIGHT_MODULES = 6;

// Once a version yields at least this tall a cutout, stop bumping the
// version further — anything beyond this is a diminishing-returns trade of
// a bigger symbol for marginally clearer text.
const COMFORTABLE_TEXT_HEIGHT_MODULES = 14;

// Radius (in modules) of the clear halo drawn around each glyph's ink,
// forming the "white border" that keeps the QR noise clear of the text.
const BORDER_MODULES = 1;

// Fraction of each Reed–Solomon block's correction capacity the cutout is
// allowed to spend, leaving the remainder as a margin for real-world scan
// damage (dirt, glare, print defects, perspective distortion, ...).
const MAX_CAPACITY_FRACTION = 0.7;

// Safety cap on how many versions we'll try before giving up.
const MAX_VERSION_ATTEMPTS = 20;

export interface CutoutLayout {
  cells: boolean[][];
  version: number;
  margin: number;
  numCells: number;
}

interface CutoutSource {
  qrcode: QrCode;
  segments: readonly QrSegment[];
}

// Forces every module inside `interiorClear` light, but only where that
// module is actually a data/ECC module — finder/timing/alignment/format/
// version modules are never touched, however large the requested cutout.
function applyCutout(
  cells: readonly (readonly boolean[])[],
  interiorClear: readonly (readonly boolean[])[],
  fmap: readonly (readonly ModuleRegion[])[],
  interiorTop: number,
): boolean[][] {
  return cells.map((row, y) => {
    const my = y - interiorTop;
    const clearRow =
      my >= 0 && my < interiorClear.length ? interiorClear[my] : null;
    return row.map((cell, x) =>
      clearRow && clearRow[x] && fmap[y][x] === 'data' ? false : cell,
    );
  });
}

// Chebyshev (square) dilation, used to grow glyph ink into the surrounding
// clear border.
function dilate(
  mask: readonly (readonly boolean[])[],
  radius: number,
): boolean[][] {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  const result: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );
  for (const [y, row] of mask.entries()) {
    for (const [x, isInk] of row.entries()) {
      if (!isInk) {
        continue;
      }
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            result[ny][nx] = true;
          }
        }
      }
    }
  }
  return result;
}

// Rasterises `text` centred in a `width`×`height` module-resolution canvas,
// returning a boolean ink mask (true = dark/glyph pixel).
function rasterInkMask(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  fontSize: number,
  width: number,
  height: number,
): boolean[][] {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `bold ${fontSize}px "${font}"`;

  const m = ctx.measureText(text);
  const inkCy =
    m.actualBoundingBoxAscent > 0
      ? height / 2 +
        (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
      : height / 2;
  ctx.fillText(text, width / 2, inkCy);

  const { data } = ctx.getImageData(0, 0, width, height);
  const mask: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      row.push((data[(y * width + x) * 4] ?? 255) < 128);
    }
    mask.push(row);
  }
  return mask;
}

// Runs this project's own QR decoder over the candidate matrix and checks
// that every Reed–Solomon block both decodes and keeps at least
// (1 − MAX_CAPACITY_FRACTION) of its correction capacity spare. This is the
// same check a real scanner's error correction would perform, so it directly
// answers "would a reader still recover this?" rather than approximating it
// from module counts.
function verifyDecodable(
  clearedCells: readonly (readonly boolean[])[],
  version: number,
  mask: number,
  ecl: Ecc,
): boolean {
  const structure = getBlockStructure(version, ecl);
  const { codewords } = extractCodewords(
    clearedCells.map((row) => [...row]),
    version,
    mask,
  );
  const { blocks } = deinterleave(codewords, structure);
  return blocks.every((block, i) => {
    const { eccLen } = structure.blocks[i];
    const result = rsDecode(block, eccLen);
    if (!result) {
      return false;
    }
    const maxAllowed = Math.floor((eccLen / 2) * MAX_CAPACITY_FRACTION);
    return result.errorPositions.length <= maxAllowed;
  });
}

interface TextFit {
  clearedCells: boolean[][];
  height: number;
}

// Finds the tallest legible cutout that still verifies as decodable with
// margin at this QR version, or null if even the minimum legible size
// doesn't leave enough error-correction budget spare.
function fitTextAtVersion(
  qrcode: QrCode,
  rasterText: string,
  rasterFont: string,
  ctx: CanvasRenderingContext2D,
): TextFit | null {
  const cells = qrcode.getModules();
  const size = cells.length;
  const version = qrcode.version;
  const fmap = functionModuleMap(version);

  const interiorTop = STRUCTURAL_TOP_ROWS;
  const interiorWidth = size;
  const interiorHeight = size - STRUCTURAL_TOP_ROWS - STRUCTURAL_BOTTOM_ROWS;
  const maxTextHeight = interiorHeight - 2 * BORDER_MODULES;

  if (maxTextHeight < MIN_TEXT_HEIGHT_MODULES) {
    return null;
  }

  ctx.canvas.width = interiorWidth;
  ctx.canvas.height = interiorHeight;

  const tryHeight = (targetHeight: number): boolean[][] | null => {
    const fontSize = fitFontSize(
      ctx,
      rasterText,
      rasterFont,
      interiorWidth - 2 * BORDER_MODULES,
      targetHeight,
    );
    const inkMask = rasterInkMask(
      ctx,
      rasterText,
      rasterFont,
      fontSize,
      interiorWidth,
      interiorHeight,
    );
    const clearMask = dilate(inkMask, BORDER_MODULES);
    const clearedCells = applyCutout(cells, clearMask, fmap, interiorTop);
    return verifyDecodable(
      clearedCells,
      version,
      qrcode.mask,
      qrcode.errorCorrectionLevel,
    )
      ? clearMask
      : null;
  };

  // The smallest legible size sets the floor: if even that doesn't leave
  // enough spare capacity, no size at this version will.
  const minResult = tryHeight(MIN_TEXT_HEIGHT_MODULES);
  if (!minResult) {
    return null;
  }

  let lo = MIN_TEXT_HEIGHT_MODULES;
  let hi = maxTextHeight;
  let best = minResult;
  let bestHeight = MIN_TEXT_HEIGHT_MODULES;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = tryHeight(mid);
    if (candidate) {
      lo = mid;
      best = candidate;
      bestHeight = mid;
    } else {
      hi = mid - 1;
    }
  }

  return {
    clearedCells: applyCutout(cells, best, fmap, interiorTop),
    height: bestHeight,
  };
}

// Tries the cutout at increasing QR versions (re-encoding the same segments
// and error-correction level each time), since a fixed-size text patch
// becomes a proportionally smaller — and so more easily correctable —
// erasure as the symbol grows. Keeps bumping until a comfortably legible
// height is reached, then uses the tallest layout found across all versions
// tried (never returning a shorter cutout for a version tried later).
function fitCutout(
  baseQrcode: QrCode,
  segments: readonly QrSegment[],
  rasterText: string,
  rasterFont: string,
): CutoutLayout | null {
  if (!rasterText) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  let qrcode = baseQrcode;
  let bestLayout: CutoutLayout | null = null;
  let bestHeight = 0;

  for (let attempt = 0; attempt < MAX_VERSION_ATTEMPTS; attempt++) {
    const fit = fitTextAtVersion(qrcode, rasterText, rasterFont, ctx);
    if (fit && fit.height > bestHeight) {
      bestHeight = fit.height;
      bestLayout = {
        cells: fit.clearedCells,
        version: qrcode.version,
        margin: SPEC_MARGIN_SIZE,
        numCells: fit.clearedCells.length + SPEC_MARGIN_SIZE * 2,
      };
    }

    if (bestHeight >= COMFORTABLE_TEXT_HEIGHT_MODULES) {
      break;
    }

    const nextVersion = qrcode.version + 1;
    if (nextVersion > QrCode.MAX_VERSION) {
      break;
    }
    // boostEcl: false — keep the level the user asked for exactly, rather
    // than silently upgrading it now that a bigger version has spare room.
    qrcode = QrCode.encodeSegments(
      segments,
      qrcode.errorCorrectionLevel,
      nextVersion,
      nextVersion,
      -1,
      false,
    );
  }

  return bestLayout;
}

export function useCutoutLayout(
  details: CutoutSource,
  rasterText: string,
  rasterFont: string,
): CutoutLayout | null {
  const [layout, setLayout] = useState<CutoutLayout | null>(null);

  useEffect(() => {
    if (!rasterText) {
      return;
    }
    let cancelled = false;

    async function run() {
      await document.fonts.load(`bold 72px "${rasterFont}"`);
      if (cancelled) {
        return;
      }
      setLayout(
        fitCutout(details.qrcode, details.segments, rasterText, rasterFont),
      );
    }

    run().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [details, rasterText, rasterFont]);

  return rasterText ? layout : null;
}
