/*
 * Implements the 'cutout' dot style: `rasterText` drawn as real, smoothly
 * rendered SVG text (not quantised to the module grid), with a narrow
 * (half-module) white border separating it from the surrounding pattern.
 * Every QR module that doesn't clip that text-plus-border region is left as
 * a normal full square; any module that does is simply not drawn at all —
 * the text element and the plain white background underneath it are what
 * shows through instead.
 *
 * Unlike the decorative 'text' style (which only ever redraws the true QR
 * value, just visually dressed up), this style actually overwrites modules
 * regardless of their encoded value — a scanner reading those modules sees
 * whatever we drew, exactly like any other reader would. That's only safe
 * because the affected modules are always Reed–Solomon data/ECC modules
 * (never finder/timing/alignment/format/version, which carry no redundancy
 * at all), and because every candidate layout is verified by literally
 * running this project's QR decoder over the resulting matrix before it's
 * accepted — the same simulation a real scan would produce, not a guess
 * about how much can safely be overwritten. The verification always
 * assumes the whole clipped region reads back as light, which is exactly
 * what's actually drawn there other than the text glyphs themselves.
 *
 * The style always encodes at high error correction — that's the biggest
 * error budget the format has — and then re-encodes at successively higher
 * versions only if even the smallest legible text doesn't leave a low
 * amount of that budget spare. Text is otherwise sized as large as the
 * resulting version allows, right up to that low remaining margin.
 */

import { useEffect, useState } from 'react';

import {
  SPEC_MARGIN_SIZE,
  STRUCTURAL_TOP_ROWS,
  STRUCTURAL_BOTTOM_ROWS,
} from './constants';
import { fitFontSize } from './fontFit';

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
// glyph than this is illegible however clean the render.
const MIN_TEXT_HEIGHT_MODULES = 8;

// Width, in modules, of the white border kept clear around the text's ink.
const BORDER_WIDTH_MODULES = 0.5;

// The error-correction level is always the format's strongest, giving the
// text and border the biggest possible budget to draw within.
const LEVEL = Ecc.HIGH;

// Only this fraction of the level's own nominal correction capacity needs
// to remain spare after drawing the text and border — deliberately low, so
// the text is sized as large as the version allows rather than kept small.
const LOW_REMAINING_FRACTION = 0.1;

// Safety cap on how many versions we'll try before giving up.
const MAX_VERSION_ATTEMPTS = 30;

export interface CutoutLayout {
  version: number;
  margin: number;
  numCells: number;
  /** The surrounding QR pattern, with every module clipping the text+border left light. */
  patternPath: string;
  /** Where to draw the real SVG <text> glyph, in the same coordinate space as patternPath. */
  text: {
    x: number;
    y: number;
    fontSize: number;
  };
}

interface CutoutSource {
  segments: readonly QrSegment[];
}

// Total codewords correctable across every Reed–Solomon block at this
// version/level — a pure function of the standard tables, independent of
// what's actually encoded.
function totalCorrectableCapacity(version: number, ecl: Ecc): number {
  const structure = getBlockStructure(version, ecl);
  return structure.blocks.reduce(
    (sum, block) => sum + Math.floor(block.eccLen / 2),
    0,
  );
}

// Re-encodes `segments` at an exact (version, LEVEL), or returns null if the
// data doesn't fit (never boosts the level or version beyond what's asked).
function tryEncode(
  segments: readonly QrSegment[],
  version: number,
): QrCode | null {
  try {
    return QrCode.encodeSegments(segments, LEVEL, version, version, -1, false);
  } catch {
    return null;
  }
}

// Generates an SVG fill path for a boolean grid at native module scale.
// Adjacent filled cells merge seamlessly since this is a fill, not a
// stroked outline.
function generateFillPath(
  mask: readonly (readonly boolean[])[],
  offsetX: number,
  offsetY: number,
): string {
  const ops: string[] = [];
  for (const [row, cells] of mask.entries()) {
    let start: number | null = null;
    const emit = (from: number, to: number): void => {
      ops.push(
        `M${offsetX + from},${offsetY + row}h${to - from}v1H${offsetX + from}z`,
      );
    };
    for (const [col, cell] of cells.entries()) {
      if (cell && start === null) {
        start = col;
      } else if (!cell && start !== null) {
        emit(start, col);
        start = null;
      }
    }
    if (start !== null) {
      emit(start, cells.length);
    }
  }
  return ops.join('');
}

