import { type FrameKind, type PlacedFrame } from "@/lib/frame";

/**
 * NHL rink markings rendered inside a frame.
 *
 * Geometry is defined in each kind's *nominal* feet (matching the template
 * dimensions), using standard NHL proportions, then scaled independently on
 * each axis to the frame's current size. Lines stay screen-constant in width;
 * circles become ellipses if the frame is stretched non-uniformly (consistent
 * with how the rounded boards already adapt on resize).
 *
 * Everything is clipped to the frame's outline (`framePath`) so circles and
 * goals near the rounded boards don't spill outside.
 *
 * NHL reference (200 × 85 ft):
 *   - goal line 11 ft from end boards
 *   - blue lines 75 ft from end boards (50 ft neutral zone between them)
 *   - faceoff circles 15 ft radius; end-zone spots 20 ft from goal line and
 *     22 ft from the long-axis center; neutral spots 5 ft from each blue line
 *   - goal crease ~6 ft radius
 */

const RED = "#dc2626";
const BLUE = "#2563eb";
const CREASE_FILL = "rgba(59, 130, 246, 0.18)";
const CREASE_STROKE = "#3b82f6";

const CENTER_Y = 42.5;
const Y_TOP = 20.5; // 42.5 − 22
const Y_BOT = 64.5; // 42.5 + 22
const CIRCLE_R = 15; // faceoff circle radius (30 ft diameter)
const CREASE_R = 6; // goal crease radius
const FACEOFF_SPOT_R = 1; // red faceoff spots ≈ 2 ft diameter
const CENTER_SPOT_R = 0.5; // center-ice blue spot = 12 in diameter

// Real-world line thicknesses (feet), per rink spec:
//   red lines (goal + center) and blue lines = 12 in = 1 ft
//   all other markings (circles, creases, spots' rings, hash marks) = 2 in
const LINE_W_FT = 1;
const MARK_W_FT = 2 / 12;

// Faceoff-circle hash marks: 2 ft long, the pair set 5'7" apart.
const HASH_LEN = 2;
const HASH_GAP = 5 + 7 / 12;

type LineKind = "blue" | "center" | "goal";

type RinkGeometry = {
  w: number;
  h: number;
  lines: { x: number; kind: LineKind }[];
  /** Red faceoff circles (with a red center spot). */
  circles: { x: number; y: number }[];
  /** Center-ice circle: red ring + blue spot. */
  centerCircle?: { x: number; y: number };
  /** Standalone red faceoff spots (neutral zone). */
  spots: { x: number; y: number }[];
  /** Goal creases: `dir` is the direction the arc bulges (toward open ice). */
  creases: { x: number; dir: 1 | -1 }[];
  /** Goal nets: `dir` is the direction the net extends (toward end boards). */
  goals: { x: number; dir: 1 | -1 }[];
};

/** End-zone faceoff pair (two circles + their red spots) at goal-relative x. */
function endZone(x: number): {
  circles: { x: number; y: number }[];
  spots: { x: number; y: number }[];
} {
  const pts = [
    { x, y: Y_TOP },
    { x, y: Y_BOT },
  ];
  return { circles: pts, spots: pts };
}

function geometryFor(kind: FrameKind): RinkGeometry {
  switch (kind) {
    case "full-rink": {
      const left = endZone(31); // 11 + 20
      const right = endZone(169); // 189 − 20
      return {
        w: 200,
        h: 85,
        lines: [
          { x: 11, kind: "goal" },
          { x: 75, kind: "blue" },
          { x: 100, kind: "center" },
          { x: 125, kind: "blue" },
          { x: 189, kind: "goal" },
        ],
        circles: [...left.circles, ...right.circles],
        centerCircle: { x: 100, y: CENTER_Y },
        spots: [
          ...left.spots,
          ...right.spots,
          { x: 80, y: Y_TOP },
          { x: 80, y: Y_BOT },
          { x: 120, y: Y_TOP },
          { x: 120, y: Y_BOT },
        ],
        creases: [
          { x: 11, dir: 1 },
          { x: 189, dir: -1 },
        ],
        goals: [
          { x: 11, dir: -1 },
          { x: 189, dir: 1 },
        ],
      };
    }
    case "half-rink": {
      const left = endZone(31);
      return {
        w: 100,
        h: 85,
        lines: [
          { x: 11, kind: "goal" },
          { x: 75, kind: "blue" },
          { x: 100, kind: "center" },
        ],
        circles: left.circles,
        centerCircle: { x: 100, y: CENTER_Y },
        spots: [...left.spots, { x: 80, y: Y_TOP }, { x: 80, y: Y_BOT }],
        creases: [{ x: 11, dir: 1 }],
        goals: [{ x: 11, dir: -1 }],
      };
    }
    case "offensive-zone": {
      // Rounded boards on the right; goal line 11 ft from that end, blue line
      // at the left (cut) edge.
      const zone = endZone(33); // goal(53) − 20
      return {
        w: 64,
        h: 85,
        lines: [
          { x: 1, kind: "blue" },
          { x: 53, kind: "goal" },
        ],
        circles: zone.circles,
        spots: zone.spots,
        creases: [{ x: 53, dir: -1 }],
        goals: [{ x: 53, dir: 1 }],
      };
    }
    case "defensive-zone": {
      // Mirror of offensive zone: rounded boards on the left.
      const zone = endZone(31); // goal(11) + 20
      return {
        w: 64,
        h: 85,
        lines: [
          { x: 11, kind: "goal" },
          { x: 63, kind: "blue" },
        ],
        circles: zone.circles,
        spots: zone.spots,
        creases: [{ x: 11, dir: 1 }],
        goals: [{ x: 11, dir: -1 }],
      };
    }
    case "neutral-zone": {
      return {
        w: 50,
        h: 85,
        lines: [
          { x: 0.5, kind: "blue" },
          { x: 25, kind: "center" },
          { x: 49.5, kind: "blue" },
        ],
        circles: [],
        centerCircle: { x: 25, y: CENTER_Y },
        spots: [
          { x: 5, y: Y_TOP },
          { x: 5, y: Y_BOT },
          { x: 45, y: Y_TOP },
          { x: 45, y: Y_BOT },
        ],
        creases: [],
        goals: [],
      };
    }
  }
}

