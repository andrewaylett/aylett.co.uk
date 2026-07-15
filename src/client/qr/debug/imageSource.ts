'use client';

/*
 * The only module in the QR debugger that touches canvas, image, and video
 * APIs. Everything downstream works on structural RgbaImage objects, so the
 * decode pipeline itself runs (and is tested) under jsdom, which has no
 * canvas support; tests mock this module instead.
 */

import type { RgbaImage } from '@/client/qr/decoder/types';

/** Uploaded photos can be enormous; the locator only needs modest detail,
 * and binarisation cost is linear in pixel count. */
const MAX_UPLOAD_DIMENSION = 1024;

/** Camera frames arrive continuously, so keep per-frame work small. */
const MAX_VIDEO_DIMENSION = 640;

function scaleToFit(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawToRgba(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
): RgbaImage {
  const { width, height } = scaleToFit(sourceWidth, sourceHeight, maxDimension);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Could not create a 2D canvas context');
  }
  context.drawImage(source, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return {
    data: imageData.data,
    width: imageData.width,
    height: imageData.height,
  };
}

export async function fileToRgba(file: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(file);
  try {
    return drawToRgba(
      bitmap,
      bitmap.width,
      bitmap.height,
      MAX_UPLOAD_DIMENSION,
    );
  } finally {
    bitmap.close();
  }
}

/** Returns null until the video element has decoded its first frame. */
export function videoFrameToRgba(video: HTMLVideoElement): RgbaImage | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return null;
  }
  const { videoWidth, videoHeight } = video;
  if (videoWidth === 0 || videoHeight === 0) {
    return null;
  }
  return drawToRgba(video, videoWidth, videoHeight, MAX_VIDEO_DIMENSION);
}
