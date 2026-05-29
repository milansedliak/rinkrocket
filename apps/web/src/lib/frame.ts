/**
 * Frame: a playing surface (rink, half-rink, zone, etc.) placed on the canvas.
 * The sidebar exposes `FrameTemplate`s (the catalog); dropping one onto the
 * canvas yields a `PlacedFrame` (an instance with id + world position).
 *
 * World units are feet — frame sizes are NHL regulation dimensions.
 */

export type FrameKind =
  | "full-rink"
  | "half-rink"
  | "offensive-zone"
  | "defensive-zone"
  | "neutral-zone";

/** Bounding-box corner identifiers (also reused for resize handles). */
export type FrameCorner = "tl" | "tr" | "br" | "bl";

export const ALL_CORNERS: ReadonlyArray<FrameCorner> = [
  "tl",
  "tr",
  "br",
  "bl",
];

export type FrameTemplate = {
  kind: FrameKind;
  label: string;
  description: string;
  /** World-space width in feet. */
  width: number;
  /** World-space height in feet. */
  height: number;
  /**
   * Corner radius as a fraction of the frame's `height` — the 85-ft across
   * (end-board) dimension on every rink template (0 = square). NHL spec: a
   * 200 × 85 ft rink has a 28 ft corner radius, so the ratio is 28/85 and the
   * real radius is `height * 28/85`. Because resizing locks the aspect ratio,
   * this scales proportionally and a rink stays looking like a rink at any
   * size — independent of how deep (width) the frame is.
   */
  cornerRadiusRatio: number;
  /**
   * Which corners of the bounding box are rounded. Corners not listed render
   * as right-angles, which is how half-rinks / zones look (the boards-end
   * curves, but the "cut" end at the blue line is straight).
   */
  roundedCorners: ReadonlyArray<FrameCorner>;
};

export type PlacedFrame = {
  id: string;
  kind: FrameKind;
  label: string;
  /**
   * Top-left of the frame's *unrotated* bounding box in world coordinates.
   * Rotation (when non-zero) is applied at render time around the bbox center,
   * so this anchor is unaffected by rotation — translating it moves the
   * (rotated) frame as a whole.
   */
  position: { x: number; y: number };
  width: number;
  height: number;
  /** Ratio of `height` (28/85 for rinks); same semantics as on the template. */
  cornerRadiusRatio: number;
  /** Same semantics as on the template. Copied at placement time. */
  roundedCorners: ReadonlyArray<FrameCorner>;
  /**
   * Rotation in degrees (clockwise, SVG convention) applied around the
   * bounding-box center.
   */
  rotation: number;
};

// All hockey-rink-shaped frames share the same NHL board curvature.
const NHL_CORNER_RATIO = 28 / 85;

// Default orientation conventions (rink drawn horizontally with goals at the
// left and right ends): "half-rink" represents the LEFT half of the ice;
// "offensive-zone" the rightmost 64 ft (attacking); "defensive-zone" the
// leftmost 64 ft (defending). Mirror UI can flip these later.
export const FRAME_TEMPLATES: readonly FrameTemplate[] = [
  {
    kind: "full-rink",
    label: "Full rink",
    description: "200 × 85 ft — NHL regulation",
    width: 200,
    height: 85,
    cornerRadiusRatio: NHL_CORNER_RATIO,
    roundedCorners: ["tl", "tr", "br", "bl"],
  },
  {
    kind: "half-rink",
    label: "Half rink",
    description: "100 × 85 ft — half-ice drills",
    width: 100,
    height: 85,
    cornerRadiusRatio: NHL_CORNER_RATIO,
    roundedCorners: ["tl", "bl"],
  },
  {
    kind: "offensive-zone",
    label: "Offensive zone",
    description: "75 × 85 ft — blue line to end boards",
    width: 75,
    height: 85,
    cornerRadiusRatio: NHL_CORNER_RATIO,
    roundedCorners: ["tr", "br"],
  },
  {
    kind: "defensive-zone",
    label: "Defensive zone",
    description: "75 × 85 ft — end boards to blue line",
    width: 75,
    height: 85,
    cornerRadiusRatio: NHL_CORNER_RATIO,
    roundedCorners: ["tl", "bl"],
  },
  {
    kind: "neutral-zone",
    label: "Neutral zone",
    description: "50 × 85 ft — between blue lines",
    width: 50,
    height: 85,
    cornerRadiusRatio: 0,
    roundedCorners: [],
  },
];

