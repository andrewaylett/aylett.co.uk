/*
 * End-to-end decode of a real photographed QR code, covering the full path
 * from a PNG file through analyseImage to canonical re-encoding.
 *
 * The fixture is a mirrored Skyscanner QR code.  It was chosen because the
 * debugger detected it as mirrored yet still decoded correctly — a case worth
 * pinning so that re-encoding regressions are caught early.
 */

import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { loadPng } from './pngLoader';

import { analyseImage } from '@/client/qr/decoder/analyseImage';

const FIXTURE = join(
  import.meta.dirname,
  '../fixtures/skyscanner-mirrored.png',
);

describe('real image: mirrored Skyscanner QR', () => {
  function getAnalysis() {
    const image = loadPng(FIXTURE);
    const result = analyseImage(image);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.analysis;
  }

  it('decodes to the correct URL', () => {
    const analysis = getAnalysis();
    expect(analysis.stream?.text).toBe('https://www.skyscanner.net');
  });

  it('detects the code as mirrored', () => {
    const analysis = getAnalysis();
    expect(analysis.mirrored).toBe(true);
  });

  it('reports no errors corrected', () => {
    const analysis = getAnalysis();
    expect(analysis.totalErrorsCorrected).toBe(0);
  });

  it('re-encodes with zero diffs after de-mirroring', () => {
    const analysis = getAnalysis();
    // The canonical matrix is rebuilt from corrected codewords; zero diffs
    // means the sampled (de-mirrored) matrix matches the ideal symbol exactly.
    expect(analysis.diffs).toBeDefined();
    expect(analysis.diffs?.length).toBe(0);
  });

  it('reports quiet zone truncated on all four sides', () => {
    const analysis = getAnalysis();
    // The image fills the frame with no quiet zone, so all four sides of the
    // quiet zone project outside the image boundary.
    expect(analysis.quietZoneTruncation).toEqual({
      top: true,
      right: true,
      bottom: true,
      left: true,
    });
    expect(analysis.quietZoneViolations).toEqual([]);
  });

  it('canonical matrix is not the same as the original (mirrored) orientation', () => {
    const analysis = getAnalysis();
    // The source QR was mirrored, so the original pixel at (col, row) maps to
    // sampledMatrix[col][row] (i.e. the transpose of the de-mirrored matrix).
    // The canonical re-encoded symbol is in standard orientation.
    // Verifying they differ explains why the debugger shows a different QR:
    // it displays canonical (unmirrored) rather than the original image.
    const canonical = analysis.canonicalMatrix;
    const sampled = analysis.sampledMatrix;
    expect(canonical).toBeDefined();
    if (!canonical) {
      return;
    }

    const matchesOriginalOrientation = canonical.every((row, y) =>
      row.every((cell, x) => cell === sampled[x][y]),
    );
    expect(matchesOriginalOrientation).toBe(false);
  });
});
