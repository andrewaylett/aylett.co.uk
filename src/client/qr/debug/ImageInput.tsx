'use client';

import { useEffect, type JSX } from 'react';

/**
 * File picker, drag-and-drop target, and clipboard-paste listener for the QR
 * debugger. Purely a source of image Blobs — decoding happens upstream.
 */
export function ImageInput({
  onImage,
}: {
  onImage: (image: Blob) => void;
}): JSX.Element {
  // Paste can happen anywhere on the page, so listen on the window: pasting a
  // screenshot straight in is the fastest way to debug a QR code you can see.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      for (const item of event.clipboardData?.items ?? []) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            onImage(file);
            return;
          }
        }
      }
    };
    globalThis.addEventListener('paste', onPaste);
    return () => {
      globalThis.removeEventListener('paste', onPaste);
    };
  }, [onImage]);

  return (
    <label
      className="block p-4 w-full text-center rounded border border-dashed cursor-pointer"
      data-testid="qr-debug-drop-zone"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const file = [...event.dataTransfer.files].find((f) =>
          f.type.startsWith('image/'),
        );
        if (file) {
          onImage(file);
        }
      }}
    >
      Choose an image containing a QR code, drop one here, or paste it from the
      clipboard.
      <input
        type="file"
        accept="image/*"
        className="block mx-auto mt-2"
        data-testid="qr-debug-file-input"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            onImage(file);
          }
        }}
      />
    </label>
  );
}
