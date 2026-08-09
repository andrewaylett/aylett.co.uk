// Shared layout constants for the 'text' and 'cutout' dot styles.

// The quiet-zone width, in modules, drawn around every rendered QR code.
export const SPEC_MARGIN_SIZE = 4;

// Structural zones: top 9 rows (TL+TR finders + format info) and bottom 8 rows
// (BL finder + format info). Interior data rows: 9 … size−9 = size−17 rows total.
export const STRUCTURAL_TOP_ROWS = 9;
export const STRUCTURAL_BOTTOM_ROWS = 8;
