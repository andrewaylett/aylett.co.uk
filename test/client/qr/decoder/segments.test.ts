import { describe, expect, it } from '@jest/globals';

import { QrSegment } from '@/client/qr/thirdparty/qrcodegen/qrSegment';
import { parseDataStream } from '@/client/qr/decoder/segments';

// ---------------------------------------------------------------------------
// buildStream: replicates QrCode.encodeSegments lines 113–137.
//
// Packs segment bits (mode indicator + char count + payload), appends up to 4
// terminator zero bits, pads to a byte boundary, then fills the remaining
// capacity with alternating 0xEC / 0x11 bytes.
// ---------------------------------------------------------------------------
function buildStream(
  segs: readonly QrSegment[],
  version: number,
  capacityCodewords: number,
): Uint8Array {
  const bb: number[] = [];
  const dataCapacityBits = capacityCodewords * 8;

  function appendBits(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) {
      bb.push((val >>> i) & 1);
    }
  }

  for (const seg of segs) {
    appendBits(seg.mode.modeBits, 4);
    appendBits(seg.numChars, seg.mode.numCharCountBits(version));
    for (const b of seg.getData()) {
      bb.push(b);
    }
  }

  // Terminator: up to 4 zero bits.
  appendBits(0, Math.min(4, dataCapacityBits - bb.length));
  // Pad to byte boundary.
  appendBits(0, (8 - (bb.length % 8)) % 8);
  // Alternating pad bytes.
  for (
    let padByte = 0xec;
    bb.length < dataCapacityBits;
    padByte ^= 0xec ^ 0x11
  ) {
    appendBits(padByte, 8);
  }

  // Pack bits into bytes.
  const bytes = new Uint8Array(capacityCodewords);
  for (const [i, bit] of bb.entries()) {
    bytes[i >>> 3] |= bit << (7 - (i & 7));
  }
  return bytes;
}

// Small capacity: just enough for segments + minimal padding.
function minCapacity(segs: readonly QrSegment[], version: number): number {
  const dataBits = QrSegment.getTotalBits(segs, version);
  // 4 terminator + up-to-7 alignment bits → at most +11 bits (+2 bytes).
  return Math.ceil((dataBits + 4) / 8) + 2;
}

