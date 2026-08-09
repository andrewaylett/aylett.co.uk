/*
 * Implements the 'cutout' dot style: `rasterText` drawn as real, smoothly
 * rendered SVG text (not quantised to the module grid), with a narrow white
 * border separating it from the surrounding pattern. Every QR module that
 * doesn't clip that text-plus-border region is left as a normal full
 * square; any module that does is simply not drawn at all — the text
 * element and the plain white background underneath it are what shows
 * through instead.
 *
 * Unlike the decorative 'text' style (which only ever redraws the true QR
 * value, just visually dressed up), this style actually overwrites modules
 * regardless of their encoded value — a scanner reading those modules sees
 * whatever we drew, exactly like any other reader would. That's only safe
 * because every candidate layout is checked by actually rendering it (real
 * anti-aliased text and crisp module edges, at this app's real render
 * scale) and running that rendering through this project's own image-based
 * decoder — the same finder-pattern location, grid calibration, and
 * Reed–Solomon correction a real scanner's camera feed goes through, not
 * an idealised check on a perfect, already-located module grid. A boolean
 * model can't see classes of damage this catches: anti-aliasing eating a
 * too-thin border, or ink corrupting a timing or alignment pattern badly
 * enough to throw off the whole grid's calibration rather than just the
 * modules it visibly covers.
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
import { getBlockStructure } from '@/client/qr/decoder/codewords';
import { analyseImage } from '@/client/qr/decoder/analyseImage';

// Below this height (in modules) the cutout is not attempted — a smaller
// glyph than this is illegible however clean the render.
const MIN_TEXT_HEIGHT_MODULES = 8;

// Width, in modules, of the white border kept clear around the text's ink.
// Narrower than this and the border stops being reliable: it's meant to
// guarantee a strip of clean white between the text's ink and the
// surrounding dark modules, but real rendering anti-aliases the vector
// glyph edge, and at typical render resolutions (this app renders modules
// 9 CSS pixels wide) anything much below this bleeds straight from glyph
// ink into the adjacent module with no clean white pixel between them —
// confirmed by round-tripping actual exported PNGs through this project's
// own decoder: 0.1–0.3 modules failed to decode at all, 0.35 and up decoded
// cleanly.
const BORDER_WIDTH_MODULES = 0.4;

// Subpixels rendered per module when rasterising the ink mask used to work
// out the clip zone. High enough that the mask tracks the real vector
// glyph edges closely rather than a blocky module-grid approximation of
// them, and chosen so the border dilation below (which grows the mask by
// whole subcells) lands on an exact multiple of BORDER_WIDTH_MODULES.
const INK_RASTER_SCALE = 10;

// The border width above, expressed in ink-mask subcells.
const BORDER_RADIUS_SUBCELLS = Math.round(
  BORDER_WIDTH_MODULES * INK_RASTER_SCALE,
);

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
  /** The QR code actually encoded and rendered — its own version and error-correction
   *  level, which the cutout may have chosen independently of the caller's request. */
  qrcode: QrCode;
  /** The modules as actually rendered: the surrounding pattern with the text+border's
   *  clip zone forced light, exactly as a scanner would read them. */
  cells: boolean[][];
  /** Same segments the caller encoded — carried through so this can double as a
   *  QrCodeDetails-shaped source for debug reporting. */
  segments: readonly QrSegment[];
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

// Re-encodes `segments` at an exact (version, LEVEL, mask), or returns null
// if the data doesn't fit (never boosts the level or version beyond what's
// asked). `mask` is fixed rather than auto-chosen (-1) so callers can build
// every mask variant and pick between them themselves.
function tryEncode(
  segments: readonly QrSegment[],
  version: number,
  mask: number,
): QrCode | null {
  try {
    return QrCode.encodeSegments(
      segments,
      LEVEL,
      version,
      version,
      mask,
      false,
    );
  } catch {
    return null;
  }
}

// Encodes `segments` at this version under all 8 mask patterns, so mask
// selection can happen after the text's clip zone is known and forced into
// each candidate — see bestMaskCandidate() below.
function buildMaskCandidates(
  segments: readonly QrSegment[],
  version: number,
): QrCode[] {
  const candidates: QrCode[] = [];
  for (let mask = 0; mask < 8; mask++) {
    const qrcode = tryEncode(segments, version, mask);
    if (qrcode) {
      candidates.push(qrcode);
    }
  }
  return candidates;
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

// Chebyshev (square) dilation by `radius` cells of whatever grid it's given.
function dilateChebyshev(
  mask: readonly (readonly boolean[])[],
  radius: number,
): boolean[][] {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  if (radius <= 0) {
    return mask.map((row) => [...row]);
  }
  const result: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );
  for (const [y, row] of mask.entries()) {
    for (const [x, isSet] of row.entries()) {
      if (!isSet) {
        continue;
      }
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          result[ny][nx] = true;
        }
      }
    }
  }
  return result;
}

