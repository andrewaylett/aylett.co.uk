/*
 * Builds a per-module region map that mirrors the encoder's drawing order exactly.
 *
 * The key insight is that the encoder's `isFunction` set is determined by
 * last-writer-wins: timing first, then finder (which overwrites timing), then
 * alignment (which overwrites timing), then format (which overwrites everything
 * it touches), then the always-dark module, then version blocks.  We replicate
 * that order here so that `extractCodewords` sees exactly the same non-data set
 * as the encoder's `isFunction` did.
 */

import type { ModuleRegion } from '@/client/qr/decoder/types';

/**
 * Returns the alignment pattern centre positions for the given version, using
 * the same formula as QrCode.getAlignmentPatternPositions().
 */
export function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }
  const numAlign = Math.floor(version / 7) + 2;
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const size = version * 4 + 17;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

/**
 * Returns a size×size grid classifying every module's region.
 *
 * Drawing order mirrors drawFunctionPatterns so that last-writer-wins
 * resolves overlaps identically to the encoder's isFunction tracking.
 */
export function functionModuleMap(version: number): ModuleRegion[][] {
  const size = version * 4 + 17;

  // Initialise everything as data.
  const grid: ModuleRegion[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, (): ModuleRegion => 'data'),
  );

  const set = (x: number, y: number, region: ModuleRegion): void => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      grid[y][x] = region;
    }
  };

  // 1. Timing strips — row 6 and column 6.
  for (let i = 0; i < size; i++) {
    set(6, i, 'timing');
    set(i, 6, 'timing');
  }

  // 2. Finder patterns (9×9 including separator), centred at the three corners.
  //    The encoder draws them as 9×9 squares clipped to bounds.
  const finderCentres: [number, number][] = [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ];
  for (const [cx, cy] of finderCentres) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        set(cx + dx, cy + dy, 'finder');
      }
    }
  }

  // 3. Alignment patterns — 5×5 blocks at each (row, col) centre pair,
  //    skipping the three combinations that overlap finder corners.
  const pos = getAlignmentPatternPositions(version);
  const numAlign = pos.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      // Skip the three finder-corner positions.
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === numAlign - 1) ||
        (i === numAlign - 1 && j === 0)
      ) {
        continue;
      }
      const cx = pos[i];
      const cy = pos[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(cx + dx, cy + dy, 'alignment');
        }
      }
    }
  }

  // 4. Format information — both copies, exact positions from drawFormatBits.
  //    Copy 1: wraps the top-left finder.
  for (let i = 0; i <= 5; i++) {
    set(8, i, 'format');
  } // x=8, y=0..5 → bit i
  set(8, 7, 'format'); // bit 6
  set(8, 8, 'format'); // bit 7
  set(7, 8, 'format'); // bit 8
  for (let i = 9; i < 15; i++) {
    set(14 - i, 8, 'format');
  } // x=5..0, y=8 → bits 9..14

  //    Copy 2: top-right strip and bottom-left strip.
  for (let i = 0; i < 8; i++) {
    set(size - 1 - i, 8, 'format');
  } // bits 0..7
  for (let i = 8; i < 15; i++) {
    set(8, size - 15 + i, 'format');
  } // bits 8..14

  // 5. Always-dark module — (8, size−8).  Written by drawFormatBits as part of
  //    copy 2's "always dark" sentinel; we give it its own region label.
  set(8, size - 8, 'dark');

  // 6. Version information blocks for v7+.
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      // Copy 1: setFunctionModule(a, b, ...) → x=a, y=b
      set(a, b, 'version');
      // Copy 2: setFunctionModule(b, a, ...) → x=b, y=a
      set(b, a, 'version');
    }
  }

  return grid;
}
