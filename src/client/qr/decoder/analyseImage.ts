/*
 * Locates and samples a QR code in an RGBA bitmap, then hands the sampled
 * module matrix to analyseMatrix for the instrumented decode.
 *
 * This is a compact ZXing-style detector: adaptive binarisation, 1:1:3:1:1
 * finder-pattern search with vertical and horizontal cross-checks, alignment
 * pattern refinement, and a projective transform from module space to image
 * pixels. As with the rest of the debugger pipeline, geometry that a normal
 * decoder would discard (finder locations, the transform, quiet-zone damage,
 * binarisation statistics) is kept and reported, and failures return whatever
 * partial analysis was gathered so the UI can explain how far the decode got.
 *
 * Framework-free and DOM-free: images are structural {data, width, height}
 * objects, so the whole pipeline runs under jsdom in tests.
 */

import type {
  AnalysisResult,
  ImageAnalysis,
  Point,
  QRLocationReport,
  QuietZoneTruncation,
  QuietZoneViolation,
  RgbaImage,
  ThresholdInfo,
} from '@/client/qr/decoder/types';

import { analyseMatrix } from '@/client/qr/decoder/analyseMatrix';

/** A binarised bitmap: one byte per pixel, 1 = dark. */
interface BitGrid {
  bits: Uint8Array;
  width: number;
  height: number;
}

/*
 * Binarisation blocks are deliberately small relative to a module so a block
 * never straddles more than a couple of modules; 8 pixels matches ZXing's
 * HybridBinarizer and works down to roughly 2 pixels per module.
 */
const BLOCK_SIZE = 8;

/*
 * Blocks whose grey range is below this are treated as solid (all one colour)
 * rather than thresholded against themselves: a block wholly inside a finder
 * core or the quiet zone has almost no local contrast, and its own midpoint
 * would classify half its pixels arbitrarily.
 */
const MIN_BLOCK_CONTRAST = 24;

/**
 * Converts the RGBA image to grey via integer luma and thresholds it block by
 * block. Low-contrast blocks fall back to the global midpoint so that solid
 * regions larger than a block (finder cores, the quiet zone) are classified
 * by the image-wide light/dark split rather than their own noise.
 */
function binarise(image: RgbaImage): {
  grid: BitGrid;
  threshold: ThresholdInfo;
} {
  const { data, width, height } = image;
  const pixelCount = width * height;
  const grey = new Uint8Array(pixelCount);
  let min = 255;
  let max = 0;
  let sum = 0;
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const luma = Math.trunc(
      (data[offset] * 299 + data[offset + 1] * 587 + data[offset + 2] * 114) /
        1000,
    );
    grey[i] = luma;
    min = Math.min(min, luma);
    max = Math.max(max, luma);
    sum += luma;
  }
  const globalThreshold = (min + max) / 2;

  const bits = new Uint8Array(pixelCount);
  for (let blockY = 0; blockY < height; blockY += BLOCK_SIZE) {
    for (let blockX = 0; blockX < width; blockX += BLOCK_SIZE) {
      const yEnd = Math.min(blockY + BLOCK_SIZE, height);
      const xEnd = Math.min(blockX + BLOCK_SIZE, width);
      let blockMin = 255;
      let blockMax = 0;
      for (let y = blockY; y < yEnd; y++) {
        for (let x = blockX; x < xEnd; x++) {
          const luma = grey[y * width + x];
          blockMin = Math.min(blockMin, luma);
          blockMax = Math.max(blockMax, luma);
        }
      }
      const threshold =
        blockMax - blockMin > MIN_BLOCK_CONTRAST
          ? (blockMin + blockMax) / 2
          : globalThreshold;
      for (let y = blockY; y < yEnd; y++) {
        for (let x = blockX; x < xEnd; x++) {
          bits[y * width + x] = grey[y * width + x] < threshold ? 1 : 0;
        }
      }
    }
  }

  return {
    grid: { bits, width, height },
    threshold: { min, mean: sum / pixelCount, max },
  };
}

function invertGrid(grid: BitGrid): BitGrid {
  return { ...grid, bits: grid.bits.map((bit) => 1 - bit) };
}

/** A maximal run of same-coloured pixels within one row. */
interface Run {
  start: number;
  length: number;
  dark: boolean;
}

