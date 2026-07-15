/*
 * BitReader: big-endian bit extraction over a byte array.
 *
 * QR data codewords are packed MSB-first (the top bit of byte 0 is bit 0 of
 * the stream). Every mode indicator, char-count field, and payload group is
 * emitted by the encoder with appendBits(), which pushes bits MSB-first into a
 * flat bit array before packing into bytes — so the natural read order is the
 * same big-endian order we use here.
 */

export class BitReader {
  private _bitPosition = 0;
  private readonly _totalBits: number;

  constructor(private readonly data: Uint8Array) {
    this._totalBits = data.length * 8;
  }

  /** Current position in the bitstream (number of bits already consumed). */
  get bitPosition(): number {
    return this._bitPosition;
  }

  /** Number of bits not yet consumed. */
  remaining(): number {
    return this._totalBits - this._bitPosition;
  }

  /**
   * Read `n` bits (0 ≤ n ≤ 24) and return them as an unsigned integer.
   * Throws RangeError if there are fewer than n bits remaining.
   */
  readBits(n: number): number {
    if (n < 0 || n > 24) {
      throw new RangeError(`readBits: n must be 0–24, got ${n}`);
    }
    if (n > this.remaining()) {
      throw new RangeError(
        `readBits: requested ${n} bits but only ${this.remaining()} remain`,
      );
    }
    let value = 0;
    for (let i = 0; i < n; i++) {
      const byteIndex = this._bitPosition >>> 3;
      const bitIndex = 7 - (this._bitPosition & 7); // MSB of each byte first
      value = (value << 1) | ((this.data[byteIndex] >>> bitIndex) & 1);
      this._bitPosition++;
    }
    return value;
  }
}