/**
 * Actual corner radius (in world feet) for a frame at its current size.
 *
 * Derived from the NHL relationship: a 200 × 85 ft rink has a 28 ft corner
 * radius, i.e. radius = (28/85) × the 85-ft across dimension. That across
 * dimension is the frame's `height` on every template, so the radius scales
 * with `height` and stays correct for any size or zone depth (width).
 */
export function frameCornerRadius(frame: {
  width: number;
  height: number;
  cornerRadiusRatio: number;
}): number {
  return frame.height * frame.cornerRadiusRatio;
}

/** Custom MIME so unrelated drag content (text, files) doesn't trigger a drop. */
export const FRAME_DRAG_MIME = "application/x-rinkrocket-frame-kind";

/** Smallest a frame can be resized to (in feet). */
export const MIN_FRAME_SIZE = 20;

export type ResizeHandle = "tl" | "tr" | "br" | "bl";

/** Center of the frame's bounding box in world coordinates. */
export function frameCenter(frame: {
  position: { x: number; y: number };
  width: number;
  height: number;
}): { x: number; y: number } {
  return {
    x: frame.position.x + frame.width / 2,
    y: frame.position.y + frame.height / 2,
  };
}

/**
 * Rotate a 2D vector by `radians`, clockwise in SVG screen space (Y-down).
 * Matches the orientation of `<g transform="rotate(deg)">`.
 */