function rowRuns(grid: BitGrid, y: number, fromX = 0, toX = grid.width): Run[] {
  const runs: Run[] = [];
  const rowOffset = y * grid.width;
  let start = fromX;
  let dark = grid.bits[rowOffset + fromX] === 1;
  for (let x = fromX + 1; x < toX; x++) {
    const pixelDark = grid.bits[rowOffset + x] === 1;
    if (pixelDark !== dark) {
      runs.push({ start, length: x - start, dark });
      start = x;
      dark = pixelDark;
    }
  }
  runs.push({ start, length: toX - start, dark });
  return runs;
}

/** A confirmed finder-pattern centre, accumulated over multiple row hits. */
interface FinderCandidate {
  x: number;
  y: number;
  moduleSize: number;
  /** Number of row scans that confirmed this centre. */
  count: number;
}

/**
 * ZXing's 1:1:3:1:1 test: each outer run within half a module of one module,
 * the core within one and a half modules of three. The generous tolerance is
 * what lets the same horizontal test work on rotated symbols, whose
 * cross-sections stretch by up to √2 but keep their ratios.
 */
function looksLikeFinder(counts: readonly number[]): boolean {
  const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
  if (total < 7) {
    return false;
  }
  const moduleSize = total / 7;
  const maxVariance = moduleSize / 2;
  return (
    Math.abs(moduleSize - counts[0]) < maxVariance &&
    Math.abs(moduleSize - counts[1]) < maxVariance &&
    Math.abs(3 * moduleSize - counts[2]) < 3 * maxVariance &&
    Math.abs(moduleSize - counts[3]) < maxVariance &&
    Math.abs(moduleSize - counts[4]) < maxVariance
  );
}

/** Centre of the middle run, measured back from where the last run ended. */
function centreFromEnd(counts: readonly number[], end: number): number {
  return end - counts[4] - counts[3] - counts[2] / 2;
}

/**
 * Walks out from a supposed finder centre along one axis, counting the
 * dark/light/dark runs, and returns the refined centre coordinate or null.
 * The outer and white runs are capped at the original core-run length: a real
 * finder's rings cannot be longer than its core, so anything bigger means the
 * row hit was a coincidence of unrelated dark regions.
 */
function crossCheck(
  grid: BitGrid,
  centre: number,
  fixed: number,
  maxCount: number,
  originalTotal: number,
  vertical: boolean,
): number | null {
  const limit = vertical ? grid.height : grid.width;
  const isDark = (pos: number): boolean =>
    grid.bits[
      vertical ? pos * grid.width + fixed : fixed * grid.width + pos
    ] === 1;

  const counts = [0, 0, 0, 0, 0];
  let pos = centre;
  while (pos >= 0 && isDark(pos)) {
    counts[2]++;
    pos--;
  }
  if (pos < 0) {
    return null;
  }
  while (pos >= 0 && !isDark(pos) && counts[1] <= maxCount) {
    counts[1]++;
    pos--;
  }
  if (pos < 0 || counts[1] > maxCount) {
    return null;
  }
  while (pos >= 0 && isDark(pos) && counts[0] <= maxCount) {
    counts[0]++;
    pos--;
  }
  if (counts[0] > maxCount) {
    return null;
  }

  pos = centre + 1;
  while (pos < limit && isDark(pos)) {
    counts[2]++;
    pos++;
  }
  if (pos === limit) {
    return null;
  }
  while (pos < limit && !isDark(pos) && counts[3] < maxCount) {
    counts[3]++;
    pos++;
  }
  if (pos === limit || counts[3] >= maxCount) {
    return null;
  }
  while (pos < limit && isDark(pos) && counts[4] < maxCount) {
    counts[4]++;
    pos++;
  }
  if (counts[4] >= maxCount) {
    return null;
  }

  // A cross-section wildly different in total from the row hit means we
  // crossed the pattern far off-centre, or hit something else entirely.
  const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
  if (5 * Math.abs(total - originalTotal) >= 2 * originalTotal) {
    return null;
  }
  return looksLikeFinder(counts) ? centreFromEnd(counts, pos) : null;
}

