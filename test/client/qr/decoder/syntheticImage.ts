/*
 * Renders a QR module matrix into a synthetic RGBA photograph for testing the
 * image pipeline without a real camera: plain structural pixel buffers, no
 * canvas, so everything runs under jsdom.
 */

import type { RgbaImage } from '@/client/qr/decoder/types';

export interface SyntheticImageOptions {
  /** Pixels per module. */
  scale?: number;
  /** Light border around the symbol, in modules. */
  quietModules?: number;
  /** Rotation applied to the whole image, in degrees. */
  rotateDegrees?: number;
  /** Render light-on-dark instead of dark-on-light. */
  invert?: boolean;
  /** Extra dark modules, in module coordinates relative to the symbol's
   * top-left; may be negative or beyond the symbol to dirty the quiet zone. */
  extraDark?: { x: number; y: number }[];
}

export function matrixToImage(
  matrix: readonly boolean[][],
  {
    scale = 8,
    quietModules = 4,
    rotateDegrees = 0,
    invert = false,
    extraDark = [],
  }: SyntheticImageOptions = {},
): RgbaImage {
  const size = matrix.length;
  const dark = new Set(extraDark.map(({ x, y }) => `${x},${y}`));

  const isDark = (moduleX: number, moduleY: number): boolean => {
    if (dark.has(`${moduleX},${moduleY}`)) {
      return true;
    }
    return (
      moduleX >= 0 &&
      moduleX < size &&
      moduleY >= 0 &&
      moduleY < size &&
      matrix[moduleY][moduleX]
    );
  };

  const sourcePixels = (size + quietModules * 2) * scale;
  // Rotation can push corners outside a same-sized frame; pad enough that the
  // whole symbol always fits, whatever the angle.
  const rotated = rotateDegrees % 360 !== 0;
  const dimension = rotated ? Math.ceil(sourcePixels * 1.5) : sourcePixels;
  const centre = dimension / 2;
  const sourceCentre = sourcePixels / 2;
  const angle = (-rotateDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const data = new Uint8ClampedArray(dimension * dimension * 4);
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      // Inverse-rotate the output pixel back into source (unrotated) space,
      // sampling nearest-neighbour.
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      const sourceX = dx * cos - dy * sin + sourceCentre;
      const sourceY = dx * sin + dy * cos + sourceCentre;
      const moduleX = Math.floor(sourceX / scale) - quietModules;
      const moduleY = Math.floor(sourceY / scale) - quietModules;
      const inSource =
        sourceX >= 0 &&
        sourceX < sourcePixels &&
        sourceY >= 0 &&
        sourceY < sourcePixels;
      let value = inSource && isDark(moduleX, moduleY) ? 0 : 255;
      if (invert) {
        value = 255 - value;
      }
      const offset = (y * dimension + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  return { data, width: dimension, height: dimension };
}

export function blankImage(dimension = 64): RgbaImage {
  const data = new Uint8ClampedArray(dimension * dimension * 4);
  data.fill(255);
  return { data, width: dimension, height: dimension };
}
