/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */

import {
  useDebugValue,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
  forwardRef,
} from 'react';

import * as qrcodegen from '../qrcodegen';

import type { QrCode, QrSegment } from '../qrcodegen';

type Modules = ReturnType<qrcodegen.QrCode['getModules']>;
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

type ERROR_LEVEL_MAPPED_TYPE = Record<
  ErrorCorrectionLevel,
  typeof qrcodegen.QrCode.Ecc.LOW
>;

const ERROR_LEVEL_MAP: ERROR_LEVEL_MAPPED_TYPE = {
  L: qrcodegen.QrCode.Ecc.LOW,
  M: qrcodegen.QrCode.Ecc.MEDIUM,
  Q: qrcodegen.QrCode.Ecc.QUARTILE,
  H: qrcodegen.QrCode.Ecc.HIGH,
} as const;

function errorLevelToString(
  level: typeof qrcodegen.QrCode.Ecc.LOW,
): ErrorCorrectionLevel {
  switch (level.ordinal) {
    case 0: {
      return 'L';
    }
    case 1: {
      return 'M';
    }
    case 2: {
      return 'Q';
    }
    case 3: {
      return 'H';
    }
    default: {
      throw new Error('Invalid error correction level');
    }
  }
}

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
   * modules (finders, timing, format/version info) square.
   * @defaultValue square
   */
  dotStyle?: 'square' | 'dot';
  /**
   * Radius of each dot in dot mode, as a fraction of the module size (0–0.5).
   * A value of 0.5 fills the full cell; 0.25 (default) renders at half diameter.
   * Ignored when dotStyle is 'square'.
   * @defaultValue 0.25
   */
  dotRadius?: number;
}
export type QRPropsSVG = QRProps & React.SVGAttributes<SVGSVGElement>;

const DEFAULT_CELL_SIZE = 4;
const DEFAULT_LEVEL: ErrorCorrectionLevel = 'L';
const DEFAULT_BGCOLOR = '#FFFFFF';
const DEFAULT_FGCOLOR = '#000000';
const DEFAULT_MINVERSION = 1;

const SPEC_MARGIN_SIZE = 4;

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

export interface DebugDetails {
  qrcode: qrcodegen.QrCode;
  margin: number;
  cells: Modules;
  numCells: number;
  moduleCount: number;
  qrVersion: number;
  level: ErrorCorrectionLevel;
  segments: readonly QrSegment[];
}

interface QrCodeDetails {
  cells: boolean[][];
  margin: number;
  numCells: number;
  qrcode: QrCode;
  segments: readonly QrSegment[];
}

// Returns which character-count-bits group the version belongs to (0, 1, or 2).
// Segments should be re-optimised whenever the actual version lands in a different
// group from the one used to compute them.
function versionGroup(version: number): number {
  return Math.floor((version + 7) / 17);
}

export function useQRCode({
  value,
  level,
  minVersion,
}: {
  value: string;
  level: ErrorCorrectionLevel;
  minVersion: number;
}): QrCodeDetails | Error {
  useDebugValue(value, (v) => `QR: "${v}"`);

  try {
    // Optimise segments for the minimum version, then encode to find the actual version.
    // If the actual version lands in a different ccbits group (1–9, 10–26, 27–40),
    // re-optimise for that version and re-encode — a single retry is sufficient since
    // re-optimised segments can only use fewer bits, never more.
    let segments = qrcodegen.QrSegment.makeSegments(value, minVersion);
    let qrcode = qrcodegen.QrCode.encodeSegments(
      segments,
      ERROR_LEVEL_MAP[level],
      minVersion,
      undefined,
      undefined,
      true,
    );

    if (versionGroup(qrcode.version) !== versionGroup(minVersion)) {
      const reoptimised = qrcodegen.QrSegment.makeSegments(
        value,
        qrcode.version,
      );
      qrcode = qrcodegen.QrCode.encodeSegments(
        reoptimised,
        ERROR_LEVEL_MAP[level],
        minVersion,
        undefined,
        undefined,
        true,
      );
      segments = reoptimised;
    }

    const cells = qrcode.getModules();
    const margin = SPEC_MARGIN_SIZE;
    const numCells = cells.length + margin * 2;
    return {
      qrcode,
      cells,
      margin,
      numCells,
      segments,
    };
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    return new Error(
      `Unknown error when encoding QR Code: ${JSON.stringify(error)}`,
    );
  }
}

