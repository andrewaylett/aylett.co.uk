import type { JSX } from 'react';

import type { ModuleDiff, QuietZoneViolation } from '@/client/qr/decoder/types';

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
  label,
}: {
  matrix: readonly boolean[][];
  diffs?: readonly ModuleDiff[];
  quietZoneViolations?: readonly QuietZoneViolation[];
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
