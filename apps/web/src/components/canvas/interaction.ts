/** Marks the invisible rotate zone just outside each frame corner (Figma-style). */
export const ROTATE_CORNER_ATTR = "frame-rotate-corner";

/** Marks a drag handle on a selected player/marker for free rotation. */
export const ELEMENT_ROTATE_ATTR = "element-rotate";

export const FRAME_MOVE_ATTR = "frame-move";

/** Rotation cursor with white halo; hotspot at (12, 12). */
export const ROTATE_CURSOR =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath stroke='white' stroke-width='4' d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.65 2.85L21 8'/%3E%3Cpath stroke='white' stroke-width='4' d='M21 3v5h-5'/%3E%3Cpath stroke='black' stroke-width='2' d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.65 2.85L21 8'/%3E%3Cpath stroke='black' stroke-width='2' d='M21 3v5h-5'/%3E%3C/svg%3E\") 12 12, grab";
