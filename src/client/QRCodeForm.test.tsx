'use client';

import React, { act } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob()),
}));

describe('QRCodeForm', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: {
        clipboard: {
          write: jest.fn(),
        },
      },
      writable: true,
    });
    Object.defineProperty(global, 'ClipboardItem', {
      value: jest.fn(),
      writable: true,
    });
  });

  it('renders the form with input and button', async () => {
    const { QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const input = screen.getByPlaceholderText('Paste your text here');
    const button = screen.getByText('Copy to clipboard');

    expect(input).not.toBeNull();
    expect(button).not.toBeNull();
  });

  it('updates the input value on change', async () => {
    const { QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const input = screen.getByPlaceholderText(
      'Paste your text here',
    ) as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'Test QR Code' } });
    });

    expect(input.value).toBe('Test QR Code');
  });

  it('displays success text after copying to clipboard', async () => {
    const { QRCodeForm } = await import('./QRCodeForm');
    const spy = jest.spyOn(navigator.clipboard, 'write').mockResolvedValue();

    act(() => {
      render(<QRCodeForm />);
    });

    const button = screen.getByText('Copy to clipboard');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('displays error text if copying to clipboard fails', async () => {
    const { QRCodeForm } = await import('./QRCodeForm');
    const spy = jest
      .spyOn(navigator.clipboard, 'write')
      .mockRejectedValue(new Error('Clipboard error'));

    act(() => {
      render(<QRCodeForm />);
    });

    const button = screen.getByText('Copy to clipboard');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Failed to copy')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
