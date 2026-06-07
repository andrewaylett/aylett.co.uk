/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */

import React, { type PropsWithoutRef, type RefAttributes } from 'react';

import type { QrCode } from '../qrcodegen';
import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react/errorCorrectionLevel';

import {
  STRUCTURAL_BOTTOM_ROWS,
  STRUCTURAL_TOP_ROWS,
  useRasterPixels,
} from '@/client/qr/thirdparty/qrcode.react/useRasterPixels';
import {
  type QrCodeDetails,
  useQRCode,
} from '@/client/qr/thirdparty/qrcode.react/useQRCode';

export type Modules = ReturnType<QrCode['getModules']>;

interface QRProps {
  /**
   * The value to encode into the QR Code.  Will be optimised into segments as necessary.
   */
  value: string;
  /**
   * The Error Correction Level to use.
   * @see https://www.qrcode.com/en/about/error_correction.html
   * @defaultValue L
   */
  level?: ErrorCorrectionLevel;
  /**
   * The background color used to render the QR Code.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
   * @defaultValue #FFFFFF
   */
  bgColor?: string;
  /**
   * The foreground color used to render the QR Code.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
   * @defaultValue #000000
   */
  fgColor?: string;
  /**
   * The title to assign to the QR Code. Used for accessibility reasons.
   */
  title?: string;
  /**
   * The minimum version used when encoding the QR Code. Valid values are 1-40
   * with higher values resulting in more complex QR Codes. The optimal
   * (lowest) version is determined for the `value` provided, using `minVersion`
   * as the lower bound.
   * @defaultValue 1
   */
  minVersion?: number;
  /**
   * If set, makes the overall QR code size such that each module is this many pixels.
   */
  cellSize?: number;
  /**
   * Rendering style for data modules. 'square' (default) fills every module;
   * 'dot' renders data/alignment modules as circles while keeping structural
   * modules (finders, timing, format/version info) square; 'text' splits each
   * module into a 3×3 sub-cell grid where the centre carries the QR value and
   * the outer eight cells show a rasterised text pattern.
   * @defaultValue square
   */
  dotStyle?: 'square' | 'dot' | 'text';
  /**
   * Radius of each dot in dot mode, as a fraction of the module size (0–0.5).
   * A value of 0.5 fills the full cell; 0.25 (default) renders at half diameter.
   * Ignored when dotStyle is not 'dot'.
   * @defaultValue 0.25
   */
  dotRadius?: number;
  /** Text to rasterise into the outer sub-cells of each module in text mode. */
  rasterText?: string;
  /** CSS font-family for raster text rendering. @defaultValue Impact */
  rasterFont?: string;
}
export type QRPropsSVG = QRProps & React.SVGAttributes<SVGSVGElement>;

const DEFAULT_CELL_SIZE = 4;
const DEFAULT_LEVEL: ErrorCorrectionLevel = 'L';
const DEFAULT_BGCOLOR = '#FFFFFF';
const DEFAULT_FGCOLOR = '#000000';
const DEFAULT_MINVERSION = 1;

// ─── Module classifiers ────────────────────────────────────────────────────────

// True for finder/format-info/version-info modules that are rendered as full squares.
// Timing modules are excluded — they get separate narrow-rectangle rendering.
function isStructuralSquareModule(x: number, y: number, size: number): boolean {
  if (x <= 8 && y <= 8) return true; // TL finder + format info
  if (x >= size - 8 && y <= 8) return true; // TR finder + format info
  if (x <= 8 && y >= size - 8) return true; // BL finder + format info
  // Version information blocks (only present in versions 7+, size >= 45)
  if (size >= 45) {
    if (x >= size - 11 && x <= size - 9 && y <= 5) return true;
    if (y >= size - 11 && y <= size - 9 && x <= 5) return true;
  }
  return false;
}

