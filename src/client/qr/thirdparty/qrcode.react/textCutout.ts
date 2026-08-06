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
 *
 * The cutout must not swallow the error-correction budget the user selected
 * in "Min error correction" — that budget is meant for real-world scan
 * damage, not for a hole the generator put there on purpose. So at least
 * half of the selected level's own nominal correction capacity is always
 * kept spare afterwards (see KEEP_FRACTION), and extra room for a bigger
 * cutout is found "for free" wherever possible first by raising the
 * error-correction level at the same version (more ECC codewords, no
 * bigger symbol), and only then by raising the version.
 */

import { useEffect, useState } from 'react';

import { fitFontSize } from './fontFit';
import {
  SPEC_MARGIN_SIZE,
  STRUCTURAL_TOP_ROWS,
  STRUCTURAL_BOTTOM_ROWS,
} from './constants';

import type { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';
import type { ModuleRegion } from '@/client/qr/decoder/types';

import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';
import {
  deinterleave,
  extractCodewords,
  getBlockStructure,
} from '@/client/qr/decoder/codewords';
import { rsDecode } from '@/client/qr/decoder/reedSolomon';

// Below this height (in modules) the cutout is not attempted — a smaller
// glyph than this is illegible however clean the render, and blocky/heavy
// display fonts (Impact and friends) tend to blob together at this scale
// once dilated for the border.
const MIN_TEXT_HEIGHT_MODULES = 8;

// Once a version/level combination yields at least this tall a cutout, stop
// searching further — this is comfortably legible for a couple of
// characters, and anything beyond is a diminishing-returns trade of a
// bigger symbol for marginally clearer text.
const COMFORTABLE_TEXT_HEIGHT_MODULES = 20;

// Radius (in modules) of the clear halo drawn around each glyph's ink,
// forming the "white border" that keeps the QR noise clear of the text.
const BORDER_MODULES = 1;

// However the cutout's cost is funded (see fitCutout's doc comment), at
// least this fraction of the selected level's own nominal correction
// capacity must remain spare afterwards — the "small margin" for real-world
// scan damage (dirt, glare, print defects, perspective distortion, ...)
// that the cutout must never fully spend.
const KEEP_FRACTION = 0.5;

// Every level from the user's selection upward is tried (at the same
// version) before the version itself is bumped, since a higher level costs
// nothing in symbol size and — because the required spare is always pegged
// to the *selected* level's own capacity, never the escalated one — funds
// a bigger cutout without eroding the guaranteed floor any further.
const LEVELS = [Ecc.LOW, Ecc.MEDIUM, Ecc.QUARTILE, Ecc.HIGH];

// Safety cap on how many versions we'll try before giving up.
const MAX_VERSION_ATTEMPTS = 30;

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

// Total codewords correctable across every Reed–Solomon block at this
// version/level — a pure function of the standard tables, independent of
// what's actually encoded, so it can be used as a reference even for a
// level/version combination nothing has been encoded at.
function totalCorrectableCapacity(version: number, ecl: Ecc): number {
  const structure = getBlockStructure(version, ecl);
  return structure.blocks.reduce(
    (sum, block) => sum + Math.floor(block.eccLen / 2),
    0,
  );
}

// Re-encodes `segments` at an exact (version, level), or returns null if the
// data doesn't fit that combination (never boosts the level or version
// beyond what's asked, since the caller is deliberately probing a specific
// combination).
function tryEncode(
  segments: readonly QrSegment[],
  level: Ecc,
  version: number,
): QrCode | null {
  try {
    return QrCode.encodeSegments(segments, level, version, version, -1, false);
  } catch {
    return null;
  }
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
// returning a boolean ink mask (true = dark/glyph pixel). Rendered at the
// font's natural weight (not synthetically bolded) — see fitFontSize's doc
// for why that matters here specifically.
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
  ctx.font = `${fontSize}px "${font}"`;

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
// that every Reed–Solomon block decodes, and that the total spare
// correction capacity left afterwards is at least `requiredSpare` — the
// same check a real scanner's error correction would perform, so it
// directly answers "would a reader still recover this, with the selected
// level's protection intact?" rather than approximating it from module
// counts.
function verifyDecodable(
  clearedCells: readonly (readonly boolean[])[],
  version: number,
  mask: number,
  candidateLevel: Ecc,
  requiredSpare: number,
): boolean {
  const structure = getBlockStructure(version, candidateLevel);
  const { codewords } = extractCodewords(
    clearedCells.map((row) => [...row]),
    version,
    mask,
  );
  const { blocks } = deinterleave(codewords, structure);

  let spare = 0;
  for (const [i, block] of blocks.entries()) {
    const { eccLen } = structure.blocks[i];
    const result = rsDecode(block, eccLen);
    if (!result) {
      return false;
    }
    spare += Math.floor(eccLen / 2) - result.errorPositions.length;
  }
  return spare >= requiredSpare;
}

interface TextFit {
  clearedCells: boolean[][];
  height: number;
}

// Finds the tallest legible cutout at this exact (version, level) that still
// leaves `requiredSpare` correction capacity, or null if even the minimum
// legible size doesn't.
function fitTextAtVersion(
  qrcode: QrCode,
  rasterText: string,
  rasterFont: string,
  ctx: CanvasRenderingContext2D,
  requiredSpare: number,
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
      false,
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
      requiredSpare,
    )
      ? clearMask
      : null;
  };

  // The smallest legible size sets the floor: if even that doesn't leave
  // enough spare capacity, no size at this version/level will.
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

// Tries the cutout at the selected error-correction level first, then at
// each higher level (still at the same version — free extra budget), then
// bumps the version and repeats, until a comfortably legible height is
// reached or the version cap is exhausted.
//
// Whichever (version, level) combination actually ends up drawn, the
// requirement checked at every step is the same: at least KEEP_FRACTION of
// the *selected* level's own nominal correction capacity for that version —
// never the escalated level's, so escalating only ever funds a bigger
// cutout, it never lets the guaranteed floor slip. Escalating for free (a
// higher level at the same version, or more raw codewords at a bigger one)
// means the cutout increasingly comes out of that extra capacity rather
// than the user's selected level's own share of it.
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

  const targetLevel = baseQrcode.errorCorrectionLevel;
  const levelsToTry = LEVELS.slice(targetLevel.ordinal);

  let bestLayout: CutoutLayout | null = null;
  let bestHeight = 0;

  for (
    let version = baseQrcode.version, attempt = 0;
    attempt < MAX_VERSION_ATTEMPTS;
    version++, attempt++
  ) {
    const requiredSpare = Math.ceil(
      totalCorrectableCapacity(version, targetLevel) * KEEP_FRACTION,
    );

    for (const level of levelsToTry) {
      const qrcode =
        level.ordinal === targetLevel.ordinal && version === baseQrcode.version
          ? baseQrcode
          : tryEncode(segments, level, version);
      if (!qrcode) {
        continue;
      }

      const fit = fitTextAtVersion(
        qrcode,
        rasterText,
        rasterFont,
        ctx,
        requiredSpare,
      );
      if (fit && fit.height > bestHeight) {
        bestHeight = fit.height;
        bestLayout = {
          cells: fit.clearedCells,
          version,
          margin: SPEC_MARGIN_SIZE,
          numCells: fit.clearedCells.length + SPEC_MARGIN_SIZE * 2,
        };
      }
    }

    if (bestHeight >= COMFORTABLE_TEXT_HEIGHT_MODULES) {
      break;
    }
    if (version + 1 > QrCode.MAX_VERSION) {
      break;
    }
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
      await document.fonts.load(`72px "${rasterFont}"`);
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
