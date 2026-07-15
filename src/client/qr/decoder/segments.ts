/*
 * parseDataStream: inverts the QR encoder's bit-packing.
 *
 * The encoder (QrCode.encodeSegments) writes: [4-bit mode indicator]
 * [char-count field] [payload bits] … [up-to-4 terminator zero bits]
 * [byte-alignment padding] [alternating 0xEC/0x11 pad bytes].
 *
 * We read the same stream in reverse, reporting each segment with its
 * bit position so a debugger can annotate the raw bitstream visually.
 * Unknown, truncated, or out-of-range segments are wrapped in an UNKNOWN
 * sentinel rather than thrown — the caller sees diagnostics, not an error.
 */

import type { ParsedSegment, StreamReport } from '@/client/qr/decoder/types';

import { Mode } from '@/client/qr/thirdparty/qrcodegen/Mode';
import { BitReader } from '@/client/qr/decoder/bitStream';

// ---------------------------------------------------------------------------
// ECI assignment value → TextDecoder label.
// Unmapped values leave the charset unchanged (keep UTF-8 and report eciValue).
// ---------------------------------------------------------------------------
const ECI_CHARSET: Record<number, string> = {
  1: 'iso-8859-1',
  3: 'iso-8859-1',
  4: 'iso-8859-2',
  20: 'shift-jis',
  25: 'utf-16be',
  26: 'utf8',
  27: 'iso-8859-1', // US-ASCII — iso-8859-1 is a safe superset for decoding
  28: 'big5',
  29: 'gb18030',
  30: 'euc-kr',
};

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