/**
 * Merges a confirmed centre into the candidate list: repeat sightings of the
 * same physical pattern land within a module of each other, so they refine
 * the estimate (weighted average) rather than adding a new candidate.
 */
function mergeCandidate(
  candidates: FinderCandidate[],
  x: number,
  y: number,
  moduleSize: number,
): void {
  for (const candidate of candidates) {
    if (
      Math.abs(y - candidate.y) <= candidate.moduleSize &&
      Math.abs(x - candidate.x) <= candidate.moduleSize
    ) {
      const sizeDiff = Math.abs(moduleSize - candidate.moduleSize);
      if (sizeDiff <= 1 || sizeDiff <= candidate.moduleSize) {
        const combined = candidate.count + 1;
        candidate.x = (candidate.count * candidate.x + x) / combined;
        candidate.y = (candidate.count * candidate.y + y) / combined;
        candidate.moduleSize =
          (candidate.count * candidate.moduleSize + moduleSize) / combined;
        candidate.count = combined;
        return;
      }
    }
  }
  candidates.push({ x, y, moduleSize, count: 1 });
}

/**
 * Scans every row for 1:1:3:1:1 hits, cross-checks each vertically then
 * horizontally, and returns the three most-confirmed centres, or null when
 * fewer than three patterns were seen at least twice. Requiring two sightings
 * filters one-off coincidences: a real finder is confirmed by every row
 * through its core.
 */
function locateFinderPatterns(grid: BitGrid): FinderCandidate[] | null {
  const candidates: FinderCandidate[] = [];
  for (let y = 0; y < grid.height; y++) {
    const runs = rowRuns(grid, y);
    for (let i = 0; i + 4 < runs.length; i++) {
      if (!runs[i].dark) {
        continue;
      }
      const counts = [
        runs[i].length,
        runs[i + 1].length,
        runs[i + 2].length,
        runs[i + 3].length,
        runs[i + 4].length,
      ];
      if (!looksLikeFinder(counts)) {
        continue;
      }
      const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
      const provisionalX = runs[i + 2].start + runs[i + 2].length / 2;
      const centreY = crossCheck(
        grid,
        y,
        Math.floor(provisionalX),
        counts[2],
        total,
        true,
      );
      if (centreY === null) {
        continue;
      }
      const centreX = crossCheck(
        grid,
        Math.floor(provisionalX),
        Math.floor(centreY),
        counts[2],
        total,
        false,
      );
      if (centreX === null) {
        continue;
      }
      mergeCandidate(candidates, centreX, centreY, total / 7);
    }
  }
  const confirmed = candidates.filter((candidate) => candidate.count >= 2);
  if (confirmed.length < 3) {
    return null;
  }
  confirmed.sort((a, b) => b.count - a.count);
  return confirmed.slice(0, 3);
}

function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Z component of the cross product of b→a and b→c: its sign says which side
 * of the diagonal the corner pattern sits, which is what distinguishes a
 * correctly-oriented symbol from its mirror image.
 */
function crossProductZ(a: Point, b: Point, c: Point): number {
  return (c.x - b.x) * (a.y - b.y) - (c.y - b.y) * (a.x - b.x);
}

/**
 * ZXing's orderBestPatterns: the two centres furthest apart lie on the
 * top-right/bottom-left diagonal, so the remaining one is top-left; the cross
 * product then tells bottom-left from top-right (image y grows downwards).
 */
function orderPatterns(patterns: FinderCandidate[]): {
  topLeft: FinderCandidate;
  topRight: FinderCandidate;
  bottomLeft: FinderCandidate;
} {
  const [p0, p1, p2] = patterns;
  const d01 = distanceBetween(p0, p1);
  const d12 = distanceBetween(p1, p2);
  const d02 = distanceBetween(p0, p2);
  let pointA: FinderCandidate;
  let pointB: FinderCandidate;
  let pointC: FinderCandidate;
  if (d12 >= d01 && d12 >= d02) {
    pointB = p0;
    pointA = p1;
    pointC = p2;
  } else if (d02 >= d12 && d02 >= d01) {
    pointB = p1;
    pointA = p0;
    pointC = p2;
  } else {
    pointB = p2;
    pointA = p0;
    pointC = p1;
  }
  if (crossProductZ(pointA, pointB, pointC) < 0) {
    const swap = pointA;
    pointA = pointC;
    pointC = swap;
  }
  return { topLeft: pointB, topRight: pointC, bottomLeft: pointA };
}