export function rotateVec(
  v: { x: number; y: number },
  radians: number,
): { x: number; y: number } {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

// Each resize handle's diagonally opposite corner expressed as the local-space
// offset (relative to the bbox center) of the FIXED corner that should stay
// pinned in world space during the resize.
const FIXED_CORNER_SIGN: Record<ResizeHandle, { sx: -1 | 1; sy: -1 | 1 }> = {
  br: { sx: -1, sy: -1 }, // tl is fixed
  tr: { sx: -1, sy: 1 }, // bl is fixed
  tl: { sx: 1, sy: 1 }, // br is fixed
  bl: { sx: 1, sy: -1 }, // tr is fixed
};

// Sign that converts the (fixed-corner → dragged-corner) world vector
// rotated back into local space into positive (w, h). Same magnitude as
// FIXED_CORNER_SIGN but inverted, since dragged is opposite to fixed.
const DRAG_SIGN: Record<ResizeHandle, { sw: -1 | 1; sh: -1 | 1 }> = {
  br: { sw: 1, sh: 1 },
  tr: { sw: 1, sh: -1 },
  tl: { sw: -1, sh: -1 },
  bl: { sw: -1, sh: 1 },
};

/**
 * Resize a (possibly rotated) frame so the diagonally-opposite corner stays
 * fixed in world space and the rotation is preserved. The dragged corner
 * follows `cursorWorld`.
 *
 * The frame's aspect ratio is LOCKED to its initial ratio so the rink keeps
 * its proportions — circles, lines, and faceoff dots scale uniformly and never
 * distort. The cursor drives the dominant axis (whichever scale is larger), so
 * the corner still tracks the pointer naturally. Clamped to `min` (no flip).
 */
export function applyFrameResize(
  initial: {
    position: { x: number; y: number };
    width: number;
    height: number;
    rotation: number;
  },
  handle: ResizeHandle,
  cursorWorld: { x: number; y: number },
  min = MIN_FRAME_SIZE,
): { position: { x: number; y: number }; width: number; height: number } {
  const theta = (initial.rotation * Math.PI) / 180;
  const c0 = frameCenter(initial);

  const fix = FIXED_CORNER_SIGN[handle];
  const fixedRel = {
    x: fix.sx * (initial.width / 2),
    y: fix.sy * (initial.height / 2),
  };
  const fixedRelRotated = rotateVec(fixedRel, theta);
  const fixedWorld = {
    x: c0.x + fixedRelRotated.x,
    y: c0.y + fixedRelRotated.y,
  };

  // Diagonal vector from fixed corner to cursor, expressed in local (unrotated)
  // frame space.
  const diagWorld = {
    x: cursorWorld.x - fixedWorld.x,
    y: cursorWorld.y - fixedWorld.y,
  };
  const diagLocal = rotateVec(diagWorld, -theta);

  const sgn = DRAG_SIGN[handle];
  const rawW = sgn.sw * diagLocal.x;
  const rawH = sgn.sh * diagLocal.y;

  // Lock to the initial aspect ratio: scale uniformly, following whichever
  // axis the cursor pushed further.
  let scale = Math.max(rawW / initial.width, rawH / initial.height);
  const minScale = Math.max(min / initial.width, min / initial.height);
  if (!(scale >= minScale)) scale = minScale; // also catches NaN / negatives

  const w = initial.width * scale;
  const h = initial.height * scale;

  // New center: place the fixed corner back at its world position, accounting
  // for the new dimensions.
  const newFixedRel = { x: fix.sx * (w / 2), y: fix.sy * (h / 2) };
  const newFixedRelRotated = rotateVec(newFixedRel, theta);
  const newCenter = {
    x: fixedWorld.x - newFixedRelRotated.x,
    y: fixedWorld.y - newFixedRelRotated.y,
  };

  return {
    position: { x: newCenter.x - w / 2, y: newCenter.y - h / 2 },
    width: w,
    height: h,
  };
}

const VALID_KINDS: ReadonlySet<string> = new Set(
  FRAME_TEMPLATES.map((t) => t.kind),
);

export function isFrameKind(value: string): value is FrameKind {
  return VALID_KINDS.has(value);
}

export function getFrameTemplate(kind: FrameKind): FrameTemplate | undefined {
  return FRAME_TEMPLATES.find((t) => t.kind === kind);
}

let frameIdCounter = 0;
export function generateFrameId(): string {
  frameIdCounter += 1;
  return `frame_${Date.now().toString(36)}_${frameIdCounter.toString(36)}`;
}

/** Place a frame so that `worldCenter` lands at its center. */
export function placeFrameFromTemplate(
  template: FrameTemplate,
  worldCenter: { x: number; y: number },
): PlacedFrame {
  return {
    id: generateFrameId(),
    kind: template.kind,
    label: template.label,
    position: {
      x: worldCenter.x - template.width / 2,
      y: worldCenter.y - template.height / 2,
    },
    width: template.width,
    height: template.height,
    cornerRadiusRatio: template.cornerRadiusRatio,
    roundedCorners: template.roundedCorners,
    rotation: 0,
  };
}

/** World-space offset (feet) applied to a pasted/duplicated frame so the copy
 *  is visibly nudged off its source instead of landing exactly on top. */
export const PASTE_OFFSET_FT = 20;

/**
 * Clone a placed frame as a brand-new instance: fresh id, all other properties
 * deep-copied, and the position nudged down-right by `offset` so the copy is
 * distinguishable from its source. Used by copy/paste and duplicate.
 */
export function clonePlacedFrame(
  frame: PlacedFrame,
  offset = PASTE_OFFSET_FT,
): PlacedFrame {
  return {
    ...frame,
    id: generateFrameId(),
    position: {
      x: frame.position.x + offset,
      y: frame.position.y + offset,
    },
    roundedCorners: [...frame.roundedCorners],
  };
}

/** Normalize a rotation in degrees to (-180, 180]. */
export function normalizeRotation(deg: number): number {
  const r = ((deg + 180) % 360 + 360) % 360 - 180;
  return r === -180 ? 180 : r;
}

/**
 * Build an SVG path string that traces a rectangle's outline, rounding only
 * the listed corners. Walks the boundary clockwise starting at the top edge.
 */
export function buildFramePath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  rounded: ReadonlyArray<FrameCorner>,
): string {
  const r = Math.max(0, radius);
  const tl = rounded.includes("tl") ? r : 0;
  const tr = rounded.includes("tr") ? r : 0;
  const br = rounded.includes("br") ? r : 0;
  const bl = rounded.includes("bl") ? r : 0;
  const x2 = x + width;
  const y2 = y + height;

  let d = `M ${x + tl} ${y} L ${x2 - tr} ${y}`;
  if (tr > 0) d += ` A ${tr} ${tr} 0 0 1 ${x2} ${y + tr}`;
  d += ` L ${x2} ${y2 - br}`;
  if (br > 0) d += ` A ${br} ${br} 0 0 1 ${x2 - br} ${y2}`;
  d += ` L ${x + bl} ${y2}`;
  if (bl > 0) d += ` A ${bl} ${bl} 0 0 1 ${x} ${y2 - bl}`;
  d += ` L ${x} ${y + tl}`;
  if (tl > 0) d += ` A ${tl} ${tl} 0 0 1 ${x + tl} ${y}`;
  d += " Z";
  return d;
}
