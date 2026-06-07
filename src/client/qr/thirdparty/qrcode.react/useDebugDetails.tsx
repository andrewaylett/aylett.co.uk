import type { QrCode, QrSegment } from '@/client/qr/thirdparty/qrcodegen';
import type { Modules } from '@/client/qr/thirdparty/qrcode.react/index';
import type { QrCodeDetails } from '@/client/qr/thirdparty/qrcode.react/useQRCode';

import {
  type ErrorCorrectionLevel,
  errorLevelToString,
} from '@/client/qr/thirdparty/qrcode.react/errorCorrectionLevel';

export interface DebugDetails {
  qrcode: QrCode;
  margin: number;
  cells: Modules;
  numCells: number;
  moduleCount: number;
  qrVersion: number;
  level: ErrorCorrectionLevel;
  segments: readonly QrSegment[];
}

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
