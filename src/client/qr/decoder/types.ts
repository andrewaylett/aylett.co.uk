/*
 * Shared types for the QR debugger's instrumented decode pipeline.
 *
 * The pipeline deliberately reports far more than a normal decoder: the point
 * of the debugger is to show *how* a QR code was created and how damaged it
 * is, not merely to extract its text. Every stage therefore returns rich
 * diagnostics rather than throwing away intermediate results.
 *
 * These types are framework-free and DOM-free: images are structural
 * `{ data, width, height }` objects (never `ImageData`) so the whole decode
 * pipeline runs under jsdom in tests.
 */

import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react';

/** An RGBA bitmap, structurally compatible with `ImageData`. */
export interface RgbaImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Statistics from the binarizer's adaptive threshold, for the report. */
export interface ThresholdInfo {
  min: number;
  mean: number;
  max: number;
}

/** One of the two redundant 15-bit format-information copies. */
export interface FormatCopy {
  /** The 15 bits as read from the matrix (after the 0x5412 unmasking XOR). */
  rawBits: number;
  /** Hamming distance from the nearest valid BCH codeword. */
  bitErrors: number;
}

export interface FormatReport {
  ecl: ErrorCorrectionLevel;
  /** Mask pattern, 0–7. */
  mask: number;
  /** Copy 0 wraps the top-left finder; copy 1 is split top-right/bottom-left. */
  copies: [FormatCopy, FormatCopy];
  /** Bit errors in the copy the decode was taken from. */
  totalBitErrors: number;
}

export interface VersionInfoCopy {
  /** The 18 bits as read from the matrix. */
  rawBits: number;
  /** Hamming distance from the codeword for the size-derived version. */
  bitErrors: number;
}

export interface VersionReport {
  /** Authoritative version, derived from the matrix size. */
  version: number;
  /** The two decoded version-information blocks; only present for v7+. */
  decodedCopies?: [VersionInfoCopy, VersionInfoCopy];
  /** True if a decoded version-info block disagrees with the size. */
  discrepancy: boolean;
}

/** Diagnostics for one Reed–Solomon block. */
export interface BlockReport {
  /** Position of this block in the de-interleaved sequence. */
  index: number;
  dataCodewords: number;
  eccCodewords: number;
  errorsCorrected: number;
  /** Codeword indices (within this block) that were corrected. */
  errorPositions: number[];
  /** True when the damage exceeded the block's correction capacity. */
  failed: boolean;
}

export type SegmentModeName =
  | 'NUMERIC'
  | 'ALPHANUMERIC'
  | 'BYTE'
  | 'KANJI'
  | 'ECI'
  | 'FNC1'
  | 'STRUCTURED_APPEND'
  | 'UNKNOWN';

export interface ParsedSegment {
  mode: SegmentModeName;
  /** The 4-bit mode indicator as read from the stream. */
  modeBits: number;
  /** Character count from the segment header (0 for header-only segments). */
  numChars: number;
  /** Decoded text, where the mode carries text. */
  text?: string;
  /** Raw payload bytes, for BYTE mode. */
  bytes?: number[];
  /** ECI assignment value, for ECI segments. */
  eciValue?: number;
  /** Position of this segment within the data bitstream. */
  bitOffset: number;
  bitLength: number;
}

export interface StreamReport {
  segments: ParsedSegment[];
  /** Concatenated decoded text of all text-bearing segments. */
  text: string;
  /** Number of terminator bits actually present (0–4). */
  terminatorBits: number;
  /** Trailing pad codewords as read from the stream. */
  paddingBytes: number[];
  /** True when the padding is the standard alternating 0xEC/0x11 sequence. */
  paddingConforms: boolean;
}

/** Classification of a module's role within the QR symbol. */
export type ModuleRegion =
  | 'data'
  | 'ecc'
  | 'format'
  | 'version'
  | 'finder'
  | 'timing'
  | 'alignment'
  | 'dark'
  | 'remainder';

/** A module whose sampled value differs from the corrected canonical value. */
export interface ModuleDiff {
  x: number;
  y: number;
  sampled: boolean;
  canonical: boolean;
  region: ModuleRegion;
}

/** A dark module found inside the 4-module quiet zone. Coordinates are in
 * module space relative to the symbol's top-left, so each of x and y is in
 * [-4, size+4) with at least one outside [0, size). */
export interface QuietZoneViolation {
  x: number;
  y: number;
}

export interface MatrixAnalysis {
  size: number;
  /** True when the matrix only decoded after transposition (mirrored code). */
  mirrored: boolean;
  format: FormatReport;
  version: VersionReport;
  blocks: BlockReport[];
  totalErrorsCorrected: number;
  /** True when any block failed; stream/canonical/diffs are then absent. */
  correctionFailed: boolean;
  stream?: StreamReport;
  /** The matrix as sampled (post-transposition orientation if mirrored). */
  sampledMatrix: boolean[][];
  /** The matrix as it should have been, rebuilt from corrected codewords. */
  canonicalMatrix?: boolean[][];
  /** Modules that differ between sampled and canonical. */
  diffs?: ModuleDiff[];
  /** Data-area remainder bits that were unexpectedly dark. */
  remainderBitsSet: number;
}

export interface QRLocationReport {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  alignment: Point | null;
}

export interface ImageAnalysis extends MatrixAnalysis {
  location: QRLocationReport;
  /** Maps module-space coordinates to source-image pixel coordinates. */
  mapToImage: (moduleX: number, moduleY: number) => Point;
  /** True when the code was light-on-dark in the source image. */
  inverted: boolean;
  quietZoneViolations: QuietZoneViolation[];
  threshold: ThresholdInfo;
}

export type AnalysisStage = 'locate' | 'extract' | 'format' | 'correction';

export type AnalysisResult<T> =
  | { ok: true; analysis: T }
  | { ok: false; stage: AnalysisStage; message: string; partial?: Partial<T> };