/**
 * The candidates' module sizes came from horizontal run lengths, which a
 * rotated symbol stretches by 1/cos(skew); correcting by the top edge's angle
 * (reduced mod 90° so any of the four orientations works) recovers the true
 * module pitch.
 */
function correctedModuleSize(
  patterns: readonly FinderCandidate[],
  topLeft: Point,
  topRight: Point,
): number {
  const average =
    (patterns[0].moduleSize + patterns[1].moduleSize + patterns[2].moduleSize) /
    3;
  const degrees =
    (Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180) /
    Math.PI;
  let skew = ((degrees % 90) + 90) % 90;
  if (skew > 45) {
    skew -= 90;
  }
  return average * Math.cos((skew * Math.PI) / 180);
}

/**
 * Finder centres sit 3.5 modules inside the symbol, so the centre-to-centre
 * distance is (dimension − 7) modules; snapping to the nearest valid size
 * (dimension ≡ 1 mod 4) absorbs a module of measurement error, and being two
 * off means the geometry cannot be trusted at all.
 */
function computeDimension(
  topLeft: Point,
  topRight: Point,
  bottomLeft: Point,
  moduleSize: number,
): number | null {
  const measured =
    (distanceBetween(topLeft, topRight) +
      distanceBetween(topLeft, bottomLeft)) /
    2 /
    moduleSize;
  let dimension = Math.round(measured) + 7;
  switch (dimension % 4) {
    case 0: {
      dimension++;
      break;
    }
    case 2: {
      dimension--;
      break;
    }
    case 3: {
      return null;
    }
    default: {
      break;
    }
  }
  return dimension >= 21 && dimension <= 177 ? dimension : null;
}

/**
 * Verifies an alignment-pattern candidate column: the central dark module
 * should be about one module tall with the light interior ring visible for
 * about half a module beyond each end. Returns the refined centre y.
 */
function verifyAlignmentColumn(
  grid: BitGrid,
  x: number,
  y: number,
  moduleSize: number,
  tolerance: number,
): number | null {
  const isDark = (px: number, py: number): boolean =>
    grid.bits[py * grid.width + px] === 1;
  if (!isDark(x, y)) {
    return null;
  }
  let top = y;
  while (top - 1 >= 0 && isDark(x, top - 1)) {
    top--;
  }
  let bottom = y;
  while (bottom + 1 < grid.height && isDark(x, bottom + 1)) {
    bottom++;
  }
  if (Math.abs(bottom - top + 1 - moduleSize) > tolerance) {
    return null;
  }
  const clearance = Math.max(1, Math.round(moduleSize / 2));
  for (let step = 1; step <= clearance; step++) {
    const above = top - step;
    const below = bottom + step;
    if (above >= 0 && isDark(x, above)) {
      return null;
    }
    if (below < grid.height && isDark(x, below)) {
      return null;
    }
  }
  return (top + bottom + 1) / 2;
}

/**
 * Looks for the alignment pattern's B W B W B centre cross-section within one
 * row of the search window.
 */
function alignmentInRow(
  grid: BitGrid,
  y: number,
  fromX: number,
  toX: number,
  moduleSize: number,
  tolerance: number,
): Point | null {
  const runs = rowRuns(grid, y, fromX, toX);
  for (let i = 0; i + 4 < runs.length; i++) {
    if (!runs[i].dark) {
      continue;
    }
    const plausible = [0, 1, 2, 3, 4].every(
      (k) => Math.abs(runs[i + k].length - moduleSize) <= tolerance,
    );
    if (!plausible) {
      continue;
    }
    const centreX = runs[i + 2].start + runs[i + 2].length / 2;
    const centreY = verifyAlignmentColumn(
      grid,
      Math.floor(centreX),
      y,
      moduleSize,
      tolerance,
    );
    if (centreY !== null) {
      return { x: centreX, y: centreY };
    }
  }
  return null;
}

/**
 * Searches a ±4-module window around the extrapolated position for the
 * bottom-right alignment pattern, scanning rows outward from the estimate so
 * the first (closest) hit wins. Only the row through the pattern's centre
 * shows the full B W B W B cross-section, which is what makes this test far
 * more selective than the 1:1:3:1:1 finder test.
 */