// True for timing modules that lie between the finder zones (not inside them).
// Row 6 and column 6 within a finder zone are overwritten by finder values and
// treated as structural-square modules instead.
function isTimingModule(x: number, y: number, size: number): boolean {
  if (x !== 6 && y !== 6) return false;
  if (x <= 8 && y <= 8) return false; // inside TL finder zone
  if (x >= size - 8 && y <= 8) return false; // inside TR finder zone
  if (x <= 8 && y >= size - 8) return false; // inside BL finder zone
  return true;
}

// Used to exclude structural modules from dot/circle rendering.
function isSquareModule(x: number, y: number, size: number): boolean {
  return isStructuralSquareModule(x, y, size) || isTimingModule(x, y, size);
}

// ─── Path generators ──────────────────────────────────────────────────────────

function generatePath(modules: Modules, margin = 0): string {
  const ops: string[] = [];
  for (const [y, row] of modules.entries()) {
    let start: number | null = null;
    for (const [x, cell] of row.entries()) {
      if (!cell && start !== null) {
        // M0 0h7v1H0z injects the space with the move and drops the comma,
        // saving a char per operation
        ops.push(
          `M${start + margin} ${y + margin}h${x - start}v1H${start + margin}z`,
        );
        start = null;
        continue;
      }

      // end of row, clean up or skip
      if (x === row.length - 1) {
        if (!cell) {
          // We would have closed the op above already so this can only mean
          // 2+ light modules in a row.
          continue;
        }
        if (start === null) {
          // Just a single dark module.
          ops.push(`M${x + margin},${y + margin} h1v1H${x + margin}z`);
        } else {
          // Otherwise finish the current line.
          ops.push(
            `M${start + margin},${y + margin} h${x + 1 - start}v1H${
              start + margin
            }z`,
          );
        }
        continue;
      }

      if (cell && start === null) {
        start = x;
      }
    }
  }
  return ops.join('');
}

// Generates SVG rect paths for timing modules, narrowed to 50% in the perpendicular
// axis and centred. Row-6 modules are full-width, half-height; column-6 modules are
// half-width, full-height.
function generateTimingPath(
  modules: Modules,
  margin: number,
  isDark = true,
): string {
  const size = modules.length;
  const ops: string[] = [];
  for (const [y, row] of modules.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell !== isDark || !isTimingModule(x, y, size)) continue;
      if (y === 6) {
        ops.push(`M${x + margin},${y + margin + 0.25}h1v.5H${x + margin}z`);
      } else {
        ops.push(
          `M${x + margin + 0.25},${y + margin}h.5v1H${x + margin + 0.25}z`,
        );
      }
    }
  }
  return ops.join('');
}

// Generates SVG arc paths for non-square modules that match `isDark`.
function generateDotPath(
  modules: Modules,
  margin: number,
  radius = 0.25,
  isDark = true,
): string {
  const size = modules.length;
  const ops: string[] = [];
  for (const [y, row] of modules.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell === isDark && !isSquareModule(x, y, size)) {
        const sx = x + margin + 0.5 - radius;
        const cy = y + margin + 0.5;
        const d = 2 * radius;
        ops.push(
          `M${sx},${cy}a${radius},${radius} 0 1,0 ${d},0a${radius},${radius} 0 1,0-${d},0`,
        );
      }
    }
  }
  return ops.join('');
}

