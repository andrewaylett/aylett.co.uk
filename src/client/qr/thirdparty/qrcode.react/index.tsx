/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */

import React, { useMemo } from 'react';

import * as qrcodegen from '../qrcodegen';
import { type QrCode } from '../qrcodegen';

type Modules = ReturnType<qrcodegen.QrCode['getModules']>;
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

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
   * The value to encode into the QR Code. An array of strings can be passed in
   * to represent multiple segments to further optimize the QR Code.
   */
  value: string | string[];
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

export interface DebugDetails {
  qrcode: qrcodegen.QrCode;
  margin: number;
  cells: Modules;
  numCells: number;
  moduleCount: number;
  qrVersion: number;
  level: ErrorCorrectionLevel;
}

interface QrCodeDetails {
  cells: boolean[][];
  margin: number;
  numCells: number;
  qrcode: QrCode;
}

export function useQRCode({
  value,
  level,
  minVersion,
  justError = false,
}: {
  value: string | string[];
  level: ErrorCorrectionLevel;
  minVersion: number;
  justError?: boolean;
}): QrCodeDetails | Error {
  const qrcode = React.useMemo(() => {
    if (justError) {
      return new Error('Deliberately erroring instead of rendering QR Code');
    }
    const values = Array.isArray(value) ? value : [value];
    // eslint-disable-next-line unicorn/no-array-reduce
    const segments = values.reduce<qrcodegen.QrSegment[]>((accum, v) => {
      accum.push(...qrcodegen.QrSegment.makeSegments(v));
      return accum;
    }, []);
    try {
      return qrcodegen.QrCode.encodeSegments(
        segments,
        ERROR_LEVEL_MAP[level],
        minVersion,
        undefined,
        undefined,
        true,
      );
    } catch (error) {
      if (error instanceof Error) {
        return error;
      }
      return new Error(
        `Unknown error when encoding QR Code: ${JSON.stringify(error)}`,
      );
    }
  }, [value, level, minVersion, justError]);

  return React.useMemo((): QrCodeDetails | Error => {
    if (qrcode instanceof Error) {
      return qrcode;
    }

    const cells = qrcode.getModules();

    const margin = SPEC_MARGIN_SIZE;
    const numCells = cells.length + margin * 2;
    return {
      qrcode,
      cells,
      margin,
      numCells,
    };
  }, [qrcode]);
}

export const QRCodeSVG = React.forwardRef<SVGSVGElement, QRPropsSVG>(
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

export function useDebugDetails(details: QrCodeDetails) {
  return useMemo(() => {
    const moduleCount = details.numCells - details.margin * 2;
    const qrVersion = (moduleCount - 17) / 4;
    const level = errorLevelToString(details.qrcode.errorCorrectionLevel);
    return {
      ...details,
      moduleCount,
      qrVersion,
      level,
    };
  }, [details]);
}

export const QRCodeSVGDetails = React.forwardRef<
  SVGSVGElement,
  Omit<QRPropsSVG, 'value'> & { details: QrCodeDetails }
>(function QRCodeSVGDetails(props, forwardedRef) {
  const {
    details,
    bgColor = DEFAULT_BGCOLOR,
    fgColor = DEFAULT_FGCOLOR,
    title,
    cellSize = DEFAULT_CELL_SIZE,
    ...otherProps
  } = props;

  const { cells, margin, numCells } = details;

  const finalSize = numCells * cellSize;

  // Drawing strategy: instead of a rect per module, we're going to create a
  // single path for the dark modules and layer that on top of a light rect,
  // for a total of 2 DOM nodes. We pay a bit more in string concat but that's
  // way faster than DOM ops.
  // For level 1, 441 nodes -> 2
  // For level 40, 31329 -> 2
  const fgPath = generatePath(cells, margin);

  return (
    <svg
      height={finalSize}
      width={finalSize}
      viewBox={`0 0 ${numCells} ${numCells}`}
      ref={forwardedRef}
      role="img"
      {...otherProps}
    >
      {!!title && <title>{title}</title>}
      <path
        fill={bgColor}
        d={`M0,0 h${numCells}v${numCells}H0z`}
        shapeRendering="crispEdges"
      />
      <path fill={fgColor} d={fgPath} shapeRendering="crispEdges" />
    </svg>
  );
});

QRCodeSVG.displayName = 'QRCodeSVG';