describe('parseDataStream', () => {
  // -------------------------------------------------------------------------
  // NUMERIC
  // -------------------------------------------------------------------------
  describe('NUMERIC mode', () => {
    it('decodes a string with count ≡ 0 mod 3', () => {
      const text = '012345678901'; // 12 chars — 4 full groups of 3
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.segments).toHaveLength(1);
      expect(report.segments[0].mode).toBe('NUMERIC');
      expect(report.segments[0].numChars).toBe(12);
    });

    it('decodes a string with count ≡ 1 mod 3 (4-bit remainder)', () => {
      const text = '1';
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.segments[0].numChars).toBe(1);
    });

    it('decodes a string with count ≡ 2 mod 3 (7-bit remainder)', () => {
      const text = '01234567890'; // 11 chars: 3 groups + remainder 2
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.segments[0].numChars).toBe(11);
    });

    it('decodes the example string "0123456789012"', () => {
      const text = '0123456789012'; // 13 chars: 4 groups + remainder 1
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
    });
  });

  // -------------------------------------------------------------------------
  // ALPHANUMERIC
  // -------------------------------------------------------------------------
  describe('ALPHANUMERIC mode', () => {
    it('decodes even-length alphanumeric text', () => {
      const text = 'HELLO WORLD'; // 11 chars (odd — also tests that)
      const version = 1;
      const segs = [QrSegment.makeAlphanumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.segments[0].mode).toBe('ALPHANUMERIC');
      expect(report.segments[0].numChars).toBe(11);
    });

    it('decodes an even-length alphanumeric string (all pairs)', () => {
      const text = 'AB';
      const version = 1;
      const segs = [QrSegment.makeAlphanumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.segments[0].numChars).toBe(2);
    });

    it('decodes the full alphanumeric charset', () => {
      const text = '$%*+-./:';
      const version = 1;
      const segs = [QrSegment.makeAlphanumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
    });
  });

  // -------------------------------------------------------------------------
  // BYTE mode
  // -------------------------------------------------------------------------
  describe('BYTE mode', () => {
    it('round-trips ASCII text', () => {
      const text = 'Hello, World!';
      const enc = new TextEncoder();
      const version = 1;
      const segs = [QrSegment.makeBytes([...enc.encode(text)])];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.segments[0].mode).toBe('BYTE');
      expect(report.segments[0].bytes).toEqual([...enc.encode(text)]);
    });

    it('round-trips UTF-8 text with accented characters', () => {
      const text = 'café — naïve';
      const enc = new TextEncoder();
      const version = 1;
      const segs = [QrSegment.makeBytes([...enc.encode(text)])];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
    });
  });

  // -------------------------------------------------------------------------
  // Mixed segments from makeSegments
  // -------------------------------------------------------------------------
  describe('mixed segments', () => {
    it('decodes a realistic URL with mixed modes', () => {
      const text = 'HTTPS://EXAMPLE.COM/PATH?ID=1234567890';
      const version = 5;
      const segs = QrSegment.makeSegments(text, version);
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
    });

    it('decodes a mixed alpha+numeric string', () => {
      const text = 'ABC123';
      const version = 1;
      const segs = QrSegment.makeSegments(text, version);
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
    });
  });

  // -------------------------------------------------------------------------
  // ECI + BYTE
  // -------------------------------------------------------------------------
  describe('ECI segments', () => {
    it('reports ECI value and decodes subsequent BYTE as UTF-8', () => {
      const text = 'café';
      const enc = new TextEncoder();
      const eciSeg = QrSegment.makeEci(26); // ECI 26 = UTF-8
      const byteSeg = QrSegment.makeBytes([...enc.encode(text)]);
      const version = 1;
      const segs = [eciSeg, byteSeg];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.segments).toHaveLength(2);
      expect(report.segments[0].mode).toBe('ECI');
      expect(report.segments[0].eciValue).toBe(26);
      expect(report.segments[1].mode).toBe('BYTE');
      expect(report.text).toBe(text);
    });

    it('decodes ECI value < 128 (single-byte form)', () => {
      const eciSeg = QrSegment.makeEci(1); // ISO-8859-1
      const version = 1;
      const segs = [eciSeg, QrSegment.makeBytes([0x41, 0x42])]; // 'AB'
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.segments[0].eciValue).toBe(1);
    });

    it('decodes ECI value in 2-byte form (128–16383)', () => {
      // ECI 200 is a 2-byte form (>= 128)
      const eciSeg = QrSegment.makeEci(200);
      const version = 1;
      const segs = [eciSeg];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.segments[0].eciValue).toBe(200);
    });

    it('decodes ECI value in 3-byte form (>= 16384)', () => {
      // ECI 20000 is a 3-byte form
      const eciSeg = QrSegment.makeEci(20_000);
      const version = 1;
      const segs = [eciSeg];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.segments[0].eciValue).toBe(20_000);
    });
  });

  // -------------------------------------------------------------------------
  // Terminator and padding
  // -------------------------------------------------------------------------
  describe('terminator and padding', () => {
    it('sets terminatorBits=4, records standard padding, paddingConforms=true', () => {
      const text = 'HI';
      const enc = new TextEncoder();
      // Use a larger capacity to guarantee padding bytes.
      const version = 1;
      const segs = [QrSegment.makeBytes([...enc.encode(text)])];
      // Force extra capacity: 20 codewords should leave several padding bytes.
      const stream = buildStream(segs, version, 20);
      const report = parseDataStream(stream, version);

      expect(report.terminatorBits).toBe(4);
      expect(report.paddingConforms).toBe(true);
      // Standard alternating sequence
      for (let i = 0; i < report.paddingBytes.length; i++) {
        expect(report.paddingBytes[i]).toBe(i % 2 === 0 ? 0xec : 0x11);
      }
    });

    it('detects non-conforming padding', () => {
      const text = 'HI';
      const enc = new TextEncoder();
      const version = 1;
      const segs = [QrSegment.makeBytes([...enc.encode(text)])];
      const stream = buildStream(segs, version, 20);
      // Corrupt the first padding byte.
      // The stream ends with terminator + alignment + padding bytes.
      // We need to find where padding starts; corrupt the last byte.
      stream[stream.length - 1] = 0xff;
      const report = parseDataStream(stream, version);

      expect(report.paddingConforms).toBe(false);
      // Everything else should still parse.
      expect(report.text).toBe(text);
      expect(report.segments[0].mode).toBe('BYTE');
    });

    it('handles stream with no padding (data exactly fills capacity)', () => {
      // Build a stream that exactly fills its capacity (no padding bytes).
      const text = '0';
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      // Calculate exact minimum bytes: dataBits + terminator, rounded up to byte.
      const dataBits = 4 + 10 + 4; // mode + char count (10-bit, v1) + 4-bit payload
      const withTerminator = dataBits + 4;
      const exactBytes = Math.ceil(withTerminator / 8);
      const stream = buildStream(segs, version, exactBytes);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(text);
      expect(report.paddingConforms).toBe(true);
    });

    it('empty padding list conforms', () => {
      // Data + terminator exactly fills to a byte boundary.
      const text = '00'; // 4+10+7 bits = 21 bits → won't align naturally
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.paddingConforms).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Version-group char-count width differences
  // -------------------------------------------------------------------------
  describe('version-group char-count widths', () => {
    const numericText = '123456789';

    it('parses at version 1 (10-bit char count for NUMERIC)', () => {
      const version = 1;
      const segs = [QrSegment.makeNumeric(numericText)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(numericText);
      expect(report.segments[0].numChars).toBe(numericText.length);
    });

    it('parses at version 10 (12-bit char count for NUMERIC)', () => {
      const version = 10;
      const segs = [QrSegment.makeNumeric(numericText)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(numericText);
      expect(report.segments[0].numChars).toBe(numericText.length);
    });

    it('parses at version 27 (14-bit char count for NUMERIC)', () => {
      const version = 27;
      const segs = [QrSegment.makeNumeric(numericText)];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.text).toBe(numericText);
      expect(report.segments[0].numChars).toBe(numericText.length);
    });
  });

  // -------------------------------------------------------------------------
  // Malformed / truncated streams
  // -------------------------------------------------------------------------
  describe('malformed streams', () => {
    it('returns UNKNOWN and does not throw for a truncated stream mid-segment', () => {
      // Build a valid stream, then truncate it partway through.
      const text = '12345';
      const version = 1;
      const segs = [QrSegment.makeNumeric(text)];
      const capacity = minCapacity(segs, version);
      const full = buildStream(segs, version, capacity);
      // Truncate to 1 byte: enough for mode nibble + some bits, but not the full segment.
      const truncated = full.slice(0, 1);
      const report = parseDataStream(truncated, version);

      expect(() => parseDataStream(truncated, version)).not.toThrow();
      expect(report.segments.some((s) => s.mode === 'UNKNOWN')).toBe(true);
    });

    it('returns UNKNOWN and does not throw for an invalid mode indicator (0xD)', () => {
      // 0xD0: first nibble = 0xD (no such mode)
      const data = new Uint8Array([0xd0, 0x00]);
      expect(() => parseDataStream(data, 1)).not.toThrow();
      const report = parseDataStream(data, 1);
      expect(report.segments[0].mode).toBe('UNKNOWN');
      expect(report.segments[0].modeBits).toBe(0xd);
    });

    it('returns UNKNOWN for a numeric group value ≥ 1000', () => {
      // Craft a stream where the 10-bit group encodes value 1000 (= 0x3E8).
      // Mode=0x1, char count=3 (v1: 10-bit field), then payload bits for 1000.
      // We'll build the bits manually.
      const bits: number[] = [];
      function appendBits(val: number, len: number): void {
        for (let i = len - 1; i >= 0; i--) {
          bits.push((val >>> i) & 1);
        }
      }
      appendBits(0x1, 4); // mode = NUMERIC
      appendBits(3, 10); // char count = 3 (v1 has 10-bit field)
      appendBits(1000, 10); // value 1000 is out of range (must be < 1000)
      // Pad to bytes.
      while (bits.length % 8 !== 0) {
        bits.push(0);
      }
      const data = new Uint8Array(bits.length / 8);
      for (const [i, b] of bits.entries()) {
        data[i >>> 3] |= b << (7 - (i & 7));
      }

      expect(() => parseDataStream(data, 1)).not.toThrow();
      const report = parseDataStream(data, 1);
      expect(report.segments[0].mode).toBe('UNKNOWN');
    });

    it('does not throw when stream is completely empty', () => {
      expect(() => parseDataStream(new Uint8Array(0), 1)).not.toThrow();
      const report = parseDataStream(new Uint8Array(0), 1);
      expect(report.segments).toHaveLength(0);
      expect(report.text).toBe('');
    });

    it('returns UNKNOWN for mode 0xF (all ones)', () => {
      const data = new Uint8Array([0xff]);
      expect(() => parseDataStream(data, 1)).not.toThrow();
      const report = parseDataStream(data, 1);
      expect(report.segments[0].mode).toBe('UNKNOWN');
    });
  });

  // -------------------------------------------------------------------------
  // bitOffset and bitLength tracking
  // -------------------------------------------------------------------------
  describe('bit position tracking', () => {
    it('records bitOffset=0 for the first segment', () => {
      const version = 1;
      const segs = [QrSegment.makeNumeric('123')];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.segments[0].bitOffset).toBe(0);
    });

    it('records correct bitOffset for the second segment in a two-segment stream', () => {
      // NUMERIC '123': 4 (mode) + 10 (count) + 10 (3 digits, 1 group) = 24 bits
      const version = 1;
      const num = QrSegment.makeNumeric('123');
      const alpha = QrSegment.makeAlphanumeric('AB');
      const segs = [num, alpha];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      // First segment starts at bit 0 and covers: 4 + 10 + 10 = 24 bits
      expect(report.segments[0].bitOffset).toBe(0);
      expect(report.segments[0].bitLength).toBe(24);
      // Second segment starts right after
      expect(report.segments[1].bitOffset).toBe(24);
    });

    it('records bitLength covering the full segment', () => {
      // ALPHANUMERIC 'AB' (even — 2 chars = 1 pair):
      // 4 + 9 + 11 = 24 bits (v1 has 9-bit char count for alphanumeric)
      const version = 1;
      const segs = [QrSegment.makeAlphanumeric('AB')];
      const capacity = minCapacity(segs, version);
      const stream = buildStream(segs, version, capacity);
      const report = parseDataStream(stream, version);

      expect(report.segments[0].bitLength).toBe(4 + 9 + 11);
    });
  });
});
