"use client";

import {
  RINK_NOMINAL_HEIGHT_FT,
  type PathElement,
  type PathEndStyle,
  type PathKind,
} from "@/lib/frame";

const SELECTION_COLOR = "rgb(14, 165, 233)"; // sky-500
const PATH_COLOR = "#0f172a"; // slate-900

// All sizes are in *nominal* rink feet and multiplied by `scale`
// (= frameHeight / 85) so lines stay proportional to the rink at any size.
const STROKE_FT = 0.7;
const ARROW_LEN_FT = 3.4;
const ARROW_HALF_W_FT = 2.1;
const WAVE_AMP_FT = 1.4;
const WAVE_LEN_FT = 4.2;
const LOOP_R_FT = 1.5;
const LOOP_SPACING_FT = 4.5;
const SHOT_TICK_HALF_FT = 1.8;
const STOP_BAR_HALF_FT = 2.6;

type P = { x: number; y: number };

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

/** Resample a polyline at even arc-length spacing (no curve fitting). */
function subsampleAlongPath(pts: P[], spacingFt: number): P[] {
  const { lengths, total } = cumulative(pts);
  if (total === 0) return [pts[0]];
  if (spacingFt <= 0 || total <= spacingFt) {
    return [pts[0], pts[pts.length - 1]];
  }

  const out: P[] = [pts[0]];
  let next = spacingFt;
  for (let i = 1; i < pts.length; i++) {
    const segLen = lengths[i] - lengths[i - 1];
    if (segLen <= 0) continue;
    while (next <= lengths[i]) {
      const f = (next - lengths[i - 1]) / segLen;
      out.push({
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f,
      });
      next += spacingFt;
    }
  }
  const end = pts[pts.length - 1];
  if (dist(out[out.length - 1], end) > 1e-6) out.push(end);
  return out;
}

/** Point on a polyline at arc-length `d`. */
function pointAtLength(pts: P[], lengths: number[], d: number): P {
  const total = lengths[lengths.length - 1] || 0;
  if (d <= 0) return { ...pts[0] };
  if (d >= total) return { ...pts[pts.length - 1] };
  let i = 1;
  while (i < lengths.length && lengths[i] < d) i++;
  const seg = lengths[i] - lengths[i - 1] || 1;
  const f = (d - lengths[i - 1]) / seg;
  return {
    x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f,
    y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f,
  };
}

/** Unit tangent on a polyline at arc-length `d`. */
function tangentAtLength(pts: P[], lengths: number[], d: number): P {
  const total = lengths[lengths.length - 1] || 0;
  const eps = Math.min(0.4, total * 0.02);
  const p0 = pointAtLength(pts, lengths, Math.max(0, d - eps));
  const p1 = pointAtLength(pts, lengths, Math.min(total, d + eps));
  const len = dist(p0, p1) || 1;
  return { x: (p1.x - p0.x) / len, y: (p1.y - p0.y) / len };
}

/** Backbone for puck-carry: follows the drawn stroke as a polyline (no splines). */
function carrySpine(pts: P[], scale: number): P[] {
  if (pts.length <= 2) return pts.slice();
  const spacing = Math.max(WAVE_LEN_FT * scale * 0.2, 0.4);
  return subsampleAlongPath(pts, spacing);
}

/**
 * Symmetrical puck-carry squiggle: whole-number of waves, centered on the path,
 * with a smooth envelope that fades to zero at both ends.
 */
function carrySquiggle(spinePts: P[], amp: number, wavelen: number): P[] {
  const { lengths, total } = cumulative(spinePts);
  if (total < 1e-6) return spinePts;

  const cycles = Math.max(2, Math.round(total / wavelen));
  const steps = Math.max(40, Math.ceil(total / (wavelen * 0.12)));
  const out: P[] = [];

  for (let s = 0; s <= steps; s++) {
    const d = (s / steps) * total;
    const p = pointAtLength(spinePts, lengths, d);
    const t = tangentAtLength(spinePts, lengths, d);
    const nx = -t.y;
    const ny = t.x;
    const u = d / total;
    const envelope = Math.sin(u * Math.PI);
    const off = amp * envelope * Math.sin(u * cycles * Math.PI * 2);
    out.push({ x: p.x + nx * off, y: p.y + ny * off });
  }

  return out;
}

