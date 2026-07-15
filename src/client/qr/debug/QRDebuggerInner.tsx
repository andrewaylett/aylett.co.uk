'use client';

import { useDeferredValue, useMemo, useState, type JSX } from 'react';

import type { RgbaImage } from '@/client/qr/decoder/types';

import { AnalysisPanel } from '@/client/qr/debug/AnalysisPanel';
import { CameraScanner } from '@/client/qr/debug/CameraScanner';
import { CorrectedMatrixSVG } from '@/client/qr/debug/CorrectedMatrixSVG';
import { ImageInput } from '@/client/qr/debug/ImageInput';
import { fileToRgba } from '@/client/qr/debug/imageSource';
import { analyseImage } from '@/client/qr/decoder/analyseImage';

export default function QRDebuggerInner(): JSX.Element {
  const [frame, setFrame] = useState<RgbaImage | null>(null);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Analysis is a pure derivation of the latest frame; deferring it keeps
  // camera frames and file loads from blocking interaction while a frame is
  // being decoded.
  const deferredFrame = useDeferredValue(frame);
  const result = useMemo(
    () => (deferredFrame ? analyseImage(deferredFrame) : null),
    [deferredFrame],
  );

  // Keep scanning until a frame decodes; the successful frame stays on
  // screen because it is simply the last one set.
  const scanning = cameraRequested && result?.ok !== true;
  const cameraSupported =
    typeof navigator !== 'undefined' && 'mediaDevices' in navigator;

  const matrix = result?.ok
    ? result.analysis.canonicalMatrix
    : result?.partial?.sampledMatrix;
  const diffs = result?.ok ? result.analysis.diffs : undefined;
  const quietZoneViolations = result?.ok
    ? result.analysis.quietZoneViolations
    : undefined;
  const quietZoneTruncation = result?.ok
    ? result.analysis.quietZoneTruncation
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <ImageInput
        onImage={(blob) => {
          setCameraRequested(false);
          setLoadError(null);
          fileToRgba(blob).then(setFrame, () => {
            setLoadError('That file could not be read as an image.');
          });
        }}
      />
      {cameraSupported && (
        <button
          type="button"
          className="mx-auto py-1 px-3 rounded border"
          data-testid="qr-debug-camera-toggle"
          onClick={() => {
            setCameraRequested((requested) => !requested);
          }}
        >
          {cameraRequested ? 'Stop camera' : 'Scan with camera'}
        </button>
      )}
      {cameraRequested && (
        <CameraScanner active={scanning} onFrame={setFrame} />
      )}
      {loadError && <p role="alert">{loadError}</p>}
      {matrix && (
        <CorrectedMatrixSVG
          matrix={matrix}
          diffs={diffs}
          quietZoneViolations={quietZoneViolations}
          quietZoneTruncation={quietZoneTruncation}
          label={
            result?.ok
              ? 'Corrected QR code with error-corrected modules highlighted'
              : 'Sampled QR code (decode incomplete)'
          }
        />
      )}
      {result ? (
        <AnalysisPanel result={result} />
      ) : (
        <p className="text-center">
          Upload, drop, paste, or scan a QR code to see how it was made.
        </p>
      )}
    </div>
  );
}
