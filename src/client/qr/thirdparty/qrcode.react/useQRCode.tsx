import { useDebugValue } from 'react';

import {
  ERROR_LEVEL_MAP,
  type ErrorCorrectionLevel,
} from './errorCorrectionLevel';

import { QrCode, QrSegment } from '@/client/qr/thirdparty/qrcodegen';

const SPEC_MARGIN_SIZE = 4;

export interface QrCodeDetails {
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
    let segments = QrSegment.makeSegments(value, minVersion);
    let qrcode = QrCode.encodeSegments(
      segments,
      ERROR_LEVEL_MAP[level],
      minVersion,
      undefined,
      undefined,
      true,
    );

    if (versionGroup(qrcode.version) !== versionGroup(minVersion)) {
      const reoptimised = QrSegment.makeSegments(value, qrcode.version);
      qrcode = QrCode.encodeSegments(
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
