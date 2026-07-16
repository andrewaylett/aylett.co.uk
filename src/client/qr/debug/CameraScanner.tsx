'use client';

import { useEffect, useRef, useState, type JSX } from 'react';

import type {
  Point,
  QRLocationReport,
  RgbaImage,
} from '@/client/qr/decoder/types';

import { videoFrameToRgba } from '@/client/qr/debug/imageSource';

/** Decoding runs on the main thread, so pace frame capture well below the
 * display rate; QR scanning gains nothing from more than a few frames a
 * second. */
const FRAME_INTERVAL_MS = 200;

function friendlyCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError': {
        return 'Camera access was refused. Grant permission and try again.';
      }
      case 'NotFoundError': {
        return 'No camera was found on this device.';
      }
      case 'NotReadableError': {
        return 'The camera is in use by another application.';
      }
      default: {
        return `Could not start the camera: ${error.message}`;
      }
    }
  }
  return 'Could not start the camera.';
}

/**
 * Live camera preview that captures frames for decoding while `active`.
 * The single effect owns the MediaStream lifecycle: the camera light must go
 * out the moment scanning stops or the component unmounts.
 *
 * When overlay props are supplied, a transparent canvas is layered over the
 * video showing the detected QR boundary (green quadrilateral when the full
 * perspective transform is known, amber triangle through finder centres when
 * only their positions are known).
 */
export function CameraScanner({
  active,
  onFrame,
  overlayLocation,
  overlaySize,
  overlayMapToImage,
  overlayFrameWidth,
  overlayFrameHeight,
}: {
  active: boolean;
  onFrame: (image: RgbaImage) => void;
  overlayLocation?: QRLocationReport;
  overlaySize?: number;
  overlayMapToImage?: (x: number, y: number) => Point;
  overlayFrameWidth?: number;
  overlayFrameHeight?: number;
}): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) {
      return;
    }
    let stream: MediaStream | undefined;
    let rafHandle = 0;
    let lastCapture = 0;
    let cancelled = false;

    const tick = (time: DOMHighResTimeStamp): void => {
      if (time - lastCapture >= FRAME_INTERVAL_MS) {
        lastCapture = time;
        const frame = videoFrameToRgba(video);
        if (frame) {
          onFrame(frame);
        }
      }
      rafHandle = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (mediaStream) => {
        if (cancelled) {
          for (const track of mediaStream.getTracks()) {
            track.stop();
          }
          return;
        }
        setError(null);
        stream = mediaStream;
        video.srcObject = mediaStream;
        await video.play();
        rafHandle = requestAnimationFrame(tick);
      })
      .catch((cameraError: unknown) => {
        if (!cancelled) {
          setError(friendlyCameraError(cameraError));
        }
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafHandle);
      for (const track of stream?.getTracks() ?? []) {
        track.stop();
      }
      video.srcObject = null;
    };
  }, [active, onFrame]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const frameWidth = overlayFrameWidth ?? 1;
    const frameHeight = overlayFrameHeight ?? 1;
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    ctx.clearRect(0, 0, frameWidth, frameHeight);

    ctx.lineWidth = Math.max(2, frameWidth / 200);

    if (overlayMapToImage != null && overlaySize != null) {
      const corners = [
        overlayMapToImage(-0.5, -0.5),
        overlayMapToImage(overlaySize - 0.5, -0.5),
        overlayMapToImage(overlaySize - 0.5, overlaySize - 0.5),
        overlayMapToImage(-0.5, overlaySize - 0.5),
      ];
      ctx.strokeStyle = '#22C55E';
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (const { x, y } of corners.slice(1)) {
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (overlayLocation != null) {
      const { topLeft, topRight, bottomLeft } = overlayLocation;
      ctx.strokeStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(bottomLeft.x, bottomLeft.y);
      ctx.closePath();
      ctx.stroke();
    }
  }, [
    overlayLocation,
    overlaySize,
    overlayMapToImage,
    overlayFrameWidth,
    overlayFrameHeight,
  ]);

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <div className={active ? 'relative mx-auto w-full max-w-96' : 'hidden'}>
      <video
        ref={videoRef}
        playsInline
        muted
        className="w-full"
        data-testid="qr-debug-video"
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
