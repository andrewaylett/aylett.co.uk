import { describe, expect, it } from '@jest/globals';

import { blankImage, matrixToImage } from './syntheticImage';

import type { Point } from '@/client/qr/decoder/types';

import { analyseImage } from '@/client/qr/decoder/analyseImage';
import { functionModuleMap } from '@/client/qr/decoder/functionModules';
import { Ecc } from '@/client/qr/thirdparty/qrcodegen/Ecc';
import { QrCode } from '@/client/qr/thirdparty/qrcodegen/qrCode';
import { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';

const TEXT = 'HTTPS://WWW.AYLETT.CO.UK/TOOLS/QR/DEBUG?N=12345678';
// v1 byte-mode capacity is 17 chars at L but only 7 at H; this short text
// fits at every ECL level so the describe.each can cover v1 without capacity
// errors when boostEcl=false forces a specific (potentially tight) ECL.
const SHORT_TEXT = 'TEST QR';

const SCALE = 8;
const QUIET = 4;

function textFor(version: number): string {
  return version === 1 ? SHORT_TEXT : TEXT;
}

function encode(version: number, ecc: Ecc = Ecc.MEDIUM): QrCode {
  const text = textFor(version);
  const segs = QrSegment.makeSegments(text, version);
  // boostEcl off so the requested level is what ends up in the symbol.
  return QrCode.encodeSegments(segs, ecc, version, version, -1, false);
}

function expectNear(
  actual: Point,
  x: number,
  y: number,
  tolerance: number,
): void {
  expect(Math.abs(actual.x - x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.y - y)).toBeLessThanOrEqual(tolerance);
}

/** Finds a light module in the data region, for damage tests. */
function findLightDataModule(
  modules: readonly boolean[][],
  version: number,
): { x: number; y: number } {
  const regions = functionModuleMap(version);
  for (const [y, row] of modules.entries()) {
    for (const [x, dark] of row.entries()) {
      if (!dark && regions[y][x] === 'data') {
        return { x, y };
      }
    }
  }
  throw new Error('No light data module found');
}

describe.each([1, 5])('analyseImage at version %i', (version) => {
  it('decodes a clean synthetic image with full geometry', () => {
    const qr = encode(version);
    const image = matrixToImage(qr.getModules(), {
      scale: SCALE,
      quietModules: QUIET,
    });
    const result = analyseImage(image);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const { analysis } = result;
    const size = version * 4 + 17;
    expect(analysis.size).toBe(size);
    expect(analysis.stream?.text).toBe(textFor(version));
    expect(analysis.inverted).toBe(false);
    expect(analysis.mirrored).toBe(false);
    expect(analysis.totalErrorsCorrected).toBe(0);
    expect(analysis.quietZoneViolations).toEqual([]);
    // The synthetic image is pure black on white.
    expect(analysis.threshold.min).toBe(0);
    expect(analysis.threshold.max).toBe(255);
    // Finder centres sit 3.5 modules in from each symbol corner; allow a
    // module of slack for sub-pixel estimation.
    const near = (modules: number): number => (QUIET + modules) * SCALE;
    expectNear(analysis.location.topLeft, near(3.5), near(3.5), SCALE);
    expectNear(analysis.location.topRight, near(size - 3.5), near(3.5), SCALE);
    expectNear(
      analysis.location.bottomLeft,
      near(3.5),
      near(size - 3.5),
      SCALE,
    );
  });
});

describe('analyseImage geometry handling', () => {
  it('finds the alignment pattern from version 2 up', () => {
    const result = analyseImage(matrixToImage(encode(5).getModules()));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const size = 5 * 4 + 17;
    expect(result.analysis.location.alignment).not.toBeNull();
    const alignment = result.analysis.location.alignment ?? { x: 0, y: 0 };
    // The bottom-right alignment pattern is centred 6.5 modules in.
    expectNear(
      alignment,
      (QUIET + size - 6.5) * SCALE,
      (QUIET + size - 6.5) * SCALE,
      SCALE,
    );
  });

  it('decodes a version 7 symbol, which carries version information', () => {
    const result = analyseImage(matrixToImage(encode(7).getModules()));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.version.version).toBe(7);
    expect(result.analysis.version.decodedCopies).toBeDefined();
    expect(result.analysis.version.discrepancy).toBe(false);
    expect(result.analysis.stream?.text).toBe(TEXT);
  });

  it.each([90, 30])('decodes an image rotated by %i degrees', (degrees) => {
    const result = analyseImage(
      matrixToImage(encode(5).getModules(), { rotateDegrees: degrees }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.stream?.text).toBe(TEXT);
    expect(result.analysis.mirrored).toBe(false);
  });

  it('decodes a light-on-dark image and reports it as inverted', () => {
    const result = analyseImage(
      matrixToImage(encode(5).getModules(), { invert: true }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.inverted).toBe(true);
    expect(result.analysis.stream?.text).toBe(TEXT);
  });

  it('maps module space to image pixels', () => {
    const result = analyseImage(matrixToImage(encode(5).getModules()));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // mapToImage is the raw transform: module (0, 0)'s centre is (0.5, 0.5).
    const centre = result.analysis.mapToImage(0.5, 0.5);
    expectNear(centre, (QUIET + 0.5) * SCALE, (QUIET + 0.5) * SCALE, 1);
  });
});

describe('analyseImage damage reporting', () => {
  it('reports dark modules in the quiet zone at exact coordinates', () => {
    const violations = [
      { x: -3, y: 10 },
      { x: 10, y: -2 },
    ];
    const result = analyseImage(
      matrixToImage(encode(5).getModules(), { extraDark: violations }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const sorted = [...result.analysis.quietZoneViolations].sort(
      (a, b) => a.x - b.x || a.y - b.y,
    );
    expect(sorted).toEqual([
      { x: -3, y: 10 },
      { x: 10, y: -2 },
    ]);
  });

  it('corrects a data module flipped dark in the image', () => {
    const qr = encode(5);
    const target = findLightDataModule(qr.getModules(), 5);
    const result = analyseImage(
      matrixToImage(qr.getModules(), { extraDark: [target] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.totalErrorsCorrected).toBeGreaterThanOrEqual(1);
    expect(result.analysis.stream?.text).toBe(TEXT);
    expect(result.analysis.quietZoneViolations).toEqual([]);
  });

  it('fails at the locate stage on a blank image', () => {
    const result = analyseImage(blankImage());
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.stage).toBe('locate');
    expect(result.partial?.threshold).toBeDefined();
    expect(result.partial?.inverted).toBe(false);
  });
});

describe('analyseImage quiet zone truncation', () => {
  it('reports all four sides truncated when the image has no quiet zone', () => {
    // quietModules: 0 means the QR fills the image edge-to-edge; all four
    // quiet zone sides project outside the frame and must be flagged.
    const result = analyseImage(
      matrixToImage(encode(5).getModules(), { quietModules: 0 }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.quietZoneTruncation).toEqual({
      top: true,
      right: true,
      bottom: true,
      left: true,
    });
    expect(result.analysis.quietZoneViolations).toEqual([]);
  });

  it('reports no truncation when the image has a full quiet zone', () => {
    const result = analyseImage(
      matrixToImage(encode(5).getModules(), { quietModules: 4 }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.analysis.quietZoneTruncation).toEqual({
      top: false,
      right: false,
      bottom: false,
      left: false,
    });
  });
});
