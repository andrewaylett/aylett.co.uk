/**
 * Binary-searches the largest font size (in px) at which `text`, rendered in
 * `font`, has ink bounds no larger than maxWidth × maxHeight.
 *
 * Searches by actual ink bounds rather than the nominal em size, so text
 * without descenders (e.g. "QR") can use a larger font. Falls back to the
 * candidate font size itself when actual bounding boxes aren't available
 * (e.g. under jsdom in tests).
 *
 * `bold` defaults to true for the decorative raster overlay's look; the
 * cutout style passes false, since an already-heavy display font (e.g.
 * Impact) synthetically bolded on top gets thick enough to blob adjacent
 * strokes together once its silhouette is also dilated for the clear border.
 */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  maxHeight: number,
  bold = true,
): number {
  const weight = bold ? 'bold ' : '';
  let lo = 1,
    hi = Math.max(maxWidth, maxHeight) * 2;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    ctx.font = `${weight}${mid}px "${font}"`;
    const m = ctx.measureText(text);
    const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (m.width <= maxWidth && (inkH > 0 ? inkH : mid) <= maxHeight) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}
