'use client';

import React, { act } from 'react';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob()),
}));

const TEST_VALUE = 'Test QR Code';
const TEST_PATH =
  'M4 4h7v1H4zM12 4h1v1H12zM14 4h2v1H14zM18,4 h7v1H18zM4 5h1v1H4zM10 5h1v1H10zM12 5h2v1H12zM15 5h1v1H15zM18 5h1v1H18zM24,5 h1v1H24zM4 6h1v1H4zM6 6h3v1H6zM10 6h1v1H10zM12 6h1v1H12zM14 6h2v1H14zM18 6h1v1H18zM20 6h3v1H20zM24,6 h1v1H24zM4 7h1v1H4zM6 7h3v1H6zM10 7h1v1H10zM13 7h1v1H13zM15 7h2v1H15zM18 7h1v1H18zM20 7h3v1H20zM24,7 h1v1H24zM4 8h1v1H4zM6 8h3v1H6zM10 8h1v1H10zM12 8h3v1H12zM16 8h1v1H16zM18 8h1v1H18zM20 8h3v1H20zM24,8 h1v1H24zM4 9h1v1H4zM10 9h1v1H10zM15 9h2v1H15zM18 9h1v1H18zM24,9 h1v1H24zM4 10h7v1H4zM12 10h1v1H12zM14 10h1v1H14zM16 10h1v1H16zM18,10 h7v1H18zM13 11h4v1H13zM4 12h1v1H4zM7 12h6v1H7zM14 12h1v1H14zM16 12h2v1H16zM20 12h1v1H20zM22,12 h3v1H22zM6 13h2v1H6zM14 13h1v1H14zM16 13h1v1H16zM18 13h1v1H18zM21 13h2v1H21zM4 14h2v1H4zM9 14h2v1H9zM14 14h1v1H14zM18 14h2v1H18zM22,14 h3v1H22zM5 15h3v1H5zM9 15h1v1H9zM12 15h2v1H12zM15 15h1v1H15zM17 15h1v1H17zM22 15h1v1H22zM4 16h7v1H4zM12 16h1v1H12zM14 16h1v1H14zM17 16h4v1H17zM24,16 h1v1H24zM12 17h1v1H12zM14 17h1v1H14zM16 17h4v1H16zM22 17h1v1H22zM24,17 h1v1H24zM4 18h7v1H4zM12 18h2v1H12zM16 18h1v1H16zM18 18h1v1H18zM20 18h2v1H20zM4 19h1v1H4zM10 19h1v1H10zM12 19h11v1H12zM24,19 h1v1H24zM4 20h1v1H4zM6 20h3v1H6zM10 20h1v1H10zM12 20h3v1H12zM16 20h1v1H16zM19 20h1v1H19zM23 20h1v1H23zM4 21h1v1H4zM6 21h3v1H6zM10 21h1v1H10zM12 21h1v1H12zM15 21h1v1H15zM17 21h4v1H17zM22 21h1v1H22zM4 22h1v1H4zM6 22h3v1H6zM10 22h1v1H10zM14 22h1v1H14zM16 22h1v1H16zM20,22 h5v1H20zM4 23h1v1H4zM10 23h1v1H10zM13 23h2v1H13zM16 23h1v1H16zM18 23h1v1H18zM22,23 h3v1H22zM4 24h7v1H4zM12 24h1v1H12zM15 24h6v1H15z';

function setFormText(text: string) {
  const input = screen.getByTestId('qr-code-input') as HTMLInputElement;

  act(() => {
    fireEvent.change(input, { target: { value: text } });
  });
  return input;
}

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
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const input = screen.getByPlaceholderText('Paste your text here');
    const button = screen.getByText('Copy to clipboard');

    expect(input).not.toBeNull();
    expect(button).not.toBeNull();
  });

  it('updates the QR code on change', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const input = setFormText(TEST_VALUE);

    const qrCode = screen.getByTestId('qr-code');
    const path = qrCode.lastElementChild;

    expect(input.value).toBe(TEST_VALUE);
    expect(path).toHaveAttribute('d', TEST_PATH);
  });

  it('displays success text after copying to clipboard', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
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
    const { default: QRCodeForm } = await import('./QRCodeForm');
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

  it('displays an error when the input is too large to encode', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const largeInput = 'A'.repeat(5000); // Exceeds QR code capacity

    setFormText(largeInput);

    expect(screen.getByText('Error generating QR code')).toBeInTheDocument();
  });

  it('resets when text is entered', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const largeInput = 'A'.repeat(5000); // Exceeds QR code capacity

    const input = setFormText(largeInput);

    expect(screen.getByText('Error generating QR code')).toBeInTheDocument();
    act(() => {
      fireEvent.change(input, { target: { value: TEST_VALUE } });
    });

    const qrCode = screen.getByTestId('qr-code');
    const path = qrCode.lastElementChild;

    expect(input.value).toBe(TEST_VALUE);
    expect(path).toHaveAttribute('d', TEST_PATH);
  });

  it('resets when the button is pushed', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const largeInput = 'A'.repeat(5000); // Exceeds QR code capacity
    const input = setFormText(largeInput);

    expect(screen.getByText('Error generating QR code')).toBeInTheDocument();

    const resetButton = screen.getByText('Reset');
    act(() => {
      fireEvent.click(resetButton);
    });

    expect(input.value).toBe('');
  });

  it('updates the URL and state on pushState', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    setFormText(TEST_VALUE);

    expect(window.history.state.qrText).toBe(TEST_VALUE);
    expect(window.location.search).toBe(
      `?text=${encodeURIComponent(TEST_VALUE)}`,
    );
  });

  it('restores the state on popState', async () => {
    const { default: QRCodeForm } = await import('./QRCodeForm');
    act(() => {
      render(<QRCodeForm />);
    });

    const input = setFormText(TEST_VALUE);

    // Make sure the QR code is generated, to test this has changed later
    expect(screen.getByTestId('qr-code').lastElementChild).toHaveAttribute(
      'd',
      TEST_PATH,
    );

    act(() => {
      window.dispatchEvent(
        new PopStateEvent('popstate', { state: { qrText: 'Previous Text' } }),
      );
    });

    expect(input.value).toBe('Previous Text');
    expect(screen.getByTestId('qr-code').lastElementChild).toHaveAttribute(
      'd',
      expect.not.stringMatching(TEST_PATH), // Ensure the QR code updates
    );
  });

  it('percent-encodes special characters in query component', async () => {
    const { encodeQueryComponent } = await import('./QRCodeForm');
    const input = 'a b+c@?/%&';
    const encoded = encodeQueryComponent(input);
    expect(encoded).toBe('a%20b%2Bc@?/%25%26');
  });

  it('throws when promise resolves to null', async () => {
    const { nullToError } = await import('./QRCodeForm');
    await expect(nullToError(Promise.resolve(null), 'oops')).rejects.toThrow(
      'oops',
    );
  });

  it('resolves value when not null', async () => {
    const { nullToError } = await import('./QRCodeForm');
    await expect(nullToError(Promise.resolve(42))).resolves.toBe(42);
  });
});