// Chebyshev (square) dilation by one cell of whatever grid it's given —
// used on a 2×-supersampled ink grid so a single dilation is exactly a
// half-module grow.
function dilateBy1(mask: readonly (readonly boolean[])[]): boolean[][] {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  const result: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );
  for (const [y, row] of mask.entries()) {
    for (const [x, isSet] of row.entries()) {
      if (!isSet) {
        continue;
      }
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }
        for (let dx = -1; dx <= 1; dx++) {
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

// Doubles a module-resolution mask into a 2×2-subcell-per-module grid, so a
// 1-subcell dilation on the result is exactly a half-module grow.
function upsample2x(mask: readonly (readonly boolean[])[]): boolean[][] {
  const result: boolean[][] = [];
  for (const row of mask) {
    const r0: boolean[] = [];
    for (const cell of row) {
      r0.push(cell, cell);
    }
    result.push(r0, [...r0]);
  }
  return result;
}

// Rasterises `text` centred in a `width`×`height` module-resolution canvas,
// returning a boolean ink mask (true = dark/glyph pixel) — used only to work
// out which modules the text's ink and border actually reach, never for the
// visible glyph itself (that's drawn as real, smoothly rendered SVG text
// using this same font/size/position). Rendered at the font's natural
// weight (not synthetically bolded), which keeps already-heavy display
// fonts (Impact and friends) from blobbing strokes together once dilated
// for the border.
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
  ctx.fillText(text, width / 2, textBaselineY(ctx, text, height));

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

// Baseline y-coordinate that centres `text`'s actual ink bounds (not its
// nominal em box) within a box `height` tall — shared between the mask
// rasterisation above and the real SVG <text> element's `y`, so the two
// line up exactly.
function textBaselineY(
  ctx: CanvasRenderingContext2D,
  text: string,
  height: number,
): number {
  const m = ctx.measureText(text);
  return m.actualBoundingBoxAscent > 0
    ? height / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    : height / 2;
}

// True for every module whose square overlaps the text's ink or its
// half-module border, at full precision (via a 2×-supersampled grid) rather
// than the ink mask's own module-resolution grid — a module counts as
// clipped if *any* part of it falls in the zone, not just its centre.
function computeClipZone(ink: readonly (readonly boolean[])[]): boolean[][] {
  const grown = dilateBy1(upsample2x(ink));
  const height = ink.length;
  const width = ink[0]?.length ?? 0;
  return Array.from({ length: height }, (_, y) =>
    Array.from(
      { length: width },
      (_, x) =>
        grown[2 * y]?.[2 * x] ||
        grown[2 * y]?.[2 * x + 1] ||
        grown[2 * y + 1]?.[2 * x] ||
        grown[2 * y + 1]?.[2 * x + 1],
    ),
  );
}

// Leaves every module untouched except data modules clipped by the text or
// its border, which are forced light — never dark, whatever their true
// value, since only the separately drawn text glyph is allowed to be dark
// there.
function withClipZoneForced(
  cells: readonly (readonly boolean[])[],
  clipZone: readonly (readonly boolean[])[],
  fmap: readonly (readonly ModuleRegion[])[],
  interiorTop: number,
): boolean[][] {
  return cells.map((row, y) => {
    const my = y - interiorTop;
    const zoneRow = my >= 0 && my < clipZone.length ? clipZone[my] : null;
    return row.map((cell, x) =>
      zoneRow?.[x] && fmap[y][x] === 'data' ? false : cell,
    );
  });
}

// Runs this project's own QR decoder over the candidate matrix and checks
// that every Reed–Solomon block decodes, and that the total spare
// correction capacity left afterwards is at least `requiredSpare` — the
// same check a real scanner's error correction would perform, so it
// directly answers "would a reader still recover this?" rather than
// approximating it from module counts.
function verifyDecodable(
  clearedCells: readonly (readonly boolean[])[],
  version: number,
  mask: number,
  requiredSpare: number,
): boolean {
  const structure = getBlockStructure(version, LEVEL);
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
  fontSize: number;
  height: number;
}

// Finds the tallest legible text at this exact version that still leaves
// `requiredSpare` correction capacity, or null if even the minimum legible
// size doesn't.
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
  const maxTextHeight = interiorHeight - 2 * BORDER_WIDTH_MODULES;

  if (maxTextHeight < MIN_TEXT_HEIGHT_MODULES) {
    return null;
  }

  ctx.canvas.width = interiorWidth;
  ctx.canvas.height = interiorHeight;

  const tryHeight = (targetHeight: number): number | null => {
    const fontSize = fitFontSize(
      ctx,
      rasterText,
      rasterFont,
      interiorWidth - 2 * BORDER_WIDTH_MODULES,
      targetHeight,
      false,
    );
    const ink = rasterInkMask(
      ctx,
      rasterText,
      rasterFont,
      fontSize,
      interiorWidth,
      interiorHeight,
    );
    const clipZone = computeClipZone(ink);
    const clearedCells = withClipZoneForced(cells, clipZone, fmap, interiorTop);
    return verifyDecodable(clearedCells, version, qrcode.mask, requiredSpare)
      ? fontSize
      : null;
  };

  // The smallest legible size sets the floor: if even that doesn't leave
  // enough spare capacity, no size at this version will.
  const minResult = tryHeight(MIN_TEXT_HEIGHT_MODULES);
  if (minResult === null) {
    return null;
  }

  let lo = MIN_TEXT_HEIGHT_MODULES;
  let hi = maxTextHeight;
  let bestFontSize = minResult;
  let bestHeight = MIN_TEXT_HEIGHT_MODULES;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = tryHeight(mid);
    if (candidate === null) {
      hi = mid - 1;
    } else {
      lo = mid;
      bestFontSize = candidate;
      bestHeight = mid;
    }
  }

  return { fontSize: bestFontSize, height: bestHeight };
}

