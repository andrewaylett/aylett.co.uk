import React, { Activity, useState } from 'react';

import { type DebugDetails } from '@/client/qr/thirdparty/qrcode.react';
import { type QRCodeState } from '@/client/qr/QRCode';

export function QRDebugPanel({
  qrDebugDetails,
  qrValue,
  state,
  debugMessage,
}: {
  qrDebugDetails: DebugDetails;
  qrValue: string;
  state: QRCodeState;
  debugMessage: () => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="p-2 mt-4 w-full contain-content"
      onToggle={(c) => {
        setOpen(c.currentTarget.open);
      }}
    >
      <summary>Debug Information</summary>
      <Activity mode={open ? 'visible' : 'hidden'}>
        <dl className="columns-half-width">
          <dt>Module count</dt>
          <dd>{qrDebugDetails.moduleCount}</dd>
          <dt>QR Version</dt>
          <dd>{qrDebugDetails.qrVersion}</dd>
          <dt>Error Correction Level</dt>
          <dd>{qrDebugDetails.level}</dd>
          <dt>Rendered value</dt>
          <dd>{'"' + qrValue + '"'}</dd>
          <dt>Render Generation</dt>
          <dd>{state.generation}</dd>
          <dt>Optimisation</dt>
          <dd>{debugMessage()}</dd>
          <dt>Segments</dt>
          <dd>
            {qrDebugDetails.segments
              .map((s) =>
                s.text === undefined
                  ? `${s.mode.toString()}(${s.numChars})`
                  : `${s.mode.toString()}(${JSON.stringify(s.text)})`,
              )
              .join(', ')}
          </dd>
        </dl>
      </Activity>
    </details>
  );
}
