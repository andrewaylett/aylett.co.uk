import { startTransition, type JSX } from 'react';

import type { QRCodeContent } from '@/client/qr/QRCode';

export default function QRTextStyleControls({
  qrContent,
  updateQRCode,
}: {
  qrContent: QRCodeContent;
  updateQRCode: (updateFn: (draft: QRCodeContent) => void) => void;
}): JSX.Element {
  return (
    <>
      <label
        className={
          'w-full flex flex-row items-center gap-2 overflow-hidden transition-discrete transition-[height] duration-300 ease' +
          (qrContent.dotStyle === 'text' ? ' h-lh' : ' h-0')
        }
      >
        Raster text
        <input
          type="text"
          className="border border-gray-300 rounded p-1 ml-2"
          value={qrContent.rasterText}
          onChange={(event) => {
            startTransition(() => {
              updateQRCode((draft) => {
                draft.rasterText = event.target.value;
              });
            });
          }}
          onBlur={() => {
            updateQRCode((draft) => draft);
          }}
          onFocus={() => {
            updateQRCode((draft) => draft);
          }}
        />
      </label>
      <label
        className={
          'w-full flex flex-row items-center gap-2 overflow-hidden transition-discrete transition-[height] duration-300 ease' +
          (qrContent.dotStyle === 'text' ? ' h-lh' : ' h-0')
        }
      >
        Font
        <select
          value={qrContent.rasterFont}
          onChange={(event) => {
            startTransition(() => {
              updateQRCode((draft) => {
                draft.rasterFont = event.target.value;
              });
            });
          }}
        >
          <option value="Impact">Impact</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
          <option value="Verdana">Verdana</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
        </select>
      </label>
    </>
  );
}
