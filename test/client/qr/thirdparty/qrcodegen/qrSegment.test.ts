import { describe, expect, it } from '@jest/globals';

import { Mode } from '@/client/qr/thirdparty/qrcodegen/Mode';
import { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';

// Helper: total bits for a single byte-mode segment covering the whole string.
function singleByteBits(text: string, version = 1): number {
  const enc = new TextEncoder();
  const bytes = [...enc.encode(text)];
  return QrSegment.getTotalBits([QrSegment.makeBytes(bytes)], version);
}

describe('QrSegment.makeSegments', () => {
  it('returns [] for empty string', () => {
    expect(QrSegment.makeSegments('')).toEqual([]);
  });

  it('returns a single NUMERIC segment for an all-digit string', () => {
    const segs = QrSegment.makeSegments('12345');
    expect(segs).toHaveLength(1);
    expect(segs[0].mode).toBe(Mode.NUMERIC);
  });

  it('returns a single ALPHANUMERIC segment for an all-alphanumeric string', () => {
    const segs = QrSegment.makeSegments('HELLO WORLD');
    expect(segs).toHaveLength(1);
    expect(segs[0].mode).toBe(Mode.ALPHANUMERIC);
  });

  it('returns a single BYTE segment for a string with lowercase letters only', () => {
    const segs = QrSegment.makeSegments('Hello');
    expect(segs).toHaveLength(1);
    expect(segs[0].mode).toBe(Mode.BYTE);
  });

  it('does not split a short numeric run that is too small to save bits at version 1', () => {
    // 3-digit run: overhead of extracting (4+8 + 4+10 = 26 extra bits) > savings (3*(8-10/3) ≈ 14 bits)
    const segs = QrSegment.makeSegments('abc123def');
    expect(segs).toHaveLength(1);
    expect(segs[0].mode).toBe(Mode.BYTE);
  });

  it('splits a long numeric run in a byte string and reduces total bits', () => {
    // 11-digit suffix — savings (11*(8-10/3) ≈ 51 bits) > overhead (≈ 26 bits)
    const text = 'https://example.com/p=12345678901';
    const segs = QrSegment.makeSegments(text);
    expect(segs.length).toBeGreaterThanOrEqual(2);
    const lastSeg = segs.at(-1);
    expect(lastSeg).toBeDefined();
    expect(lastSeg?.mode).toBe(Mode.NUMERIC);
    expect(QrSegment.getTotalBits(segs, 1)).toBeLessThan(singleByteBits(text));
  });

  it('splits a long alphanumeric run in a byte string and reduces total bits', () => {
    // 18 uppercase+space chars — saves more than the extra segment overhead at version 1
    const text = 'hello WORLD WORLD WORLD';
    const segs = QrSegment.makeSegments(text);
    expect(segs.length).toBeGreaterThanOrEqual(2);
    expect(segs.some((s) => s.mode === Mode.ALPHANUMERIC)).toBe(true);
    expect(QrSegment.getTotalBits(segs, 1)).toBeLessThan(singleByteBits(text));
  });

  it('returns a single NUMERIC segment for all-digit input (fast path)', () => {
    const segs = QrSegment.makeSegments('0000000000');
    expect(segs).toHaveLength(1);
    expect(segs[0].mode).toBe(Mode.NUMERIC);
  });

  it('returns a single ALPHANUMERIC segment for all-QR-alphanumeric input (fast path)', () => {
    const segs = QrSegment.makeSegments('ABCDE 12345');
    expect(segs).toHaveLength(1);
    expect(segs[0].mode).toBe(Mode.ALPHANUMERIC);
  });

  // Versions 10-26 use wider character-count fields (BYTE: 16 bits, NUMERIC: 12 bits)
  // versus versions 1-9 (BYTE: 8 bits, NUMERIC: 10 bits). This raises the minimum
  // numeric-run length that justifies a split: for a middle run, the extra overhead is
  // 8 + 16 + 12 = 36 bits at v10 vs 8 + 8 + 10 = 26 bits at v1. A 7-digit run saves
  // only 32 bits, so it is worth splitting at v1 but not at v10.
  it('splits a 7-digit run at version 1 but not at version 10', () => {
    const text = 'abc1234567def';
    const segsV1 = QrSegment.makeSegments(text, 1);
    const segsV10 = QrSegment.makeSegments(text, 10);
    // v1: splitting saves 32 bits > overhead 26 → 3 segments
    expect(segsV1.length).toBeGreaterThan(1);
    // v10: splitting saves 32 bits < overhead 36 → 1 byte segment
    expect(segsV10).toHaveLength(1);
    expect(segsV10[0].mode).toBe(Mode.BYTE);
    // v10-optimised segments use fewer total bits at v10
    expect(QrSegment.getTotalBits(segsV10, 10)).toBeLessThan(
      QrSegment.getTotalBits(segsV1, 10),
    );
  });
});