export function RinkMarkings({
  frame,
  pxPerFt,
  framePath,
}: {
  frame: PlacedFrame;
  pxPerFt: number;
  framePath: string;
}) {
  const geo = geometryFor(frame.kind);
  const sx = frame.width / geo.w;
  const sy = frame.height / geo.h;
  // Uniform scale for round features (circles, spots, creases). Resizing locks
  // the frame's aspect ratio (see applyFrameResize), so sx ≈ sy and this keeps
  // circles perfectly round — never stretched into ellipses.
  const s = Math.min(sx, sy);
  const ox = frame.position.x;
  const oy = frame.position.y;
  const toX = (px: number) => ox + px * sx;
  const toY = (py: number) => oy + py * sy;

  // Real-world line widths, scaled with the rink (uniform scale `s`).
  const lineW = LINE_W_FT * s; // 12 in red/blue lines
  const markW = MARK_W_FT * s; // 2 in circles, creases, hash marks

  const top = oy;
  const bottom = oy + frame.height;

  const clipId = `rink-clip-${frame.id}`;

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={framePath} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`} style={{ pointerEvents: "none" }}>
        {/* Vertical lines: goal + center (red) and blue lines, all 12 in. */}
        {geo.lines.map((ln, i) => {
          const x = toX(ln.x);
          return (
            <line
              key={`ln-${i}`}
              x1={x}
              y1={top}
              x2={x}
              y2={bottom}
              stroke={ln.kind === "blue" ? BLUE : RED}
              strokeWidth={lineW}
            />
          );
        })}

        {/* Goal creases. */}
        {geo.creases.map((cr, i) => {
          const cx = toX(cr.x);
          const cy = toY(CENTER_Y);
          const r = CREASE_R * s;
          const sweep = cr.dir === 1 ? 1 : 0;
          const d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep} ${cx} ${cy + r}`;
          return (
            <path
              key={`cr-${i}`}
              d={d}
              fill={CREASE_FILL}
              stroke={CREASE_STROKE}
              strokeWidth={markW}
            />
          );
        })}

        {/* Goal nets. */}
        {geo.goals.map((g, i) => {
          const gx = toX(g.x);
          const depth = 4 * s;
          const x = g.dir === 1 ? gx : gx - depth;
          return (
            <rect
              key={`goal-${i}`}
              x={x}
              y={toY(CENTER_Y) - 3 * s}
              width={depth}
              height={6 * s}
              fill="rgba(220, 38, 38, 0.12)"
              stroke={RED}
              strokeWidth={markW}
            />
          );
        })}

        {/* End-zone faceoff circles (red) with hash marks. */}
        {geo.circles.map((c, i) => {
          const cx = toX(c.x);
          const cy = toY(c.y);
          const r = CIRCLE_R * s;
          const gap = (HASH_GAP * s) / 2;
          const len = HASH_LEN * s;
          const xL = cx - gap;
          const xR = cx + gap;
          return (
            <g key={`circ-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={RED}
                strokeWidth={markW}
              />
              {/* Top & bottom hash-mark pairs (4 segments). */}
              {[
                { x: xL, y1: cy - r, y2: cy - r - len },
                { x: xR, y1: cy - r, y2: cy - r - len },
                { x: xL, y1: cy + r, y2: cy + r + len },
                { x: xR, y1: cy + r, y2: cy + r + len },
              ].map((h, j) => (
                <line
                  key={j}
                  x1={h.x}
                  y1={h.y1}
                  x2={h.x}
                  y2={h.y2}
                  stroke={RED}
                  strokeWidth={markW}
                />
              ))}
            </g>
          );
        })}

        {/* Center-ice circle (blue ring + 12 in blue spot). */}
        {geo.centerCircle && (
          <>
            <circle
              cx={toX(geo.centerCircle.x)}
              cy={toY(geo.centerCircle.y)}
              r={CIRCLE_R * s}
              fill="none"
              stroke={BLUE}
              strokeWidth={markW}
            />
            <circle
              cx={toX(geo.centerCircle.x)}
              cy={toY(geo.centerCircle.y)}
              r={CENTER_SPOT_R * s}
              fill={BLUE}
            />
          </>
        )}

        {/* Red faceoff spots (end-zone centers + neutral zone). */}
        {geo.spots.map((spot, i) => (
          <circle
            key={`spot-${i}`}
            cx={toX(spot.x)}
            cy={toY(spot.y)}
            r={FACEOFF_SPOT_R * s}
            fill={RED}
          />
        ))}
      </g>
    </>
  );
}
