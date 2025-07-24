'use client';

import React from 'react';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  act,
  cleanup,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob()),
}));
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

const TEST_VALUE = 'Test QR Code';
const TEST_PATH =
  'M4 4h7v1H4zM12 4h1v1H12zM14 4h2v1H14zM18,4 h7v1H18zM4 5h1v1H4zM10 5h1v1H10zM12 5h2v1H12zM15 5h1v1H15zM18 5h1v1H18zM24,5 h1v1H24zM4 6h1v1H4zM6 6h3v1H6zM10 6h1v1H10zM12 6h1v1H12zM14 6h2v1H14zM18 6h1v1H18zM20 6h3v1H20zM24,6 h1v1H24zM4 7h1v1H4zM6 7h3v1H6zM10 7h1v1H10zM13 7h1v1H13zM15 7h2v1H15zM18 7h1v1H18zM20 7h3v1H20zM24,7 h1v1H24zM4 8h1v1H4zM6 8h3v1H6zM10 8h1v1H10zM12 8h3v1H12zM16 8h1v1H16zM18 8h1v1H18zM20 8h3v1H20zM24,8 h1v1H24zM4 9h1v1H4zM10 9h1v1H10zM15 9h2v1H15zM18 9h1v1H18zM24,9 h1v1H24zM4 10h7v1H4zM12 10h1v1H12zM14 10h1v1H14zM16 10h1v1H16zM18,10 h7v1H18zM13 11h4v1H13zM4 12h1v1H4zM7 12h6v1H7zM14 12h1v1H14zM16 12h2v1H16zM20 12h1v1H20zM22,12 h3v1H22zM6 13h2v1H6zM14 13h1v1H14zM16 13h1v1H16zM18 13h1v1H18zM21 13h2v1H21zM4 14h2v1H4zM9 14h2v1H9zM14 14h1v1H14zM18 14h2v1H18zM22,14 h3v1H22zM5 15h3v1H5zM9 15h1v1H9zM12 15h2v1H12zM15 15h1v1H15zM17 15h1v1H17zM22 15h1v1H22zM4 16h7v1H4zM12 16h1v1H12zM14 16h1v1H14zM17 16h4v1H17zM24,16 h1v1H24zM12 17h1v1H12zM14 17h1v1H14zM16 17h4v1H16zM22 17h1v1H22zM24,17 h1v1H24zM4 18h7v1H4zM12 18h2v1H12zM16 18h1v1H16zM18 18h1v1H18zM20 18h2v1H20zM4 19h1v1H4zM10 19h1v1H10zM12 19h11v1H12zM24,19 h1v1H24zM4 20h1v1H4zM6 20h3v1H6zM10 20h1v1H10zM12 20h3v1H12zM16 20h1v1H16zM19 20h1v1H19zM23 20h1v1H23zM4 21h1v1H4zM6 21h3v1H6zM10 21h1v1H10zM12 21h1v1H12zM15 21h1v1H15zM17 21h4v1H17zM22 21h1v1H22zM4 22h1v1H4zM6 22h3v1H6zM10 22h1v1H10zM14 22h1v1H14zM16 22h1v1H16zM20,22 h5v1H20zM4 23h1v1H4zM10 23h1v1H10zM13 23h2v1H13zM16 23h1v1H16zM18 23h1v1H18zM22,23 h3v1H22zM4 24h7v1H4zM12 24h1v1H12zM15 24h6v1H15z';

async function setFormText(text: string, user: UserEvent) {
  const input: HTMLInputElement = await screen.findByTestId('qr-code-input');
  await act(async () => user.click(input));
  await act(async () => user.paste(text));
  return input;
}

describe('QRCodeForm', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          write: jest.fn(),
        },
      },
      writable: true,
    });
    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(cleanup);

  it('renders the form with input and button', async () => {
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    const input = screen.getByPlaceholderText('Paste your text here');
    const button = screen.getByText('Copy to clipboard');

    expect(input).not.toBeNull();
    expect(button).not.toBeNull();
  });

  it('updates the QR code on change', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    const input = await setFormText(TEST_VALUE, user);

    const qrCode = await screen.findByTestId('qr-code');
    const path = qrCode.lastElementChild;

    expect(input.value).toBe(TEST_VALUE);
    expect(path).toHaveAttribute('d', TEST_PATH);
  });

  it('displays success text after copying to clipboard', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    const spy = jest.spyOn(navigator.clipboard, 'write').mockResolvedValue();

    await act(async () => render(<QRCodeForm />));

    const button = await screen.findByText('Copy to clipboard');

    await act(async () => user.click(button));

    await expect(
      screen.findByText('Copied to clipboard!'),
    ).resolves.toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('displays error text if copying to clipboard fails', async () => {
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    const spy = jest
      .spyOn(navigator.clipboard, 'write')
      .mockRejectedValue(new Error('Clipboard error'));

    await act(async () => render(<QRCodeForm />));

    const button = await screen.findByText('Copy to clipboard');

    await act(async () => fireEvent.click(button));

    await expect(
      screen.findByText('Failed to copy'),
    ).resolves.toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('displays an error when the input is too large to encode', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    const largeInput = 'A'.repeat(5000); // Exceeds QR code capacity

    await setFormText(largeInput, user);

    await expect(
      screen.findByText('Error generating QR code'),
    ).resolves.toBeInTheDocument();
  });

  it('resets when text is entered', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    const largeInput = 'A'.repeat(5000); // Exceeds QR code capacity

    const input = await setFormText(largeInput, user);

    await expect(
      screen.findByText('Error generating QR code'),
    ).resolves.toBeInTheDocument();
    await act(async () =>
      fireEvent.change(input, { target: { value: TEST_VALUE } }),
    );

    const qrCode = await screen.findByTestId('qr-code');
    const path = qrCode.lastElementChild;

    expect(input.value).toBe(TEST_VALUE);
    expect(path).toHaveAttribute('d', TEST_PATH);
  });

  it('resets when the button is pushed', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    const largeInput = 'A'.repeat(5000); // Exceeds QR code capacity
    const input = await setFormText(largeInput, user);

    await expect(
      screen.findByText('Error generating QR code'),
    ).resolves.toBeInTheDocument();

    const resetButton = await screen.findByText('Reset');
    await act(async () => fireEvent.click(resetButton));

    expect(input.value).toBe('');
  });

  it('updates the URL and state on pushState', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    await setFormText(TEST_VALUE, user);

    await screen.findByTestId('qr-code');
    expect(globalThis.history.state).toHaveProperty('qrText', TEST_VALUE);
    expect(globalThis.location.search).toBe(
      `?text=${encodeURIComponent(TEST_VALUE)}`,
    );
  });

  it('restores the state on popState', async () => {
    const user = userEvent.setup();
    const { QRCodeForm } = await import('@/client/qr/QRCodeForm');
    await act(async () => render(<QRCodeForm />));

    const input = await setFormText(TEST_VALUE, user);

    // Make sure the QR code is generated, to test this has changed later
    expect(
      (await screen.findByTestId('qr-code')).lastElementChild,
    ).toHaveAttribute('d', TEST_PATH);

    await act(async () =>
      globalThis.dispatchEvent(
        new PopStateEvent('popstate', { state: { qrText: 'Previous Text' } }),
      ),
    );

    expect(input.value).toBe('Previous Text');
    expect(
      (await screen.findByTestId('qr-code')).lastElementChild,
    ).toHaveAttribute(
      'd',
      expect.not.stringMatching(TEST_PATH), // Ensure the QR code updates
    );
  });
});
