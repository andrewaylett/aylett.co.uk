/*
 * Implements the 'cutout' dot style: `rasterText` drawn as solid black full
 * modules, with a narrow (half-module) white border separating it from the
 * surrounding pattern, with every other module left as a normal full
 * square.
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
 * about how much can safely be overwritten.
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

// Radius (in whole modules) of the ring around the text's ink treated as
// "at risk" for the error-correction budget check. The border actually
// drawn is only half a module wide (see generateBorderOverlayPath) —
// checking against a full module is deliberately more pessimistic than
// what's really overwritten, which only widens the safety margin.
const RING_RADIUS_MODULES = 1;

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
  /** Full pattern at native module resolution, with the text's ink forced black. */
  blackPath: string;
  /** Half-module-wide white border around the text, drawn on top of blackPath. */
  borderOverlayPath: string;
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

// Generates an SVG fill path for a boolean grid. Grid cell (row, col)
// occupies the square [offsetX+col*scale, offsetY+row*scale] sized
// scale×scale — filled cells merge seamlessly at any scale, unlike a
// stroked outline, which is what lets the border be drawn at a finer
// (half-module) scale than the text without visible seams between rows.
function generateFillPath(
  mask: readonly (readonly boolean[])[],
  offsetX: number,
  offsetY: number,
  scale: number,
): string {
  const ops: string[] = [];
  for (const [row, cells] of mask.entries()) {
    let start: number | null = null;
    const emit = (from: number, to: number): void => {
      const x = offsetX + from * scale;
      const y = offsetY + row * scale;
      const w = (to - from) * scale;
      ops.push(`M${x},${y}h${w}v${scale}H${x}z`);
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

// Chebyshev (square) dilation, used both to build the full-module "at risk"
// ring for the budget check and, on an upsampled grid, the half-module
// border ring for rendering.
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
    for (const [x, isSet] of row.entries()) {
      if (!isSet) {
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
// returning a boolean ink mask (true = dark/glyph pixel). Rendered at the
// font's natural weight (not synthetically bolded), which keeps already-
// heavy display fonts (Impact and friends) from blobbing strokes together
// at this resolution.
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

// Forces every module inside `ink` black and every module inside `ring`
// (but not already ink) white, except structural modules, which are never
// touched. Used only for the decodability check — a full module's worth of
// "at risk" ring, deliberately more pessimistic than the half-module border
// actually drawn.
function withInkAndRingForced(
  cells: readonly (readonly boolean[])[],
  ink: readonly (readonly boolean[])[],
  ring: readonly (readonly boolean[])[],
  fmap: readonly (readonly ModuleRegion[])[],
  interiorTop: number,
): boolean[][] {
  return cells.map((row, y) => {
    const my = y - interiorTop;
    const inkRow = my >= 0 && my < ink.length ? ink[my] : null;
    const ringRow = my >= 0 && my < ring.length ? ring[my] : null;
    return row.map((cell, x) => {
      if (fmap[y][x] !== 'data') {
        return cell;
      }
      if (inkRow?.[x]) {
        return true;
      }
      if (ringRow?.[x]) {
        return false;
      }
      return cell;
    });
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
  ink: boolean[][];
  interiorTop: number;
  fmap: ModuleRegion[][];
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
  const maxTextHeight = interiorHeight - 2 * RING_RADIUS_MODULES;

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
      interiorWidth - 2 * RING_RADIUS_MODULES,
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
    const ring = dilate(ink, RING_RADIUS_MODULES).map((row, y) =>
      row.map((cell, x) => cell && !ink[y]?.[x]),
    );
    const clearedCells = withInkAndRingForced(
      cells,
      ink,
      ring,
      fmap,
      interiorTop,
    );
    return verifyDecodable(clearedCells, version, qrcode.mask, requiredSpare)
      ? ink
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

  return { ink: best, interiorTop, fmap, height: bestHeight };
}

// The text's ink, forced black, at native module resolution — everything
// else in `cells` (including the border ring) is left exactly as encoded,
// since the border overlay handles clearing it separately.
function buildBlackPath(
  cells: readonly (readonly boolean[])[],
  fit: TextFit,
  margin: number,
): string {
  const { ink, fmap, interiorTop } = fit;
  const withInk = cells.map((row, y) => {
    const my = y - interiorTop;
    const inkRow = my >= 0 && my < ink.length ? ink[my] : null;
    return row.map((cell, x) =>
      inkRow?.[x] && fmap[y][x] === 'data' ? true : cell,
    );
  });
  return generateFillPath(withInk, margin, margin, 1);
}

// A precise half-module-wide white border: the ink mask grown by exactly
// one subcell on a 2×-supersampled grid, restricted to data modules. Drawn
// on top of the black text (which re-covers everything inside the original
// ink boundary), so only the outer half-module ring stays visible.
function buildBorderOverlayPath(fit: TextFit, margin: number): string {
  const { ink, fmap, interiorTop } = fit;
  const ink2x = upsample2x(ink);
  // dilate() keeps the original ink subcells set too, so subtract ink2x back
  // out — the overlay must be only the ring, or it would paint over (and
  // hide) the black text drawn on top of it.
  const ring = dilate(ink2x, 1).map((row, sy) =>
    row.map((isSet, sx) => isSet && !ink2x[sy]?.[sx]),
  );
  for (const [sy, row] of ring.entries()) {
    for (const [sx, isSet] of row.entries()) {
      if (!isSet) {
        continue;
      }
      const y = Math.floor(sy / 2) + interiorTop;
      const x = Math.floor(sx / 2);
      if (fmap[y]?.[x] !== 'data') {
        row[sx] = false;
      }
    }
  }
  return generateFillPath(ring, margin, margin + interiorTop, 0.5);
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
      const cells = qrcode.getModules();
      return {
        version: qrcode.version,
        margin: SPEC_MARGIN_SIZE,
        numCells: cells.length + SPEC_MARGIN_SIZE * 2,
        blackPath: buildBlackPath(cells, fit, SPEC_MARGIN_SIZE),
        borderOverlayPath: buildBorderOverlayPath(fit, SPEC_MARGIN_SIZE),
      };
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
