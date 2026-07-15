/*
 * Minimal PNG-to-RgbaImage loader for test fixtures.
 *
 * Handles 8-bit RGB and RGBA PNGs with no interlacing — enough for the
 * synthetic tool-generated QR images we use as test fixtures.  Uses only
 * Node.js built-ins (fs, zlib) so nothing extra needs installing.
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

import type { RgbaImage } from '@/client/qr/decoder/types';

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Load a PNG file and return it as a flat RGBA `RgbaImage`. */
export function loadPng(path: string): RgbaImage {
  const buf = readFileSync(path);

  if (!buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error(`Not a PNG: ${path}`);
  }

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25]; // 2 = RGB, 6 = RGBA
  const interlace = buf[28];

  if (bitDepth !== 8) {
    throw new Error(`Unsupported bit depth: ${bitDepth}`);
  }
  if (colorType !== 2 && colorType !== 6) {
    throw new Error(`Unsupported colour type: ${colorType}`);
  }
  if (interlace !== 0) {
    throw new Error('Interlaced PNGs are not supported');
  }

  const channels = colorType === 6 ? 4 : 3;

  // Collect all IDAT chunks and decompress together.
  const idatChunks: Buffer[] = [];
  let pos = 8;
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idatChunks));

  // Reconstruct pixel data into a native-channel buffer first, then expand.
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (stride + 1)];
    const rowBase = y * (stride + 1) + 1;
    const outRow = y * stride;
    const prevRow = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[outRow + x - channels] : 0;
      const b = y > 0 ? pixels[prevRow + x] : 0;
      const c = x >= channels && y > 0 ? pixels[prevRow + x - channels] : 0;
      const raw_val = raw[rowBase + x];

      let val: number;
      switch (filterType) {
        case 0: {
          val = raw_val;
          break;
        }
        case 1: {
          val = (raw_val + a) & 0xff;
          break;
        }
        case 2: {
          val = (raw_val + b) & 0xff;
          break;
        }
        case 3: {
          val = (raw_val + Math.floor((a + b) / 2)) & 0xff;
          break;
        }
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          val = (raw_val + pr) & 0xff;
          break;
        }
        default: {
          throw new Error(`Unknown PNG filter type: ${filterType}`);
        }
      }
      pixels[outRow + x] = val;
    }
  }

  // Expand to RGBA.
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const src = i * channels;
    const dst = i * 4;
    data[dst] = pixels[src];
    data[dst + 1] = pixels[src + 1];
    data[dst + 2] = pixels[src + 2];
    data[dst + 3] = channels === 4 ? pixels[src + 3] : 255;
  }

  return { data, width, height };
}