function findAlignmentPattern(
  grid: BitGrid,
  estimate: Point,
  moduleSize: number,
): Point | null {
  const windowRadius = 4 * moduleSize;
  const fromX = Math.max(0, Math.floor(estimate.x - windowRadius));
  const toX = Math.min(grid.width, Math.ceil(estimate.x + windowRadius));
  if (toX - fromX < 5) {
    return null;
  }
  const baseY = Math.round(estimate.y);
  const maxOffset = Math.ceil(windowRadius);
  const tolerance = 0.6 * moduleSize;
  for (let offset = 0; offset <= maxOffset; offset++) {
    const rows = offset === 0 ? [baseY] : [baseY + offset, baseY - offset];
    for (const y of rows) {
      if (y < 0 || y >= grid.height) {
        continue;
      }
      const found = alignmentInRow(grid, y, fromX, toX, moduleSize, tolerance);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/** A quadrilateral's corners, in TL, TR, BR, BL order. */
type Quad = [Point, Point, Point, Point];

/**
 * Port of ZXing's PerspectiveTransform: a 3×3 projective matrix built from
 * four point correspondences. A plain affine fit would be enough for the
 * synthetic tests, but camera images of QR codes are genuinely perspective-
 * distorted, so the debugger uses the full projective mapping.
 */
class PerspectiveTransform {
  private constructor(
    private readonly a11: number,
    private readonly a21: number,
    private readonly a31: number,
    private readonly a12: number,
    private readonly a22: number,
    private readonly a32: number,
    private readonly a13: number,
    private readonly a23: number,
    private readonly a33: number,
  ) {}

  static squareToQuadrilateral([p0, p1, p2, p3]: Quad): PerspectiveTransform {
    const dx3 = p0.x - p1.x + p2.x - p3.x;
    const dy3 = p0.y - p1.y + p2.y - p3.y;
    if (dx3 === 0 && dy3 === 0) {
      // The quadrilateral is a parallelogram: the mapping is affine.
      return new PerspectiveTransform(
        p1.x - p0.x,
        p2.x - p1.x,
        p0.x,
        p1.y - p0.y,
        p2.y - p1.y,
        p0.y,
        0,
        0,
        1,
      );
    }
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const denominator = dx1 * dy2 - dx2 * dy1;
    const a13 = (dx3 * dy2 - dx2 * dy3) / denominator;
    const a23 = (dx1 * dy3 - dx3 * dy1) / denominator;
    return new PerspectiveTransform(
      p1.x - p0.x + a13 * p1.x,
      p3.x - p0.x + a23 * p3.x,
      p0.x,
      p1.y - p0.y + a13 * p1.y,
      p3.y - p0.y + a23 * p3.y,
      p0.y,
      a13,
      a23,
      1,
    );
  }

  static quadrilateralToSquare(quad: Quad): PerspectiveTransform {
    // The adjoint is the inverse up to scale, and scale cancels in the
    // projective divide, so no determinant division is needed.
    return PerspectiveTransform.squareToQuadrilateral(quad).buildAdjoint();
  }

  static quadrilateralToQuadrilateral(
    source: Quad,
    dest: Quad,
  ): PerspectiveTransform {
    return PerspectiveTransform.squareToQuadrilateral(dest).times(
      PerspectiveTransform.quadrilateralToSquare(source),
    );
  }

  private buildAdjoint(): PerspectiveTransform {
    return new PerspectiveTransform(
      this.a22 * this.a33 - this.a23 * this.a32,
      this.a23 * this.a31 - this.a21 * this.a33,
      this.a21 * this.a32 - this.a22 * this.a31,
      this.a13 * this.a32 - this.a12 * this.a33,
      this.a11 * this.a33 - this.a13 * this.a31,
      this.a12 * this.a31 - this.a11 * this.a32,
      this.a12 * this.a23 - this.a13 * this.a22,
      this.a13 * this.a21 - this.a11 * this.a23,
      this.a11 * this.a22 - this.a12 * this.a21,
    );
  }

  private times(other: PerspectiveTransform): PerspectiveTransform {
    return new PerspectiveTransform(
      this.a11 * other.a11 + this.a21 * other.a12 + this.a31 * other.a13,
      this.a11 * other.a21 + this.a21 * other.a22 + this.a31 * other.a23,
      this.a11 * other.a31 + this.a21 * other.a32 + this.a31 * other.a33,
      this.a12 * other.a11 + this.a22 * other.a12 + this.a32 * other.a13,
      this.a12 * other.a21 + this.a22 * other.a22 + this.a32 * other.a23,
      this.a12 * other.a31 + this.a22 * other.a32 + this.a32 * other.a33,
      this.a13 * other.a11 + this.a23 * other.a12 + this.a33 * other.a13,
      this.a13 * other.a21 + this.a23 * other.a22 + this.a33 * other.a23,
      this.a13 * other.a31 + this.a23 * other.a32 + this.a33 * other.a33,
    );
  }

  transformPoint(x: number, y: number): Point {
    const denominator = this.a13 * x + this.a23 * y + this.a33;
    return {
      x: (this.a11 * x + this.a21 * y + this.a31) / denominator,
      y: (this.a12 * x + this.a22 * y + this.a32) / denominator,
    };
  }
}

/**
 * Builds the module-space → image transform. The three finder centres pin
 * three corners at (3.5, 3.5) in from each corner; the fourth is either the
 * alignment pattern (at 6.5 in, giving a true projective fit) or the
 * parallelogram-extrapolated corner when there is none.
 */
function createTransform(
  topLeft: Point,
  topRight: Point,
  bottomLeft: Point,
  alignment: Point | null,
  bottomRightEst: Point,
  dimension: number,
): PerspectiveTransform {
  const dimMinusThree = dimension - 3.5;
  const sourceBottomRight = alignment
    ? { x: dimMinusThree - 3, y: dimMinusThree - 3 }
    : { x: dimMinusThree, y: dimMinusThree };
  const destBottomRight = alignment ?? bottomRightEst;
  return PerspectiveTransform.quadrilateralToQuadrilateral(
    [
      { x: 3.5, y: 3.5 },
      { x: dimMinusThree, y: 3.5 },
      sourceBottomRight,
      { x: 3.5, y: dimMinusThree },
    ],
    [topLeft, topRight, destBottomRight, bottomLeft],
  );
}

/**
 * Samples every module centre through the transform. A one-pixel fudge is
 * allowed at the image edge — sub-pixel error can push a corner module a
 * whisker outside the frame without the fix being meaningfully wrong — but
 * anything further out means the transform is bogus.
 */
function sampleMatrix(
  grid: BitGrid,
  transform: PerspectiveTransform,
  dimension: number,
): boolean[][] | null {
  const matrix: boolean[][] = [];
  for (let y = 0; y < dimension; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < dimension; x++) {
      const point = transform.transformPoint(x + 0.5, y + 0.5);
      const px = Math.floor(point.x);
      const py = Math.floor(point.y);
      if (px < -1 || px > grid.width || py < -1 || py > grid.height) {
        return null;
      }
      const clampedX = Math.min(Math.max(px, 0), grid.width - 1);
      const clampedY = Math.min(Math.max(py, 0), grid.height - 1);
      row.push(grid.bits[clampedY * grid.width + clampedX] === 1);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Samples the 4-module quiet zone through the same transform: any dark module
 * there is a spec violation worth reporting, even though the decode usually
 * survives it.
 *
 * Points that project outside the image are unknowable from the pixel data,
 * but their absence is still significant: when a side's entire quiet zone lies
 * outside the frame, the required quiet zone was never present in the image.
 * Those sides are recorded in the returned truncation flags.
 */
function findQuietZoneViolations(
  grid: BitGrid,
  transform: PerspectiveTransform,
  dimension: number,
): { violations: QuietZoneViolation[]; truncation: QuietZoneTruncation } {
  const violations: QuietZoneViolation[] = [];
  const truncation: QuietZoneTruncation = {
    top: false,
    right: false,
    bottom: false,
    left: false,
  };
  for (let y = -4; y < dimension + 4; y++) {
    for (let x = -4; x < dimension + 4; x++) {
      if (x >= 0 && x < dimension && y >= 0 && y < dimension) {
        continue;
      }
      const point = transform.transformPoint(x + 0.5, y + 0.5);
      const px = Math.floor(point.x);
      const py = Math.floor(point.y);
      if (px < 0 || px >= grid.width || py < 0 || py >= grid.height) {
        if (y < 0) {
          truncation.top = true;
        }
        if (y >= dimension) {
          truncation.bottom = true;
        }
        if (x < 0) {
          truncation.left = true;
        }
        if (x >= dimension) {
          truncation.right = true;
        }
        continue;
      }
      if (grid.bits[py * grid.width + px] === 1) {
        violations.push({ x, y });
      }
    }
  }
  return { violations, truncation };
}

export function analyseImage(image: RgbaImage): AnalysisResult<ImageAnalysis> {
  const { grid: initialGrid, threshold } = binarise(image);

  // Light-on-dark symbols are legal and common on dark-mode screens; the
  // detector is polarity-sensitive, so retry once with the bits flipped.
  let grid = initialGrid;
  let inverted = false;
  let patterns = locateFinderPatterns(grid);
  if (!patterns) {
    grid = invertGrid(initialGrid);
    patterns = locateFinderPatterns(grid);
    if (patterns) {
      inverted = true;
    } else {
      return {
        ok: false,
        stage: 'locate',
        message:
          'Fewer than three finder patterns were found in either polarity, so no QR code could be located.',
        partial: { threshold, inverted: false },
      };
    }
  }

  const { topLeft, topRight, bottomLeft } = orderPatterns(patterns);
  const moduleSize = correctedModuleSize(patterns, topLeft, topRight);
  const dimension = computeDimension(topLeft, topRight, bottomLeft, moduleSize);
  if (dimension === null) {
    return {
      ok: false,
      stage: 'extract',
      message:
        'The spacing of the finder patterns does not correspond to a valid QR symbol size.',
      partial: {
        threshold,
        inverted,
        location: { topLeft, topRight, bottomLeft, alignment: null },
      },
    };
  }

  // The alignment pattern (version 2 up, so 25 modules and larger) gives a
  // fourth measured point, letting the transform absorb real perspective
  // distortion instead of assuming a parallelogram.
  const bottomRightEst = {
    x: topRight.x + bottomLeft.x - topLeft.x,
    y: topRight.y + bottomLeft.y - topLeft.y,
  };
  let alignment: Point | null = null;
  if (dimension >= 25) {
    const fraction = 1 - 3 / (dimension - 7);
    alignment = findAlignmentPattern(
      grid,
      {
        x: topLeft.x + fraction * (bottomRightEst.x - topLeft.x),
        y: topLeft.y + fraction * (bottomRightEst.y - topLeft.y),
      },
      moduleSize,
    );
  }

  const location: QRLocationReport = {
    topLeft: { x: topLeft.x, y: topLeft.y },
    topRight: { x: topRight.x, y: topRight.y },
    bottomLeft: { x: bottomLeft.x, y: bottomLeft.y },
    alignment,
  };
  const transform = createTransform(
    location.topLeft,
    location.topRight,
    location.bottomLeft,
    alignment,
    bottomRightEst,
    dimension,
  );
  const mapToImage = (moduleX: number, moduleY: number): Point =>
    transform.transformPoint(moduleX, moduleY);

  const sampled = sampleMatrix(grid, transform, dimension);
  if (!sampled) {
    return {
      ok: false,
      stage: 'extract',
      message:
        'The projected sampling grid falls outside the image, so the modules could not be read.',
      partial: { threshold, inverted, location, mapToImage },
    };
  }

  const { violations: quietZoneViolations, truncation: quietZoneTruncation } =
    findQuietZoneViolations(grid, transform, dimension);
  const imageFields = {
    location,
    mapToImage,
    inverted,
    quietZoneViolations,
    quietZoneTruncation,
    threshold,
  };
  const matrixResult = analyseMatrix(sampled);
  if (!matrixResult.ok) {
    return {
      ok: false,
      stage: matrixResult.stage,
      message: matrixResult.message,
      partial: { ...matrixResult.partial, ...imageFields },
    };
  }
  return { ok: true, analysis: { ...matrixResult.analysis, ...imageFields } };
}
