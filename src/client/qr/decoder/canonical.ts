/*
 * Rebuilds the "canonical" matrix — the QR code as it should have looked —
 * from corrected data codewords, and diffs it against the sampled matrix.
 *
 * Re-encoding through the vendored generator (rather than patching corrected
 * bits back into the sampled grid) means the diff also surfaces damage to
 * function patterns and format/version information, not just data modules.
 */

import type { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import type { ModuleDiff, ModuleRegion } from '@/client/qr/decoder/types';

import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';

export function buildCanonical(
  version: number,
  ecl: Ecc,
  mask: number,
  dataCodewords: Iterable<number>,
): boolean[][] {
  return new QrCode(version, ecl, [...dataCodewords], mask).getModules();
}

export function diffMatrices(
  sampled: readonly boolean[][],
  canonical: readonly boolean[][],
  regions: readonly ModuleRegion[][],
): ModuleDiff[] {
  const diffs: ModuleDiff[] = [];
  for (const [y, row] of sampled.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell !== canonical[y][x]) {
        diffs.push({
          x,
          y,
          sampled: cell,
          canonical: canonical[y][x],
          region: regions[y][x],
        });
      }
    }
  }
  return diffs;
}