// ---------------------------------------------------------------------------
// ECI value decoding: inverse of QrSegment.makeEci.
// First byte already read from the stream; may need more bits.
// ---------------------------------------------------------------------------
function readEciValue(reader: BitReader, firstByte: number): number {
  if ((firstByte & 0x80) === 0) {
    // Single byte: top bit 0, value is the lower 7 bits.
    return firstByte & 0x7f;
  } else if ((firstByte & 0xc0) === 0x80) {
    // Two-byte form: top bits '10', 14-bit value from low 6 + next 8 bits.
    const low = reader.readBits(8);
    return ((firstByte & 0x3f) << 8) | low;
  } else if ((firstByte & 0xe0) === 0xc0) {
    // Three-byte form: top bits '110', 21-bit value from low 5 + next 16 bits.
    const low = reader.readBits(16);
    return ((firstByte & 0x1f) << 16) | low;
  } else {
    throw new RangeError(
      `Unrecognised ECI lead byte 0x${firstByte.toString(16)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Decode a byte array to a string.
// Before any ECI: try UTF-8 (fatal), fall back to ISO-8859-1.
// After ECI: use the mapped charset, non-fatal.
// ---------------------------------------------------------------------------
function decodeBytes(bytes: readonly number[], charset: string | null): string {
  const buf = new Uint8Array(bytes);
  if (charset === null) {
    // Default: try UTF-8, fall back to Latin-1.
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
      return new TextDecoder('iso-8859-1').decode(buf);
    }
  }
  // After ECI: use the designated charset, non-fatal.
  try {
    return new TextDecoder(charset, { fatal: false }).decode(buf);
  } catch {
    // If the charset label is unrecognised by the runtime, fall back to UTF-8.
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  }
}

// ---------------------------------------------------------------------------
// Main decoder.
// ---------------------------------------------------------------------------
export function parseDataStream(
  data: Uint8Array,
  version: number,
): StreamReport {
  const reader = new BitReader(data);
  const totalBits = data.length * 8;

  const segments: ParsedSegment[] = [];
  const textParts: string[] = [];
  let terminatorBits = 0;
  let paddingBytes: number[] = [];
  let paddingConforms = true;

  // Active charset for BYTE segments: null = default (UTF-8 with fallback).
  let activeCharset: string | null = null;

  while (reader.remaining() >= 4) {
    const segStart = reader.bitPosition;
    let lastModeBits = 0; // tracked so the catch block can report it

    try {
      const modeBits = reader.readBits(4);
      lastModeBits = modeBits;

      if (modeBits === 0x0) {
        // ---- Terminator ----
        // The encoder writes up to 4 zero bits; the stream may already be at
        // capacity, so fewer than 4 may remain (we've already consumed the 4
        // we just read — count those plus any that were consumed as the min).
        // The four bits we read are the terminator; remaining bits after that
        // byte-aligned are padding.
        terminatorBits = Math.min(4, totalBits - segStart);

        // Skip to byte boundary.
        const bitsToAlign = (8 - (reader.bitPosition % 8)) % 8;
        if (bitsToAlign > 0 && reader.remaining() >= bitsToAlign) {
          reader.readBits(bitsToAlign);
        }

        // Collect remaining whole bytes as padding.
        const padList: number[] = [];
        while (reader.remaining() >= 8) {
          padList.push(reader.readBits(8));
        }
        paddingBytes = padList;

        // Verify alternating 0xEC / 0x11 sequence.
        paddingConforms = padList.every(
          (b, i) => b === (i % 2 === 0 ? 0xec : 0x11),
        );
        break;
      }

      // ---- Data segments ----

      switch (modeBits) {
        case Mode.NUMERIC.modeBits: {
          // NUMERIC: 0x1
          const ccBits = Mode.NUMERIC.numCharCountBits(version);
          const count = reader.readBits(ccBits);
          const digits: string[] = [];

          const fullGroups = Math.floor(count / 3);
          const remainder = count % 3;

          for (let i = 0; i < fullGroups; i++) {
            const v = reader.readBits(10);
            if (v >= 1000) {
              throw new RangeError(`Numeric group value ${v} out of range`);
            }
            digits.push(String(v).padStart(3, '0'));
          }
          if (remainder === 2) {
            const v = reader.readBits(7);
            if (v >= 100) {
              throw new RangeError(
                `Numeric remainder-2 value ${v} out of range`,
              );
            }
            digits.push(String(v).padStart(2, '0'));
          } else if (remainder === 1) {
            const v = reader.readBits(4);
            if (v >= 10) {
              throw new RangeError(
                `Numeric remainder-1 value ${v} out of range`,
              );
            }
            digits.push(String(v));
          }

          const numText = digits.join('');
          textParts.push(numText);
          segments.push({
            mode: 'NUMERIC',
            modeBits,
            numChars: count,
            text: numText,
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case Mode.ALPHANUMERIC.modeBits: {
          // ALPHANUMERIC: 0x2
          const ccBits = Mode.ALPHANUMERIC.numCharCountBits(version);
          const count = reader.readBits(ccBits);
          const chars: string[] = [];

          const pairs = Math.floor(count / 2);
          const hasSingle = count % 2 === 1;

          for (let i = 0; i < pairs; i++) {
            const v = reader.readBits(11);
            if (v >= 45 * 45) {
              throw new RangeError(`Alphanumeric pair value ${v} out of range`);
            }
            const first = Math.floor(v / 45);
            const second = v % 45;
            chars.push(
              ALPHANUMERIC_CHARSET[first],
              ALPHANUMERIC_CHARSET[second],
            );
          }
          if (hasSingle) {
            const v = reader.readBits(6);
            if (v >= 45) {
              throw new RangeError(
                `Alphanumeric singleton value ${v} out of range`,
              );
            }
            chars.push(ALPHANUMERIC_CHARSET[v]);
          }

          const alphaText = chars.join('');
          textParts.push(alphaText);
          segments.push({
            mode: 'ALPHANUMERIC',
            modeBits,
            numChars: count,
            text: alphaText,
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case Mode.BYTE.modeBits: {
          // BYTE: 0x4
          const ccBits = Mode.BYTE.numCharCountBits(version);
          const count = reader.readBits(ccBits);
          const bytes: number[] = [];
          for (let i = 0; i < count; i++) {
            bytes.push(reader.readBits(8));
          }
          const byteText = decodeBytes(bytes, activeCharset);
          textParts.push(byteText);
          segments.push({
            mode: 'BYTE',
            modeBits,
            numChars: count,
            text: byteText,
            bytes,
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case Mode.KANJI.modeBits: {
          // KANJI: 0x8
          // 13 bits per character; inverse of Shift-JIS compact encoding.
          const ccBits = Mode.KANJI.numCharCountBits(version);
          const count = reader.readBits(ccBits);
          const kanjiBytes: number[] = [];
          for (let i = 0; i < count; i++) {
            const v = reader.readBits(13);
            // Invert the encoder's compaction: split into high/low bytes.
            let word = (Math.floor(v / 0xc0) << 8) | (v % 0xc0);
            word += word < 0x1f_00 ? 0x81_40 : 0xc1_40;
            kanjiBytes.push((word >>> 8) & 0xff, word & 0xff);
          }
          let kanjiText: string;
          try {
            kanjiText = new TextDecoder('shift-jis').decode(
              new Uint8Array(kanjiBytes),
            );
          } catch {
            kanjiText = new TextDecoder('iso-8859-1').decode(
              new Uint8Array(kanjiBytes),
            );
          }
          textParts.push(kanjiText);
          segments.push({
            mode: 'KANJI',
            modeBits,
            numChars: count,
            text: kanjiText,
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case Mode.ECI.modeBits: {
          // ECI: 0x7
          // Variable-length assignment value (8, 16, or 24 bits total).
          const firstByte = reader.readBits(8);
          const eciValue = readEciValue(reader, firstByte);
          activeCharset = ECI_CHARSET[eciValue] ?? 'utf8';
          segments.push({
            mode: 'ECI',
            modeBits,
            numChars: 0,
            eciValue,
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case 0x5: {
          // FNC1 first position — header-only.
          segments.push({
            mode: 'FNC1',
            modeBits,
            numChars: 0,
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case 0x9: {
          // FNC1 second position — one-byte application indicator follows.
          const indicator = reader.readBits(8);
          segments.push({
            mode: 'FNC1',
            modeBits,
            numChars: 0,
            bytes: [indicator],
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        case 0x3: {
          // STRUCTURED_APPEND — 4-bit symbol index, 4-bit total, 8-bit parity.
          const raw = reader.readBits(16);
          const hi = (raw >>> 8) & 0xff;
          const lo = raw & 0xff;
          segments.push({
            mode: 'STRUCTURED_APPEND',
            modeBits,
            numChars: 0,
            bytes: [hi, lo],
            bitOffset: segStart,
            bitLength: reader.bitPosition - segStart,
          });
          break;
        }

        default: {
          // Unknown mode indicator.
          segments.push({
            mode: 'UNKNOWN',
            modeBits,
            numChars: 0,
            bitOffset: segStart,
            bitLength: totalBits - segStart,
          });
          // Stop parsing — we can't recover from an unknown mode.

          return {
            segments,
            text: textParts.join(''),
            terminatorBits,
            paddingBytes,
            paddingConforms,
          };
        }
      }
    } catch {
      // Truncated or malformed segment — report what we can and stop.
      segments.push({
        mode: 'UNKNOWN' as const,
        modeBits: lastModeBits,
        numChars: 0,
        bitOffset: segStart,
        bitLength: totalBits - segStart,
      });
      break;
    }
  }

  // If the stream ends without a terminator (data exactly fills capacity),
  // terminatorBits stays 0 and paddingConforms stays true — correct per spec.

  return {
    segments,
    text: textParts.join(''),
    terminatorBits,
    paddingBytes,
    paddingConforms,
  };
}
