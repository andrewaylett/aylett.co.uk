/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */

import {
  useDebugValue,
  useEffect,
  useState,
  type ForwardRefExoticComponent,
  type PropsWithoutRef,
  type RefAttributes,
  forwardRef,
  type Ref,
  type JSX,
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

const SPEC_MARGIN_SIZE = 4;

// Modified to be exported so the QR debugger can render decoded matrices.
export function generatePath(modules: Modules, margin = 0): string {
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
  if (x <= 8 && y <= 8) {
    return true;
  } // TL finder + format info
  if (x >= size - 8 && y <= 8) {
    return true;
  } // TR finder + format info
  if (x <= 8 && y >= size - 8) {
    return true;
  } // BL finder + format info
  // Version information blocks (only present in versions 7+, size >= 45)
  if (size >= 45) {
    if (x >= size - 11 && x <= size - 9 && y <= 5) {
      return true;
    }
    if (y >= size - 11 && y <= size - 9 && x <= 5) {
      return true;
    }
  }
  return false;
}

// True for timing modules that lie between the finder zones (not inside them).
// Row 6 and column 6 within a finder zone are overwritten by finder values and
// treated as structural-square modules instead.
function isTimingModule(x: number, y: number, size: number): boolean {
  if (x !== 6 && y !== 6) {
    return false;
  }
  if (x <= 8 && y <= 8) {
    return false;
  } // inside TL finder zone
  if (x >= size - 8 && y <= 8) {
    return false;
  } // inside TR finder zone
  if (x <= 8 && y >= size - 8) {
    return false;
  } // inside BL finder zone
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
      if (cell !== isDark || !isTimingModule(x, y, size)) {
        continue;
      }
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

// Structural zones: top 9 rows (TL+TR finders + format info) and bottom 8 rows
// (BL finder + format info). Interior data rows: 9 … size−9 = size−17 rows total.
const STRUCTURAL_TOP_ROWS = 9;
const STRUCTURAL_BOTTOM_ROWS = 8;

// Renders rasterText onto an off-screen canvas covering only the interior data
// area (between the locator squares): width size*3, height (size−17)*3.
// Returns null while loading or when rasterText is empty.
// Stale cached pixels are suppressed by gating the return on rasterText.
function useRasterPixels(
  rasterText: string,
  rasterFont: string,
  size: number,
): Uint8ClampedArray | null {
  const [pixels, setPixels] = useState<Uint8ClampedArray | null>(null);

  useEffect(() => {
    if (!rasterText) {
      return;
    }
    let cancelled = false;

    async function render() {
      const cw = size * 3;
      const ch = Math.max(
        3,
        (size - STRUCTURAL_TOP_ROWS - STRUCTURAL_BOTTOM_ROWS) * 3,
      );
      await document.fonts.load(`bold 72px "${rasterFont}"`);
      if (cancelled) {
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center';

      // Largest font where the actual ink bounds fit — not the nominal em size,
      // so text without descenders (e.g. "QR") can use a larger font.
      let lo = 1,
        hi = Math.max(cw, ch) * 2;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        ctx.font = `bold ${mid}px "${rasterFont}"`;
        const m = ctx.measureText(rasterText);
        const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        // Fall back to font size when actual bounds are unavailable (e.g. jsdom)
        if (m.width <= cw && (inkH > 0 ? inkH : mid) <= ch) {
          lo = mid;
        } else {
          hi = mid;
        }
      }

      // Center by ink bounds rather than the em box so the visual weight sits
      // in the middle of the data region regardless of descenders.
      ctx.font = `bold ${lo}px "${rasterFont}"`;
      const fm = ctx.measureText(rasterText);
      const inkCy =
        fm.actualBoundingBoxAscent > 0
          ? ch / 2 +
            (fm.actualBoundingBoxAscent - fm.actualBoundingBoxDescent) / 2
          : ch / 2;
      ctx.fillText(rasterText, cw / 2, inkCy);

      // After the final await + cancellation check, cancelled is always false here.
      setPixels(ctx.getImageData(0, 0, cw, ch).data);
    }

    render().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [rasterText, rasterFont, size]);

  // When rasterText is empty, suppress any stale cached pixels immediately
  // without needing an extra state update from inside the effect.
  return rasterText ? pixels : null;
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
// Structural square modules are excluded (handled by fgPath/whitePath).
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
      if (isStructuralSquareModule(x, y, size)) {
        continue;
      }

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
              if (horiz ? dy === 1 : dx === 1) {
                continue;
              }
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
              if (dx === 1 && dy === 1) {
                continue;
              }
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

// noinspection JSUnusedGlobalSymbols
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

export function QRCodeSVGDetails({
  dotStyle = 'square',
  ...otherProps
}: Omit<QRPropsSVG, 'value'> & {
  details: QrCodeDetails;
  ref?: Ref<SVGSVGElement> | undefined;
}): JSX.Element {
  return dotStyle === 'square' ? (
    <SquareQRCodeSVGDetails dotStyle="square" {...otherProps} />
  ) : dotStyle === 'dot' ? (
    <DotQRCodeSVGDetails dotStyle="dot" {...otherProps} />
  ) : (
    <TextQRCodeSVGDetails dotStyle="text" {...otherProps} />
  );
}

function SquareQRCodeSVGDetails(
  props: Omit<QRPropsSVG, 'value' | 'dotStyle'> & {
    details: QrCodeDetails;
    ref?: Ref<SVGSVGElement> | undefined;
    dotStyle?: 'square';
  },
): JSX.Element {
  const {
    details,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    title,
    cellSize = DEFAULT_CELL_SIZE,
    ref,
    dotStyle: _dotStyle,
    dotRadius: _dotRadius,
    rasterFont: _rasterFont,
    rasterText: _rasterText,
    ...otherProps
  } = props;

  const { cells, margin, numCells } = details;
  const finalSize = numCells * cellSize;

  // Quiet-zone frame: fills the margin band around the module grid.
  const bgPath = `M0,0 h${numCells}v${numCells}H0z`;

  // 3. fgColor paths differ by style:
  //   square — all dark cells as full squares
  const fgPath = generatePath(cells, margin);

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
        d={bgPath}
        shapeRendering="crispEdges"
      />
      <path fill={bgColor} d={bgPath} shapeRendering="crispEdges" />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
    </svg>
  );
}

function DotQRCodeSVGDetails(
  props: Omit<QRPropsSVG, 'value' | 'dotStyle'> & {
    details: QrCodeDetails;
    ref?: Ref<SVGSVGElement> | undefined;
    dotStyle?: 'dot';
  },
): JSX.Element {
  const {
    details,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    title,
    cellSize = DEFAULT_CELL_SIZE,
    dotRadius = 0.25,
    dotStyle: _dotStyle,
    rasterFont: _rasterFont,
    rasterText: _rasterText,
    ref,
    ...otherProps
  } = props;

  const { cells, margin, numCells } = details;
  const size = cells.length;

  const finalSize = numCells * cellSize;

  // Quiet-zone frame: fills the margin band around the module grid.
  const innerWidth = numCells - 2 * margin;
  const borderPath = `M0,0 h${numCells}v${numCells}H0zM${margin},${margin}h${innerWidth}v${innerWidth}H${margin}z`;

  // 2. bgColor: light structural squares (full 1×1); dot mode also adds light
  //    timing narrow rects (text mode renders timing inside generateTextPath).
  const whitePath =
    generatePath(
      cells.map((row, y) =>
        row.map((cell, x) => !cell && isStructuralSquareModule(x, y, size)),
      ),
      margin,
    ) + generateTimingPath(cells, margin, false);

  // 3. fgColor paths differ by style:
  //   dot    — structural squares + timing narrow rects + per-cell circles
  const fgPath =
    generatePath(
      cells.map((row, y) =>
        row.map((cell, x) => cell && isStructuralSquareModule(x, y, size)),
      ),
      margin,
    ) + generateTimingPath(cells, margin);
  const dotPath = generateDotPath(cells, margin, dotRadius);
  const lightDotPath = generateDotPath(cells, margin, dotRadius, false);

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
      <path fill={bgColor} d={whitePath} shapeRendering="crispEdges" />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
      <path
        fill={bgColor}
        d={lightDotPath}
        shapeRendering="geometricPrecision"
      />
      <path fill={fgColor} d={dotPath} shapeRendering="geometricPrecision" />
    </svg>
  );
}

function TextQRCodeSVGDetails(
  props: Omit<QRPropsSVG, 'value' | 'dotStyle'> & {
    details: QrCodeDetails;
    ref?: Ref<SVGSVGElement> | undefined;
    dotStyle?: 'text';
  },
): JSX.Element {
  const {
    details,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    title,
    cellSize = DEFAULT_CELL_SIZE,
    rasterText = '',
    rasterFont = 'Impact',
    dotStyle: _dotStyle,
    dotRadius: _dotRadius,
    ref,
    ...otherProps
  } = props;

  const { cells, margin, numCells } = details;
  const size = cells.length;
  const pixelData = useRasterPixels(rasterText, rasterFont, size);

  const finalSize = numCells * cellSize;

  // Quiet-zone frame: fills the margin band around the module grid.
  const bgPath = `M0,0 h${numCells}v${numCells}H0z`;

  // 3. fgColor paths differ by style:
  //   text   — structural squares only; timing and data modules handled by
  //            generateTextPath (middle row/col for timing, centre sub-cell
  //            for data, outer sub-cells for text overlay)
  const fgPath = generatePath(
    cells.map((row, y) =>
      row.map((cell, x) => cell && isStructuralSquareModule(x, y, size)),
    ),
    margin,
  );
  const textPath = generateTextPath(cells, margin, pixelData, size);

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
      <path fill={bgColor} d={bgPath} shapeRendering="crispEdges" />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
      <path fill={fgColor} d={textPath} shapeRendering="crispEdges" />
    </svg>
  );
}
