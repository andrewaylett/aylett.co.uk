"use client";

import { memo } from '../types.ts';
import React from 'react';

import QRCode from 'react-qr-code';

export const QRCodeForm = memo(function QRCodeForm() {
  const [text, setText] = React.useState('');

  return (
    <form>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre"
      />
      <QRCode value={text} />
    </form>
  );
});
