'use client';

import { useEffect, useRef, useState, type JSX } from 'react';

import type { RgbaImage } from '@/client/qr/decoder/types';

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
 */
export function CameraScanner({
  active,
  onFrame,
}: {
  active: boolean;
  onFrame: (image: RgbaImage) => void;
}): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
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

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      className={active ? 'mx-auto w-full max-w-96' : 'hidden'}
      data-testid="qr-debug-video"
    />
  );
}
