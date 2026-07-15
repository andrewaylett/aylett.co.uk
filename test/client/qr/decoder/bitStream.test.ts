import { describe, expect, it } from '@jest/globals';

import { BitReader } from '@/client/qr/decoder/bitStream';

describe('BitReader', () => {
  describe('basic reads', () => {
    it('reads all bits from a single byte', () => {
      // 0b10110001 = 177
      const reader = new BitReader(new Uint8Array([0b1011_0001]));
      expect(reader.readBits(8)).toBe(0b1011_0001);
    });

    it('reads 4-bit nibbles correctly (MSB first)', () => {
      // 0xAB: high nibble = 0xA, low nibble = 0xB
      const reader = new BitReader(new Uint8Array([0xab]));
      expect(reader.readBits(4)).toBe(0xa);
      expect(reader.readBits(4)).toBe(0xb);
    });

    it('reads bits across a byte boundary', () => {
      // 0xFF 0x00 = 1111_1111 0000_0000
      // Reading 12 bits: 1111_1111_0000 = 0xFF0 = 4080
      const reader = new BitReader(new Uint8Array([0xff, 0x00]));
      expect(reader.readBits(12)).toBe(0xf_f0);
    });

    it('reads 0 bits and returns 0', () => {
      const reader = new BitReader(new Uint8Array([0xff]));
      expect(reader.readBits(0)).toBe(0);
      expect(reader.bitPosition).toBe(0);
    });

    it('reads up to 24 bits spanning 3 bytes', () => {
      const reader = new BitReader(new Uint8Array([0x01, 0x02, 0x03]));
      // 0x01_02_03 = 66051
      expect(reader.readBits(24)).toBe(0x01_02_03);
    });

    it('reads successive fields matching encoder output', () => {
      // Simulate: 4-bit mode = 0x1, 10-bit count = 13, then some payload bits
      // Pack: 0001 00000 01101 ... = 0b00010000001101 padded to bytes
      // bits: 0001_0000_0011_0100_0000_0000
      //        0x10   0x34   0x00
      const reader = new BitReader(new Uint8Array([0x10, 0x34, 0x00]));
      expect(reader.readBits(4)).toBe(0x1); // mode indicator
      expect(reader.readBits(10)).toBe(13); // char count
    });
  });

  describe('bitPosition and remaining', () => {
    it('starts at position 0', () => {
      const reader = new BitReader(new Uint8Array([0x00]));
      expect(reader.bitPosition).toBe(0);
      expect(reader.remaining()).toBe(8);
    });

    it('advances bitPosition correctly', () => {
      const reader = new BitReader(new Uint8Array([0xab, 0xcd]));
      reader.readBits(4);
      expect(reader.bitPosition).toBe(4);
      expect(reader.remaining()).toBe(12);
      reader.readBits(8);
      expect(reader.bitPosition).toBe(12);
      expect(reader.remaining()).toBe(4);
    });

    it('reports 0 remaining after full consumption', () => {
      const reader = new BitReader(new Uint8Array([0x42]));
      reader.readBits(8);
      expect(reader.remaining()).toBe(0);
      expect(reader.bitPosition).toBe(8);
    });

    it('handles empty buffer', () => {
      const reader = new BitReader(new Uint8Array(0));
      expect(reader.remaining()).toBe(0);
      expect(reader.bitPosition).toBe(0);
    });
  });

  describe('boundary errors', () => {
    it('throws RangeError when reading past the end', () => {
      const reader = new BitReader(new Uint8Array([0xff]));
      reader.readBits(8); // consume all
      expect(() => reader.readBits(1)).toThrow(RangeError);
    });

    it('throws RangeError when requesting more bits than remaining', () => {
      const reader = new BitReader(new Uint8Array([0x00]));
      expect(() => reader.readBits(9)).toThrow(RangeError);
    });

    it('throws RangeError for n > 24', () => {
      const reader = new BitReader(new Uint8Array([0, 0, 0, 0]));
      expect(() => reader.readBits(25)).toThrow(RangeError);
    });

    it('throws RangeError on empty buffer read', () => {
      const reader = new BitReader(new Uint8Array(0));
      expect(() => reader.readBits(1)).toThrow(RangeError);
    });

    it('does not advance position on a failed read', () => {
      const reader = new BitReader(new Uint8Array([0xab]));
      reader.readBits(4); // consume 4 bits
      expect(() => reader.readBits(5)).toThrow(RangeError);
      // Position should still be 4, not advanced partway
      expect(reader.bitPosition).toBe(4);
    });
  });

  describe('big-endian ordering', () => {
    it('reads MSB of each byte first', () => {
      // 0x80 = 1000_0000: first bit should be 1, rest 0
      const reader = new BitReader(new Uint8Array([0x80]));
      expect(reader.readBits(1)).toBe(1);
      expect(reader.readBits(7)).toBe(0);
    });

    it('cross-byte read is big-endian', () => {
      // 0x00 0xFF: first 8 bits = 0, next 8 bits = 255
      // Reading 16 bits gives 0x00FF = 255
      const reader = new BitReader(new Uint8Array([0x00, 0xff]));
      expect(reader.readBits(16)).toBe(0x00_ff);
    });
  });
});
