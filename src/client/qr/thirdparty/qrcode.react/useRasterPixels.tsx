import { useEffect, useState } from 'react';

// Structural zone heights: top 9 rows (TL+TR finders + format info), bottom 8 rows
// (BL finder + format info). Interior data rows: 9 … size−9.
export const STRUCTURAL_TOP_ROWS = 9;
export const STRUCTURAL_BOTTOM_ROWS = 8;

/**
 * Renders rasterText onto an off-screen canvas covering only the interior data
 * region (between the locator squares): width size*3, height (size−17)*3.
 * Returns null while loading or when rasterText is empty.
 * Stale cached pixels are suppressed by gating the return on rasterText.
 */
export function useRasterPixels(
  rasterText: string,
  rasterFont: string,
  size: number,
): Uint8ClampedArray | null {
  const [pixels, setPixels] = useState<Uint8ClampedArray | null>(null);

  useEffect(() => {
    if (!rasterText) return;
    let cancelled = false;

    async function render() {
      const cw = size * 3;
      const ch = Math.max(
        3,
        (size - STRUCTURAL_TOP_ROWS - STRUCTURAL_BOTTOM_ROWS) * 3,
      );
      await document.fonts.load(`bold 72px "${rasterFont}"`);
      if (cancelled) return;

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center';

      // Largest font where the actual ink bounds fit — not the nominal em size,
      // so text without descenders (e.g. "QR") can use a larger font.
      let lo = 1,
        hi = Math.max(cw, ch) * 2;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        ctx.font = `bold ${mid}px "${rasterFont}"`;
        const m = ctx.measureText(rasterText);
        const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        // Fall back to font size when actual bounds are unavailable (e.g. jsdom)
        if (m.width <= cw && (inkH > 0 ? inkH : mid) <= ch) lo = mid;
        else hi = mid;
      }

      // Center by ink bounds rather than the em box so the visual weight sits
      // in the middle of the data region regardless of descenders.
      ctx.font = `bold ${lo}px "${rasterFont}"`;
      const fm = ctx.measureText(rasterText);
      const inkCy =
        fm.actualBoundingBoxAscent > 0
          ? ch / 2 +
            (fm.actualBoundingBoxAscent - fm.actualBoundingBoxDescent) / 2
          : ch / 2;
      ctx.fillText(rasterText, cw / 2, inkCy);

      // After the final await + cancellation check, cancelled is always false here.
      setPixels(ctx.getImageData(0, 0, cw, ch).data);
    }

    render().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [rasterText, rasterFont, size]);

  // When rasterText is empty, suppress any stale cached pixels immediately
  // without needing an extra state update from inside the effect.
  return rasterText ? pixels : null;
}
