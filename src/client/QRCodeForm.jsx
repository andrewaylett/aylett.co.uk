"use client";

import { memo } from '../types.ts';
import React, { useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import { toBlob } from 'html-to-image';

const INITIAL_TEXT = 'Copy to clipboard';
const FAILED_TEXT = 'Failed to copy';
const SUCCESS_TEXT = 'Copied to clipboard!';

export const QRCodeForm = memo(function QRCodeForm() {
  const [text, setText] = React.useState('');
  const [buttonText, setButtonText] = React.useState(INITIAL_TEXT);
  const ref = useRef(null);

  const setTextAndReset = useCallback((newText) => {
    setText(newText);
    setButtonText(INITIAL_TEXT);
  }, [setText, setButtonText]);

  const copyToClipboard = useCallback(async () => {
    if (ref.current === null) {
      return
    }

    try {
      const blob = await toBlob(ref.current, { skipFonts: true });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setButtonText(SUCCESS_TEXT)
    } catch (error) {
      console.error(error);
      setButtonText(FAILED_TEXT);
    }
  }, [ref, setButtonText]);

  return (
    <form>
      <input
        type="text"
        value={text}
        onChange={(e) => setTextAndReset(e.target.value)}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre"
      />
      <QRCode value={text} className="border-white border-[1ch]" ref={ref} />
      <button
        type="button"
        onClick={copyToClipboard}
        className="bg-blue-500 text-white rounded-md p-2 mt-4"
      >
        {buttonText}
      </button>
    </form>
  );
});
