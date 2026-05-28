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
   * Corner radius as a fraction of `min(width, height)` (0 = square).
   * Stored as a ratio so it scales proportionally on resize — a "rink" stays
   * looking like a rink at any size. NHL spec: 28 ft on an 85 ft rink width.
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
  /** Top-left corner in world coordinates. */
  position: { x: number; y: number };
  width: number;
  height: number;
  /** Ratio of `min(width, height)`; same semantics as on the template. */
  cornerRadiusRatio: number;
  /** Same semantics as on the template. Copied at placement time. */
  roundedCorners: ReadonlyArray<FrameCorner>;
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
    description: "64 × 85 ft — goal line to blue line",
    width: 64,
    height: 85,
    cornerRadiusRatio: NHL_CORNER_RATIO,
    roundedCorners: ["tr", "br"],
  },
  {
    kind: "defensive-zone",
    label: "Defensive zone",
    description: "64 × 85 ft — blue line to goal line",
    width: 64,
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

/** Actual corner radius (in world feet) for a frame at its current size. */
export function frameCornerRadius(frame: {
  width: number;
  height: number;
  cornerRadiusRatio: number;
}): number {
  return Math.min(frame.width, frame.height) * frame.cornerRadiusRatio;
}

/** Custom MIME so unrelated drag content (text, files) doesn't trigger a drop. */
export const FRAME_DRAG_MIME = "application/x-rinkrocket-frame-kind";

/** Smallest a frame can be resized to (in feet). */
export const MIN_FRAME_SIZE = 20;

export type ResizeHandle = "tl" | "tr" | "br" | "bl";

/**
 * Apply a resize delta (in world coords) to a frame's bounding box. The handle
 * indicates which corner is being dragged; the opposite corner stays fixed.
 * Clamps to `min` so the frame can't be inverted or made smaller than the min.
 */
export function applyFrameResize(
  initial: {
    position: { x: number; y: number };
    width: number;
    height: number;
  },
  handle: ResizeHandle,
  delta: { x: number; y: number },
  min = MIN_FRAME_SIZE,
): { position: { x: number; y: number }; width: number; height: number } {
  const right0 = initial.position.x + initial.width;
  const bottom0 = initial.position.y + initial.height;

  let x = initial.position.x;
  let y = initial.position.y;
  let w = initial.width;
  let h = initial.height;

  switch (handle) {
    case "tl":
      x = initial.position.x + delta.x;
      y = initial.position.y + delta.y;
      w = initial.width - delta.x;
      h = initial.height - delta.y;
      if (w < min) {
        x = right0 - min;
        w = min;
      }
      if (h < min) {
        y = bottom0 - min;
        h = min;
      }
      break;
    case "tr":
      y = initial.position.y + delta.y;
      w = initial.width + delta.x;
      h = initial.height - delta.y;
      if (w < min) w = min;
      if (h < min) {
        y = bottom0 - min;
        h = min;
      }
      break;
    case "br":
      w = initial.width + delta.x;
      h = initial.height + delta.y;
      if (w < min) w = min;
      if (h < min) h = min;
      break;
    case "bl":
      x = initial.position.x + delta.x;
      w = initial.width - delta.x;
      h = initial.height + delta.y;
      if (w < min) {
        x = right0 - min;
        w = min;
      }
      if (h < min) h = min;
      break;
  }

  return { position: { x, y }, width: w, height: h };
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
  };
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
