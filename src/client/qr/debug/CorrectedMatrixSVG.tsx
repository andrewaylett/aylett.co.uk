import type { JSX } from 'react';

import type {
  ModuleDiff,
  QuietZoneTruncation,
  QuietZoneViolation,
} from '@/client/qr/decoder/types';

import { generatePath } from '@/client/qr/thirdparty/qrcode.react';

/** The specification's quiet zone, also used as the drawing margin so
 * quiet-zone violations can be overlaid in their true positions. */
const MARGIN = 4;

/**
 * Renders the corrected (canonical) QR matrix, overlaying the modules whose
 * sampled value needed error correction in red and any dark quiet-zone
 * intrusions in amber.
 */
export function CorrectedMatrixSVG({
  matrix,
  diffs = [],
  quietZoneViolations = [],
  quietZoneTruncation,
  label,
}: {
  matrix: readonly boolean[][];
  diffs?: readonly ModuleDiff[];
  quietZoneViolations?: readonly QuietZoneViolation[];
  quietZoneTruncation?: QuietZoneTruncation;
  label: string;
}): JSX.Element {
  const numCells = matrix.length + MARGIN * 2;
  return (
    <svg
      viewBox={`0 0 ${numCells} ${numCells}`}
      className="mx-auto w-full max-w-96"
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      data-testid="qr-debug-corrected-svg"
    >
      <rect width={numCells} height={numCells} fill="#FFFFFF" />
      {quietZoneTruncation?.top && (
        <rect
          x={0}
          y={0}
          width={numCells}
          height={MARGIN}
          fill="#9CA3AF"
          fillOpacity={0.35}
          data-testid="qr-debug-quiet-truncation-top"
        />
      )}
      {quietZoneTruncation?.bottom && (
        <rect
          x={0}
          y={numCells - MARGIN}
          width={numCells}
          height={MARGIN}
          fill="#9CA3AF"
          fillOpacity={0.35}
          data-testid="qr-debug-quiet-truncation-bottom"
        />
      )}
      {quietZoneTruncation?.left && (
        <rect
          x={0}
          y={0}
          width={MARGIN}
          height={numCells}
          fill="#9CA3AF"
          fillOpacity={0.35}
          data-testid="qr-debug-quiet-truncation-left"
        />
      )}
      {quietZoneTruncation?.right && (
        <rect
          x={numCells - MARGIN}
          y={0}
          width={MARGIN}
          height={numCells}
          fill="#9CA3AF"
          fillOpacity={0.35}
          data-testid="qr-debug-quiet-truncation-right"
        />
      )}
      <path
        d={generatePath(
          matrix.map((row) => [...row]),
          MARGIN,
        )}
        fill="#000000"
      />
      {diffs.map(({ x, y }) => (
        <rect
          key={`diff-${x}-${y}`}
          x={x + MARGIN}
          y={y + MARGIN}
          width={1}
          height={1}
          fill="#DC2626"
          fillOpacity={0.65}
          data-testid="qr-debug-corrected-module"
        />
      ))}
      {quietZoneViolations.map(({ x, y }) => (
        <rect
          key={`quiet-${x}-${y}`}
          x={x + MARGIN}
          y={y + MARGIN}
          width={1}
          height={1}
          fill="#F59E0B"
          fillOpacity={0.8}
          data-testid="qr-debug-quiet-violation"
        />
      ))}
    </svg>
  );
}
