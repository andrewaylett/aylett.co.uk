import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
type ERROR_LEVEL_MAPPED_TYPE = Record<ErrorCorrectionLevel, Ecc>;
export const ERROR_LEVEL_MAP: ERROR_LEVEL_MAPPED_TYPE = {
  L: Ecc.LOW,
  M: Ecc.MEDIUM,
  Q: Ecc.QUARTILE,
  H: Ecc.HIGH,
} as const;

export function errorLevelToString(level: Ecc): ErrorCorrectionLevel {
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