/** Build the visible polyline for a movement line (shared by draw + hit-test). */
export function pathLinePoints(
  worldPoints: P[],
  kind: PathKind,
  scale: number,
): P[] {
  if (worldPoints.length < 2) return worldPoints;
  if (kind === "carry") {
    return carrySquiggle(
      carrySpine(worldPoints, scale),
      WAVE_AMP_FT * scale,
      WAVE_LEN_FT * scale,
    );
  }
  return spline(worldPoints);
}

/** Sample a Catmull-Rom spline through `pts` into a dense polyline. */
function spline(pts: P[], perSeg = 16): P[] {
  if (pts.length < 3) return pts.slice();
  const out: P[] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    for (let j = 0; j < perSeg; j++) {
      const t = j / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[n - 1]);
  return out;
}

const polyD = (pts: P[]) =>
  pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");

/** Cumulative arc length at each sample. */
function cumulative(pts: P[]): { lengths: number[]; total: number } {
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1] + dist(pts[i], pts[i - 1]));
  }
  return { lengths, total: lengths[lengths.length - 1] || 0 };
}

/** Unit tangent at sample i (central difference). */
function tangentAt(pts: P[], i: number): P {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  const len = dist(a, b) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** Evenly spaced points (with tangents) along the spine, for loop markers. */
function sampleEvenly(
  spinePts: P[],
  spacing: number,
): { pt: P; t: P }[] {
  const { lengths, total } = cumulative(spinePts);
  const out: { pt: P; t: P }[] = [];
  for (let d = spacing; d < total - spacing * 0.5; d += spacing) {
    // find segment containing d
    let i = 1;
    while (i < lengths.length && lengths[i] < d) i++;
    const i0 = Math.max(1, i);
    const seg = lengths[i0] - lengths[i0 - 1] || 1;
    const f = (d - lengths[i0 - 1]) / seg;
    const a = spinePts[i0 - 1];
    const b = spinePts[i0];
    out.push({
      pt: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
      t: tangentAt(spinePts, i0),
    });
  }
  return out;
}

/**
 * Renders the *visible* drawing of a movement line from world-space points.
 * Reused by committed paths (`PathView`) and the in-progress draft preview.
 */
export function PathShape({
  worldPoints,
  kind,
  endStyle,
  scale,
  selected,
}: {
  worldPoints: P[];
  kind: PathKind;
  endStyle: PathEndStyle;
  /** nominal-feet → world-feet factor (frameHeight / 85). */
  scale: number;
  selected?: boolean;
}) {
  if (worldPoints.length < 2) return null;

  const sw = STROKE_FT * scale;
  const halo = sw + 0.5 * scale;
  const linePts = pathLinePoints(worldPoints, kind, scale);
  const lineD = polyD(linePts);
  const spinePts =
    kind === "carry" ? carrySpine(worldPoints, scale) : spline(worldPoints);

  const dashed = kind === "pass";
  const dash = `${2.4 * scale} ${1.8 * scale}`;

  // Arrow / stop cap: puck-carry ends on the centerline; point along path travel.
  const tip = linePts[linePts.length - 1];
  const { lengths: spineLens, total: spineLen } = cumulative(spinePts);
  const tan =
    kind === "carry"
      ? tangentAtLength(spinePts, spineLens, spineLen)
      : tangentAt(spinePts, spinePts.length - 1);
  const decorations: React.ReactNode[] = [];

  if (endStyle === "arrow") {
    const aLen = ARROW_LEN_FT * scale;
    const aw = ARROW_HALF_W_FT * scale;
    const bx = tip.x - tan.x * aLen;
    const by = tip.y - tan.y * aLen;
    const nx = -tan.y;
    const ny = tan.x;
    decorations.push(
      <path
        key="arrow"
        d={`M ${tip.x} ${tip.y} L ${bx + nx * aw} ${by + ny * aw} L ${bx - nx * aw} ${by - ny * aw} Z`}
        fill={PATH_COLOR}
        stroke="none"
      />,
    );
  } else if (endStyle === "stop") {
    const half = STOP_BAR_HALF_FT * scale;
    const nx = -tan.y;
    const ny = tan.x;
    decorations.push(
      <line
        key="stop"
        x1={tip.x + nx * half}
        y1={tip.y + ny * half}
        x2={tip.x - nx * half}
        y2={tip.y - ny * half}
        stroke={PATH_COLOR}
        strokeWidth={sw}
        strokeLinecap="round"
      />,
    );
  }

  // Shot: a perpendicular cross-tick near the end.
  if (kind === "shot") {
    const { total } = cumulative(spinePts);
    const target = total * 0.62;
    const { lengths } = cumulative(spinePts);
    let i = 1;
    while (i < lengths.length && lengths[i] < target) i++;
    const at = spinePts[Math.min(i, spinePts.length - 1)];
    const t = tangentAt(spinePts, Math.min(i, spinePts.length - 1));
    const half = SHOT_TICK_HALF_FT * scale;
    decorations.push(
      <line
        key="shot-tick"
        x1={at.x - t.y * half}
        y1={at.y + t.x * half}
        x2={at.x + t.y * half}
        y2={at.y - t.x * half}
        stroke={PATH_COLOR}
        strokeWidth={sw}
        strokeLinecap="round"
      />,
    );
  }

  // Backward: small loops strung along the line.
  if (kind === "backward") {
    sampleEvenly(spinePts, LOOP_SPACING_FT * scale).forEach((s, idx) => {
      decorations.push(
        <circle
          key={`loop-${idx}`}
          cx={s.pt.x}
          cy={s.pt.y}
          r={LOOP_R_FT * scale}
          fill="none"
          stroke={PATH_COLOR}
          strokeWidth={sw}
        />,
      );
    });
  }

  return (
    <>
      {selected && (
        <path
          d={lineD}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={halo + 1.4 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        />
      )}
      {/* White halo for legibility over rink markings. */}
      <path
        d={lineD}
        fill="none"
        stroke="#ffffff"
        strokeWidth={halo}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={lineD}
        fill="none"
        stroke={PATH_COLOR}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? dash : undefined}
      />
      {decorations}
    </>
  );
}

export const PATH_ELEMENT_ATTR = "path";

/**
 * A committed movement line parented to a frame. `el.points` are normalized
 * fractions; we map them to world feet and draw with `PathShape`, plus an
 * invisible thick stroke for easy selection.
 */
export function PathView({
  el,
  frameId,
  originX,
  originY,
  frameW,
  frameH,
  pxPerFt,
  selected,
  spaceHeld,
}: {
  el: PathElement;
  frameId: string;
  originX: number;
  originY: number;
  frameW: number;
  frameH: number;
  pxPerFt: number;
  selected: boolean;
  spaceHeld: boolean;
}) {
  const worldPoints = el.points.map((p) => ({
    x: originX + p.x * frameW,
    y: originY + p.y * frameH,
  }));
  const scale = frameH / RINK_NOMINAL_HEIGHT_FT;
  const hitW = Math.max(STROKE_FT * scale * 4, 8 / pxPerFt);

  return (
    <g>
      <PathShape
        worldPoints={worldPoints}
        kind={el.kind}
        endStyle={el.endStyle}
        scale={scale}
        selected={selected}
      />
      {/* Invisible hit stroke along the spine. */}
      <path
        data-frame-id={frameId}
        data-element-id={el.id}
        data-element-kind={PATH_ELEMENT_ATTR}
        d={polyD(pathLinePoints(worldPoints, el.kind, scale))}
        fill="none"
        stroke="transparent"
        strokeWidth={hitW}
        strokeLinecap="round"
        pointerEvents="stroke"
        style={{ cursor: spaceHeld ? undefined : "move" }}
      />
    </g>
  );
}
