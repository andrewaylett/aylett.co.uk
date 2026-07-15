import type { JSX } from 'react';

import type {
  AnalysisResult,
  ImageAnalysis,
  ParsedSegment,
  StreamReport,
} from '@/client/qr/decoder/types';

const STAGE_DESCRIPTIONS = {
  locate: 'No QR code could be located in the image.',
  extract: 'A QR code was located but its module grid could not be sampled.',
  format:
    'The format information (error correction level and mask) could not be decoded.',
  correction: 'The damage exceeds what the error correction can repair.',
} as const;

function formatSegment(segment: ParsedSegment): string {
  if (segment.mode === 'ECI') {
    return `ECI(${segment.eciValue ?? '?'})`;
  }
  if (segment.text !== undefined && segment.text !== '') {
    return `${segment.mode}(${JSON.stringify(segment.text)})`;
  }
  return `${segment.mode}(${segment.numChars})`;
}

function formatPadding(stream: StreamReport): string {
  const bytes =
    stream.paddingBytes.length === 0
      ? 'none'
      : stream.paddingBytes
          .map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`)
          .join(' ');
  const conformance = stream.paddingConforms
    ? 'conforms to the standard alternating sequence'
    : 'does NOT conform to the standard alternating sequence';
  return `${stream.terminatorBits} terminator bit(s); padding: ${bytes} (${conformance})`;
}

function yesNo(value: boolean | undefined): string {
  return value ? 'yes' : 'no';
}

/** Renders whatever analysis fields are available — the full set on success,
 * or the partial subset gathered before a failing stage. */
function AnalysisDetails({
  analysis,
}: {
  analysis: Partial<ImageAnalysis>;
}): JSX.Element {
  const { format, version, stream, blocks, threshold } = analysis;
  return (
    <>
      <dl className="columns-half-width">
        {stream && (
          <>
            <dt>Decoded text</dt>
            <dd data-testid="qr-debug-decoded-text">
              {JSON.stringify(stream.text)}
            </dd>
          </>
        )}
        {version && (
          <>
            <dt>Version</dt>
            <dd>
              {version.version} ({version.version * 4 + 17}×
              {version.version * 4 + 17} modules)
              {version.decodedCopies &&
                `; version info bit errors: ${version.decodedCopies
                  .map((c) => c.bitErrors)
                  .join(', ')}`}
              {version.discrepancy &&
                ' — version information disagrees with the symbol size!'}
            </dd>
          </>
        )}
        {format && (
          <>
            <dt>Error correction level</dt>
            <dd data-testid="qr-debug-ecl">{format.ecl}</dd>
            <dt>Mask pattern</dt>
            <dd data-testid="qr-debug-mask">{format.mask}</dd>
            <dt>Format information</dt>
            <dd>
              {format.copies
                .map(
                  (copy, i) =>
                    `copy ${i}: ${copy.rawBits
                      .toString(2)
                      .padStart(15, '0')} (${copy.bitErrors} bit error(s))`,
                )
                .join('; ')}
            </dd>
          </>
        )}
        {stream && (
          <>
            <dt>Segments</dt>
            <dd data-testid="qr-debug-segments">
              {stream.segments.map((s) => formatSegment(s)).join(', ')}
            </dd>
            <dt>Terminator and padding</dt>
            <dd>{formatPadding(stream)}</dd>
          </>
        )}
        {analysis.totalErrorsCorrected !== undefined && (
          <>
            <dt>Codewords corrected</dt>
            <dd data-testid="qr-debug-corrected-count">
              {analysis.totalErrorsCorrected}
            </dd>
          </>
        )}
        <dt>Mirrored</dt>
        <dd>{yesNo(analysis.mirrored)}</dd>
        <dt>Inverted (light-on-dark)</dt>
        <dd>{yesNo(analysis.inverted)}</dd>
        {analysis.remainderBitsSet !== undefined &&
          analysis.remainderBitsSet > 0 && (
            <>
              <dt>Remainder bits unexpectedly dark</dt>
              <dd>{analysis.remainderBitsSet}</dd>
            </>
          )}
        {analysis.quietZoneViolations && (
          <>
            <dt>Quiet zone violations</dt>
            <dd data-testid="qr-debug-quiet-count">
              {analysis.quietZoneViolations.length}
            </dd>
          </>
        )}
        {threshold && (
          <>
            <dt>Binarisation threshold (min/mean/max)</dt>
            <dd>
              {Math.round(threshold.min)}/{Math.round(threshold.mean)}/
              {Math.round(threshold.max)}
            </dd>
          </>
        )}
      </dl>
      {blocks && blocks.length > 0 && (
        <details className="mt-2">
          <summary>Error correction blocks</summary>
          <table className="mx-auto mt-2">
            <thead>
              <tr>
                <th className="px-2">Block</th>
                <th className="px-2">Data codewords</th>
                <th className="px-2">ECC codewords</th>
                <th className="px-2">Corrected</th>
                <th className="px-2">Positions</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.index}>
                  <td className="px-2 text-center">{block.index}</td>
                  <td className="px-2 text-center">{block.dataCodewords}</td>
                  <td className="px-2 text-center">{block.eccCodewords}</td>
                  <td className="px-2 text-center">
                    {block.failed ? 'FAILED' : block.errorsCorrected}
                  </td>
                  <td className="px-2 text-center">
                    {block.errorPositions.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}

export function AnalysisPanel({
  result,
}: {
  result: AnalysisResult<ImageAnalysis>;
}): JSX.Element {
  if (!result.ok) {
    return (
      <section data-testid="qr-debug-analysis">
        <p role="alert">
          <strong>Decode failed at the {result.stage} stage.</strong>{' '}
          {STAGE_DESCRIPTIONS[result.stage]} {result.message}
        </p>
        {result.partial && <AnalysisDetails analysis={result.partial} />}
      </section>
    );
  }
  return (
    <section data-testid="qr-debug-analysis">
      <AnalysisDetails analysis={result.analysis} />
    </section>
  );
}