// Rasterises `text` centred in a `width`×`height` module box, at
// INK_RASTER_SCALE subpixels per module, returning a boolean ink mask (true
// = dark/glyph pixel) at that same subpixel resolution — used only to work
// out which modules the text's ink and border actually reach, never for the
// visible glyph itself (that's drawn as real, smoothly rendered SVG text
// using this same font/size/position). Rasterising at full subpixel
// resolution (rather than one pixel per module) is what lets the computed
// clip zone actually track the smooth glyph outlines instead of a blocky
// module-grid approximation of them. Rendered at the font's natural weight
// (not synthetically bolded), which keeps already-heavy display fonts
// (Impact and friends) from blobbing strokes together once dilated for the
// border.
function rasterInkMask(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  fontSize: number,
  width: number,
  height: number,
): boolean[][] {
  const pixelWidth = width * INK_RASTER_SCALE;
  const pixelHeight = height * INK_RASTER_SCALE;
  ctx.canvas.width = pixelWidth;
  ctx.canvas.height = pixelHeight;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `${fontSize * INK_RASTER_SCALE}px "${font}"`;
  ctx.fillText(text, pixelWidth / 2, textBaselineY(ctx, text, pixelHeight));

  const { data } = ctx.getImageData(0, 0, pixelWidth, pixelHeight);
  const mask: boolean[][] = [];
  for (let y = 0; y < pixelHeight; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < pixelWidth; x++) {
      row.push((data[(y * pixelWidth + x) * 4] ?? 255) < 128);
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

// Where the text's baseline sits, in the same module-unit coordinate space
// as the surrounding pattern (including the outer quiet-zone margin).
// Shared by the real-render decode check and the final SVG <text> element
// so what gets verified is pixel-for-pixel what ends up on screen.
function computeTextPosition(
  ctx: CanvasRenderingContext2D,
  rasterText: string,
  rasterFont: string,
  fontSize: number,
  interiorWidth: number,
  interiorHeight: number,
  interiorTop: number,
): { x: number; y: number } {
  ctx.font = `${fontSize}px "${rasterFont}"`;
  const baselineY = textBaselineY(ctx, rasterText, interiorHeight);
  return {
    x: SPEC_MARGIN_SIZE + interiorWidth / 2,
    y: SPEC_MARGIN_SIZE + interiorTop + baselineY,
  };
}

// True for every module whose square overlaps the text's ink or its
// border, at the ink mask's own subpixel precision rather than module
// resolution — a module counts as clipped if *any* of its subcells falls in
// the (dilated) zone, not just its centre.
function computeClipZone(ink: readonly (readonly boolean[])[]): boolean[][] {
  const grown = dilateChebyshev(ink, BORDER_RADIUS_SUBCELLS);
  const height = Math.round(ink.length / INK_RASTER_SCALE);
  const width = Math.round((ink[0]?.length ?? 0) / INK_RASTER_SCALE);
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      for (let sy = 0; sy < INK_RASTER_SCALE; sy++) {
        const row = grown[y * INK_RASTER_SCALE + sy];
        for (let sx = 0; sx < INK_RASTER_SCALE; sx++) {
          if (row[x * INK_RASTER_SCALE + sx]) {
            return true;
          }
        }
      }
      return false;
    }),
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

// Scale (device pixels per module) used only for the real-render decode
// check below — matches this app's actual on-screen and exported cell
// size, so the anti-aliasing it produces is representative of what a real
// reader would actually see, not a boolean approximation of it.
const VERIFY_RENDER_SCALE = 9;

// Renders a candidate exactly as it would actually look — real crisp-edged
// module squares plus real anti-aliased text, at this app's real render
// scale, with the standard quiet-zone margin around it — as a plain RGBA
// bitmap ready for the decoder below.
function renderCandidateImage(
  clearedCells: readonly (readonly boolean[])[],
  text: { x: number; y: number },
  fontSize: number,
  rasterText: string,
  rasterFont: string,
): ImageData {
  const scale = VERIFY_RENDER_SCALE;
  const numCells = clearedCells.length + SPEC_MARGIN_SIZE * 2;
  const canvas = document.createElement('canvas');
  canvas.width = numCells * scale;
  canvas.height = numCells * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (const [y, row] of clearedCells.entries()) {
    for (const [x, dark] of row.entries()) {
      if (dark) {
        ctx.fillRect(
          (SPEC_MARGIN_SIZE + x) * scale,
          (SPEC_MARGIN_SIZE + y) * scale,
          scale,
          scale,
        );
      }
    }
  }

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `${fontSize * scale}px "${rasterFont}"`;
  ctx.fillText(rasterText, text.x * scale, text.y * scale);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Renders this candidate as it would actually appear, then runs it through
// this project's own image-based decoder — the same finder-pattern
// location, grid calibration, and Reed–Solomon correction a real scanner's
// camera feed goes through, rather than an idealised codeword check on a
// perfect, already-located grid. That's the only way to catch damage a
// boolean model can't see at all: anti-aliasing eating a too-thin border,
// or text/border ink corrupting a timing or alignment pattern badly enough
// to throw off the whole grid's calibration, not just the modules it
// visibly covers. Requires `requiredSpare` correction capacity left over,
// exactly as the real scanner's own error correction would report it.
function verifyDecodable(
  clearedCells: readonly (readonly boolean[])[],
  text: { x: number; y: number },
  fontSize: number,
  rasterText: string,
  rasterFont: string,
  requiredSpare: number,
): boolean {
  const image = renderCandidateImage(
    clearedCells,
    text,
    fontSize,
    rasterText,
    rasterFont,
  );
  const result = analyseImage(image);
  if (!result.ok) {
    return false;
  }
  const spare = result.analysis.blocks.reduce(
    (sum, block) =>
      sum + Math.floor(block.eccCodewords / 2) - block.errorsCorrected,
    0,
  );
  return spare >= requiredSpare;
}

// Applies the text+border clip zone to every candidate mask's own encoding,
// discards masks that don't leave `requiredSpare` correction capacity once
// cleared, and of the ones that survive, picks the one that scores best
// under the format's own mask-quality rule (QrCode.getPenaltyScoreOf) —
// evaluated against the matrix as it will actually be rendered, clip zone
// and all, rather than against each mask's unmodified encoding. Decodability
// is checked first, and only within the surviving set is appearance used as
// a tiebreak: the modules the clip zone forces light are otherwise arbitrary
// per mask, so a mask that merely looks best unclipped could easily be one
// that loses too much of its own data under this particular clip zone, while
// a less "pretty" mask survives it fine — checking appearance first would
// pick the failing mask and force a needless version bump instead.
function selectMask(
  maskCandidates: readonly QrCode[],
  clipZone: readonly (readonly boolean[])[],
  fmap: readonly (readonly ModuleRegion[])[],
  interiorTop: number,
  text: { x: number; y: number },
  fontSize: number,
  rasterText: string,
  rasterFont: string,
  requiredSpare: number,
): { qrcode: QrCode; clearedCells: boolean[][] } | null {
  let best: {
    qrcode: QrCode;
    clearedCells: boolean[][];
    penalty: number;
  } | null = null;
  for (const qrcode of maskCandidates) {
    const clearedCells = withClipZoneForced(
      qrcode.getModules(),
      clipZone,
      fmap,
      interiorTop,
    );
    if (
      !verifyDecodable(
        clearedCells,
        text,
        fontSize,
        rasterText,
        rasterFont,
        requiredSpare,
      )
    ) {
      continue;
    }
    const penalty = QrCode.getPenaltyScoreOf(clearedCells);
    if (!best || penalty < best.penalty) {
      best = { qrcode, clearedCells, penalty };
    }
  }
  return best;
}

interface TextFit {
  fontSize: number;
  height: number;
  qrcode: QrCode;
}

// Finds the tallest legible text at this exact version that still leaves
// `requiredSpare` correction capacity, or null if even the minimum legible
// size doesn't. For each candidate size, every mask pattern is tried with
// the resulting clip zone forced onto it; the best-looking mask among those
// that still decode is what this reports back.
function fitTextAtVersion(
  version: number,
  segments: readonly QrSegment[],
  rasterText: string,
  rasterFont: string,
  ctx: CanvasRenderingContext2D,
  requiredSpare: number,
): TextFit | null {
  const maskCandidates = buildMaskCandidates(segments, version);
  if (maskCandidates.length === 0) {
    return null;
  }

  const size = version * 4 + 17;
  const fmap = functionModuleMap(version);

  const interiorTop = STRUCTURAL_TOP_ROWS;
  const interiorWidth = size;
  const interiorHeight = size - STRUCTURAL_TOP_ROWS - STRUCTURAL_BOTTOM_ROWS;
  const maxTextHeight = interiorHeight - 2 * BORDER_WIDTH_MODULES;

  if (maxTextHeight < MIN_TEXT_HEIGHT_MODULES) {
    return null;
  }

  const tryHeight = (
    targetHeight: number,
  ): { fontSize: number; qrcode: QrCode } | null => {
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
    const text = computeTextPosition(
      ctx,
      rasterText,
      rasterFont,
      fontSize,
      interiorWidth,
      interiorHeight,
      interiorTop,
    );
    const best = selectMask(
      maskCandidates,
      clipZone,
      fmap,
      interiorTop,
      text,
      fontSize,
      rasterText,
      rasterFont,
      requiredSpare,
    );
    return best ? { fontSize, qrcode: best.qrcode } : null;
  };

  // The smallest legible size sets the floor: if even that doesn't leave
  // enough spare capacity, no size at this version will.
  const minResult = tryHeight(MIN_TEXT_HEIGHT_MODULES);
  if (minResult === null) {
    return null;
  }

  let lo = MIN_TEXT_HEIGHT_MODULES;
  let hi = maxTextHeight;
  let best = minResult;
  let bestHeight = MIN_TEXT_HEIGHT_MODULES;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = tryHeight(mid);
    if (candidate === null) {
      hi = mid - 1;
    } else {
      lo = mid;
      best = candidate;
      bestHeight = mid;
    }
  }

  return { fontSize: best.fontSize, height: bestHeight, qrcode: best.qrcode };
}

// Builds the final layout for the winning (version, mask, fontSize): the
// surrounding pattern with the text+border's clip zone left light, and
// where to draw the real SVG <text> glyph on top of it.
function buildLayout(
  segments: readonly QrSegment[],
  fit: TextFit,
  rasterText: string,
  rasterFont: string,
  ctx: CanvasRenderingContext2D,
): CutoutLayout {
  const qrcode = fit.qrcode;
  const cells = qrcode.getModules();
  const size = cells.length;
  const fmap = functionModuleMap(qrcode.version);

  const interiorTop = STRUCTURAL_TOP_ROWS;
  const interiorWidth = size;
  const interiorHeight = size - STRUCTURAL_TOP_ROWS - STRUCTURAL_BOTTOM_ROWS;

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

  const text = computeTextPosition(
    ctx,
    rasterText,
    rasterFont,
    fit.fontSize,
    interiorWidth,
    interiorHeight,
    interiorTop,
  );

  return {
    qrcode,
    cells: clearedCells,
    segments,
    margin: SPEC_MARGIN_SIZE,
    numCells: size + SPEC_MARGIN_SIZE * 2,
    patternPath: generateFillPath(
      clearedCells,
      SPEC_MARGIN_SIZE,
      SPEC_MARGIN_SIZE,
    ),
    text: {
      x: text.x,
      y: text.y,
      fontSize: fit.fontSize,
    },
  };
}

// Always encodes at high error correction, then tries successively higher
// versions only until the smallest legible text leaves at least
// LOW_REMAINING_FRACTION of that version's own correction capacity spare —
// text is otherwise sized as large as it can be within that low remaining
// margin.
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

  let version = QrCode.encodeSegments(
    segments,
    LEVEL,
    1,
    QrCode.MAX_VERSION,
    -1,
    false,
  ).version;

  for (let attempt = 0; attempt < MAX_VERSION_ATTEMPTS; attempt++) {
    const requiredSpare = Math.ceil(
      totalCorrectableCapacity(version, LEVEL) * LOW_REMAINING_FRACTION,
    );

    const fit = fitTextAtVersion(
      version,
      segments,
      rasterText,
      rasterFont,
      ctx,
      requiredSpare,
    );
    if (fit) {
      return buildLayout(segments, fit, rasterText, rasterFont, ctx);
    }

    version += 1;
    if (version > QrCode.MAX_VERSION) {
      return null;
    }
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