export const QRCodeSVG: ForwardRefExoticComponent<
  PropsWithoutRef<QRPropsSVG> & RefAttributes<SVGSVGElement>
> = forwardRef<SVGSVGElement, QRPropsSVG>(
  function QRCodeSVG(props, forwardedRef) {
    const {
      value,
      level = DEFAULT_LEVEL,
      minVersion = DEFAULT_MINVERSION,
    } = props;

    const details = useQRCode({
      value,
      level,
      minVersion,
    });
    if (details instanceof Error) {
      throw details;
    }
    return <QRCodeSVGDetails details={details} {...props} ref={forwardedRef} />;
  },
);

export function useDebugDetails(details: QrCodeDetails): DebugDetails {
  'use memo';
  const moduleCount = details.numCells - details.margin * 2;
  const qrVersion = (moduleCount - 17) / 4;
  const level = errorLevelToString(details.qrcode.errorCorrectionLevel);
  return {
    ...details,
    moduleCount,
    qrVersion,
    level,
    segments: details.segments,
  };
}

export const QRCodeSVGDetails: ForwardRefExoticComponent<
  Omit<QRPropsSVG, 'value'> & {
    details: QrCodeDetails;
  } & React.RefAttributes<SVGSVGElement>
> = forwardRef<
  SVGSVGElement,
  Omit<QRPropsSVG, 'value'> & { details: QrCodeDetails }
>(function QRCodeSVGDetails(props, forwardedRef) {
  const {
    details,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    title,
    cellSize = DEFAULT_CELL_SIZE,
    dotStyle = 'square',
    dotRadius = 0.25,
    ...otherProps
  } = props;

  const { cells, margin, numCells } = details;

  const finalSize = numCells * cellSize;

  // Drawing strategy: no solid background rect — the SVG is transparent where no
  // colour is required. Three categories of explicit fill:
  //   1. Border frame (quiet zone): bgColor even-odd frame.
  //   2. bgColor path: structural light squares + light timing narrow rects.
  //   3. fgColor path: dark squares (or structural squares in dot mode) + dark timing
  //      narrow rects. In dot mode, per-cell circles replace data/alignment modules.
  // Timing modules are always rendered as 50%-width rectangles centred on the cell,
  // full-length in the timing direction, half-width in the perpendicular direction.
  const size = cells.length;

  // 1. Quiet-zone frame: fills the margin band around the modules grid.
  const innerWidth = numCells - 2 * margin;
  const borderPath = `M0,0 h${numCells}v${numCells}H0zM${margin},${margin}h${innerWidth}v${innerWidth}H${margin}z`;

  // 2. bgColor: light structural squares (full 1×1); dot mode also adds light timing narrow rects.
  const whitePath =
    generatePath(
      cells.map((row, y) =>
        row.map((cell, x) => !cell && isStructuralSquareModule(x, y, size)),
      ),
      margin,
    ) + (dotStyle === 'dot' ? generateTimingPath(cells, margin, false) : '');

  // 3. fgColor: in square mode, all dark cells as full squares; in dot mode, structural
  //    squares + narrow timing rects, with per-cell circles for data/alignment modules.
  const fgPath =
    dotStyle === 'dot'
      ? generatePath(
          cells.map((row, y) =>
            row.map((cell, x) => cell && isStructuralSquareModule(x, y, size)),
          ),
          margin,
        ) + generateTimingPath(cells, margin)
      : generatePath(cells, margin);
  const dotPath =
    dotStyle === 'dot' ? generateDotPath(cells, margin, dotRadius) : null;
  const lightDotPath =
    dotStyle === 'dot'
      ? generateDotPath(cells, margin, dotRadius, false)
      : null;

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
      ref={forwardedRef}
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
      <path fill={bgColor} d={whitePath} shapeRendering="crispEdges" />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
      {lightDotPath && (
        <path
          fill={bgColor}
          d={lightDotPath}
          shapeRendering="geometricPrecision"
        />
      )}
      {dotPath && (
        <path fill={fgColor} d={dotPath} shapeRendering="geometricPrecision" />
      )}
    </svg>
  );
});

QRCodeSVG.displayName = 'QRCodeSVG';
