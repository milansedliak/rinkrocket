/**
 * Print guidelines drawn on the canvas. World coordinates are in feet; these
 * constants describe a Letter portrait page with 0.5″ margins at a scale of
 * 1″ = 24 ft. The canvas renders a repeating grid of these page tiles to act
 * as page-break guidelines.
 *
 * Hard-coded for now. When we ship real PDF/print export these become
 * user-configurable (paper size, orientation, scale).
 */

export const PRINT_FT_PER_INCH = 24;
export const PRINT_PAPER_LABEL = "Letter portrait";
export const PRINT_MARGIN_INCHES = 0.5;

/**
 * Screen pixels per world foot at 100% zoom. Derived from print scale so that
 * `zoom = 1.0` renders at exactly the printed size on a 96 DPI screen:
 *   96 px/in ÷ 24 ft/in = 4 px/ft
 * Bump this if we change `PRINT_FT_PER_INCH` so the two stay in sync.
 */
export const PX_PER_FT_AT_100 = 4;

const PAPER_WIDTH_IN = 8.5;
const PAPER_HEIGHT_IN = 11;

const USABLE_WIDTH_IN = PAPER_WIDTH_IN - PRINT_MARGIN_INCHES * 2;
const USABLE_HEIGHT_IN = PAPER_HEIGHT_IN - PRINT_MARGIN_INCHES * 2;

/** Printable (within-margin) area in world feet. */
export const PRINT_AREA_SIZE = {
  width: USABLE_WIDTH_IN * PRINT_FT_PER_INCH, // 240 ft
  height: USABLE_HEIGHT_IN * PRINT_FT_PER_INCH, // 180 ft
} as const;

/** Top-left corner of the print area in world coords (centered on origin). */
export const PRINT_AREA_ORIGIN = {
  x: -PRINT_AREA_SIZE.width / 2,
  y: -PRINT_AREA_SIZE.height / 2,
} as const;