// Renders data/alignment and timing modules as 3×3 sub-cell grids.
//
// Data/alignment modules: centre sub-cell (dx=1,dy=1) carries the QR value;
//   the eight outer sub-cells carry text pixels for interior rows.
//
// Timing modules: the middle row (horizontal strip, y=6) or middle column
//   (vertical strip, x=6) of three sub-cells carries the QR value; the other
//   six sub-cells carry text pixels for interior rows.
//
// Structural square modules are excluded (handled separately).
// pixelData is sized size*3 wide × (size−17)*3 tall; py is offset by 9 rows.
function generateTextPath(
  modules: Modules,
  margin: number,
  pixelData: Uint8ClampedArray | null,
  size: number,
): string {
  const ops: string[] = [];
  const s = 1 / 3;
  const interiorTop = STRUCTURAL_TOP_ROWS;
  const interiorBottom = size - STRUCTURAL_BOTTOM_ROWS - 1;
  const canvasWidth = size * 3;

  for (const [y, row] of modules.entries()) {
    for (const [x, cell] of row.entries()) {
      if (isStructuralSquareModule(x, y, size)) continue;

      const bx = x + margin;
      const by = y + margin;
      const hasText =
        pixelData !== null && y >= interiorTop && y <= interiorBottom;

      if (isTimingModule(x, y, size)) {
        // Horizontal strip (y=6): middle row of sub-cells is the timing bar.
        // Vertical strip (x=6): middle column of sub-cells is the timing bar.
        const horiz = y === 6;
        if (cell) {
          ops.push(
            horiz
              ? `M${bx},${by + s}h1v${s}H${bx}z`
              : `M${bx + s},${by}h${s}v1H${bx + s}z`,
          );
        }
        if (hasText) {
          for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
              if (horiz ? dy === 1 : dx === 1) continue;
              const i =
                (((y - interiorTop) * 3 + dy) * canvasWidth + x * 3 + dx) * 4;
              if ((pixelData[i] ?? 255) < 128) {
                ops.push(
                  `M${bx + dx * s},${by + dy * s}h${s}v${s}H${bx + dx * s}z`,
                );
              }
            }
          }
        }
      } else {
        // Data/alignment module: centre sub-cell = QR value, outer 8 = text.
        if (cell) {
          ops.push(`M${bx + s},${by + s}h${s}v${s}H${bx + s}z`);
        }
        if (hasText) {
          for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
              if (dx === 1 && dy === 1) continue;
              const i =
                (((y - interiorTop) * 3 + dy) * canvasWidth + x * 3 + dx) * 4;
              if ((pixelData[i] ?? 255) < 128) {
                ops.push(
                  `M${bx + dx * s},${by + dy * s}h${s}v${s}H${bx + dx * s}z`,
                );
              }
            }
          }
        }
      }
    }
  }
  return ops.join('');
}

// ─── Per-style path computation ───────────────────────────────────────────────

// Drawing strategy: the SVG has no global background — it is transparent where
// no module requires colour. Three rendering categories:
//   1. Quiet zone: bgColor even-odd frame around the module grid.
//   2. bgCrisp: structural light squares + any bgColor timing/dot shapes.
//   3. fgCrisp: structural dark squares + any fgColor data shapes.
// Timing modules are always narrowed to 50% in the perpendicular axis.
// Dot mode adds geometricPrecision circle paths; text mode fills the data area
// and uses sub-cell paths.
interface StylePaths {
  /** bgColor paths rendered with crispEdges. */
  bgCrisp: string;
  /** fgColor paths rendered with crispEdges. */
  fgCrisp: string;
  /** bgColor paths rendered with geometricPrecision (dot mode light circles). */
  bgPrecise: string;
  /** fgColor paths rendered with geometricPrecision (dot mode dark circles). */
  fgPrecise: string;
  /** Text mode requires a solid bgColor rect behind the whole data area. */
  needsDataBackground: boolean;
}

