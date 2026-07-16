'use client';

import { useEffect, useRef, type JSX } from 'react';

import type {
  Point,
  QRLocationReport,
  RgbaImage,
} from '@/client/qr/decoder/types';

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  frameWidth: number,
  size: number | undefined,
  mapToImage: ((x: number, y: number) => Point) | undefined,
  location: QRLocationReport | undefined,
): void {
  ctx.lineWidth = Math.max(2, frameWidth / 200);

  if (mapToImage != null && size != null) {
    const corners = [
      mapToImage(-0.5, -0.5),
      mapToImage(size - 0.5, -0.5),
      mapToImage(size - 0.5, size - 0.5),
      mapToImage(-0.5, size - 0.5),
    ];
    ctx.strokeStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const { x, y } of corners.slice(1)) {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (location != null) {
    const { topLeft, topRight, bottomLeft } = location;
    ctx.strokeStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * Renders the source image on a canvas with the detected QR boundary overlaid.
 * Shows a green quadrilateral when the full perspective transform is available,
 * or an amber triangle through the three finder centres when only their positions
 * are known.
 */
export function SourceImageCanvas({
  frame,
  size,
  mapToImage,
  location,
}: {
  frame: RgbaImage;
  size?: number;
  mapToImage?: (x: number, y: number) => Point;
  location?: QRLocationReport;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    canvas.width = frame.width;
    canvas.height = frame.height;

    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(frame.data),
        frame.width,
        frame.height,
      ),
      0,
      0,
    );

    drawOverlay(ctx, frame.width, size, mapToImage, location);
  }, [frame, size, mapToImage, location]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto w-full max-w-96"
      aria-label="Source image with detected QR boundary"
      data-testid="qr-debug-source-canvas"
    />
  );
}