// Builds the final layout for the winning (version, fontSize): the
// surrounding pattern with the text+border's clip zone left light, and
// where to draw the real SVG <text> glyph on top of it.
function buildLayout(
  qrcode: QrCode,
  fit: TextFit,
  rasterText: string,
  rasterFont: string,
  ctx: CanvasRenderingContext2D,
): CutoutLayout {
  const cells = qrcode.getModules();
  const size = cells.length;
  const fmap = functionModuleMap(qrcode.version);

  const interiorTop = STRUCTURAL_TOP_ROWS;
  const interiorWidth = size;
  const interiorHeight = size - STRUCTURAL_TOP_ROWS - STRUCTURAL_BOTTOM_ROWS;

  ctx.canvas.width = interiorWidth;
  ctx.canvas.height = interiorHeight;
  const ink = rasterInkMask(
    ctx,
    rasterText,
    rasterFont,
    fit.fontSize,
    interiorWidth,
    interiorHeight,
  );
  const clipZone = computeClipZone(ink);
  const clearedCells = withClipZoneForced(cells, clipZone, fmap, interiorTop);

  ctx.font = `${fit.fontSize}px "${rasterFont}"`;
  const baselineY = textBaselineY(ctx, rasterText, interiorHeight);

  return {
    version: qrcode.version,
    margin: SPEC_MARGIN_SIZE,
    numCells: size + SPEC_MARGIN_SIZE * 2,
    patternPath: generateFillPath(
      clearedCells,
      SPEC_MARGIN_SIZE,
      SPEC_MARGIN_SIZE,
    ),
    text: {
      x: SPEC_MARGIN_SIZE + interiorWidth / 2,
      y: SPEC_MARGIN_SIZE + interiorTop + baselineY,
      fontSize: fit.fontSize,
    },
  };
}

// Always encodes at high error correction, then tries successively higher
// versions (re-encoding the same segments each time) only until the
// smallest legible text leaves at least LOW_REMAINING_FRACTION of that
// version's own correction capacity spare — text is otherwise sized as
// large as it can be within that low remaining margin.
function fitCutout(
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

  let qrcode = QrCode.encodeSegments(
    segments,
    LEVEL,
    1,
    QrCode.MAX_VERSION,
    -1,
    false,
  );

  for (let attempt = 0; attempt < MAX_VERSION_ATTEMPTS; attempt++) {
    const requiredSpare = Math.ceil(
      totalCorrectableCapacity(qrcode.version, LEVEL) * LOW_REMAINING_FRACTION,
    );

    const fit = fitTextAtVersion(
      qrcode,
      rasterText,
      rasterFont,
      ctx,
      requiredSpare,
    );
    if (fit) {
      return buildLayout(qrcode, fit, rasterText, rasterFont, ctx);
    }

    const nextVersion = qrcode.version + 1;
    if (nextVersion > QrCode.MAX_VERSION) {
      return null;
    }
    const next = tryEncode(segments, nextVersion);
    if (!next) {
      return null;
    }
    qrcode = next;
  }

  return null;
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
      setLayout(fitCutout(details.segments, rasterText, rasterFont));
    }

    run().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [details, rasterText, rasterFont]);

  return rasterText ? layout : null;
}