function computeStylePaths(
  dotStyle: 'square' | 'dot' | 'text',
  cells: Modules,
  size: number,
  margin: number,
  dotRadius: number,
  pixelData: Uint8ClampedArray | null,
): StylePaths {
  const structuralLight = generatePath(
    cells.map((row, y) =>
      row.map((cell, x) => !cell && isStructuralSquareModule(x, y, size)),
    ),
    margin,
  );
  const structuralDark = generatePath(
    cells.map((row, y) =>
      row.map((cell, x) => cell && isStructuralSquareModule(x, y, size)),
    ),
    margin,
  );

  if (dotStyle === 'square') {
    return {
      bgCrisp: '',
      fgCrisp: generatePath(cells, margin),
      bgPrecise: '',
      fgPrecise: '',
      needsDataBackground: true,
    };
  }

  if (dotStyle === 'dot') {
    return {
      bgCrisp: structuralLight + generateTimingPath(cells, margin, false),
      fgCrisp: structuralDark + generateTimingPath(cells, margin),
      bgPrecise: generateDotPath(cells, margin, dotRadius, false),
      fgPrecise: generateDotPath(cells, margin, dotRadius),
      needsDataBackground: false,
    };
  }

  // text mode
  return {
    bgCrisp: structuralLight,
    fgCrisp: structuralDark + generateTextPath(cells, margin, pixelData, size),
    bgPrecise: '',
    fgPrecise: '',
    needsDataBackground: true,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Hooks ────────────────────────────────────────────────────────────────────

// ─── Components ───────────────────────────────────────────────────────────────

export function QRCodeSVG(
  props: PropsWithoutRef<QRPropsSVG> & RefAttributes<SVGSVGElement>,
): JSX.Element {
  const {
    value,
    level = DEFAULT_LEVEL,
    minVersion = DEFAULT_MINVERSION,
    ref,
  } = props;

  const details = useQRCode({
    value,
    level,
    minVersion,
  });
  if (details instanceof Error) {
    throw details;
  }
  return <QRCodeSVGDetails details={details} {...props} ref={ref} />;
}

export function QRCodeSVGDetails(
  props: Omit<QRPropsSVG, 'value'> & {
    details: QrCodeDetails;
  } & RefAttributes<SVGSVGElement>,
): JSX.Element {
  const {
    details,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    title,
    cellSize = DEFAULT_CELL_SIZE,
    dotStyle = 'square',
    dotRadius = 0.25,
    rasterText = '',
    rasterFont = 'Impact',
    ref,
    ...otherProps
  } = props;

  const { cells, margin, numCells } = details;
  const size = cells.length;
  const pixelData = useRasterPixels(rasterText, rasterFont, size);

  const finalSize = numCells * cellSize;
  const innerWidth = numCells - 2 * margin;

  // Quiet-zone frame: fills the margin band around the module grid.
  const borderPath = `M0,0 h${numCells}v${numCells}H0zM${margin},${margin}h${innerWidth}v${innerWidth}H${margin}z`;

  const { bgCrisp, fgCrisp, bgPrecise, fgPrecise, needsDataBackground } =
    computeStylePaths(dotStyle, cells, size, margin, dotRadius, pixelData);

  return (
    <svg
      height={finalSize}
      width={finalSize}
      style={{
        containIntrinsicHeight: `${finalSize}px`,
        containIntrinsicWidth: `${finalSize}px`,
        contain: 'strict',
      }}
      viewBox={`0 0 ${numCells} ${numCells}`}
      ref={ref}
      role="img"
      {...otherProps}
    >
      {!!title && <title>{title}</title>}
      <path
        fill={bgColor}
        fillRule="evenodd"
        d={borderPath}
        shapeRendering="crispEdges"
      />
      {needsDataBackground && (
        <path
          fill={bgColor}
          d={`M${margin},${margin}h${innerWidth}v${innerWidth}H${margin}z`}
          shapeRendering="crispEdges"
        />
      )}
      <path fill={bgColor} d={bgCrisp} shapeRendering="crispEdges" />
      <path fill={fgColor} d={fgCrisp} shapeRendering="crispEdges" />
      {bgPrecise && (
        <path
          fill={bgColor}
          d={bgPrecise}
          shapeRendering="geometricPrecision"
        />
      )}
      {fgPrecise && (
        <path
          fill={fgColor}
          d={fgPrecise}
          shapeRendering="geometricPrecision"
        />
      )}
    </svg>
  );
}
