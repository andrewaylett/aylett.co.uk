Taken from https://github.com/zpao/qrcode.react/blob/018ebcc4ef2c08c5a0feeaa2bb2258401a3b77f7/src/index.tsx

Because I wanted to have more control over the rendering size.

## Modifications

- Substantial changes to rendering (SVG paths, dot and text module styles) and
  hooks (`useQRCode`, `useDebugDetails`, `useRasterPixels`).
- Exported `generatePath` so the QR debugger can render decoded matrices.
