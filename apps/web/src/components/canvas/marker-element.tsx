"use client";

import {
  MARKER_SIZE_FT,
  RINK_NOMINAL_HEIGHT_FT,
  type MarkerElement,
  type MarkerKind,
} from "@/lib/frame";
import {
  ELEMENT_ROTATE_ATTR,
  ROTATE_CURSOR,
} from "./interaction";

const SELECTION_COLOR = "rgb(14, 165, 233)";

export const MARKER_ELEMENT_ATTR = "marker";

const ORANGE = "#ea580c";
const GOAL_RED = "#dc2626";

function hitRadius(w: number, h: number): number {
  return Math.max(w, h) * 0.55;
}

function MarkerGlyph({
  kind,
  w,
  h,
}: {
  kind: MarkerKind;
  w: number;
  h: number;
}) {
  const hw = w / 2;
  const hh = h / 2;

  switch (kind) {
    case "goal": {
      // Top-down goal ≈ letter B: spine on the goal line (−x), lobes bulge to +x.
      // Quadratic lobes peak at +hw so the footprint spans exactly `w` (6 ft).
      const spineX = -hw;
      const sw = Math.max(0.08, w * 0.04);
      const d = [
        `M ${spineX} ${-hh}`,
        `Q ${hw} ${-hh * 0.5} ${spineX} 0`,
        `Q ${hw} ${hh * 0.5} ${spineX} ${hh}`,
        "Z",
      ].join(" ");
      return (
        <path
          d={d}
          stroke={GOAL_RED}
          strokeWidth={sw}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    }
    case "puck":
      return (
        <circle
          cx={0}
          cy={0}
          r={Math.min(hw, hh)}
          fill="#111827"
          stroke="#ffffff"
          strokeWidth={Math.max(0.06, w * 0.12)}
        />
      );
    case "bumper":
      return (
        <rect
          x={-hw}
          y={-hh}
          width={w}
          height={h}
          rx={Math.min(hw, hh) * 0.35}
          fill="#111827"
          stroke="#000000"
          strokeWidth={Math.max(0.05, w * 0.08)}
        />
      );
    case "pylon":
      return (
        <path
          d={`M 0 ${-hh} L ${hw} ${hh} L ${-hw} ${hh} Z`}
          fill={ORANGE}
          stroke="#9a3412"
          strokeWidth={Math.max(0.06, w * 0.06)}
          strokeLinejoin="round"
        />
      );
    case "passer":
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={Math.min(hw, hh) * 0.85}
            fill="none"
            stroke="#64748b"
            strokeWidth={Math.max(0.1, w * 0.08)}
          />
          <text
            x={0}
            y={0}
            fontSize={Math.min(hw, hh) * 1.1}
            fill="#475569"
            fontWeight={700}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            textAnchor="middle"
            dominantBaseline="central"
          >
            P
          </text>
        </g>
      );
    case "coach":
      return (
        <g>
          <circle
            cx={0}
            cy={hh * 0.15}
            r={Math.min(hw, hh) * 0.35}
            fill="#1e293b"
          />
          <path
            d={`M ${-hw * 0.55} ${hh * 0.45} Q 0 ${-hh * 0.35} ${hw * 0.55} ${hh * 0.45} L ${hw * 0.4} ${hh * 0.85} L ${-hw * 0.4} ${hh * 0.85} Z`}
            fill="#334155"
            stroke="#1e293b"
            strokeWidth={Math.max(0.05, w * 0.04)}
          />
          <rect
            x={hw * 0.35}
            y={-hh * 0.05}
            width={w * 0.12}
            height={h * 0.35}
            rx={w * 0.03}
            fill="#fbbf24"
            stroke="#1e293b"
            strokeWidth={Math.max(0.04, w * 0.03)}
          />
        </g>
      );
  }
}

export function MarkerView({
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
  el: MarkerElement;
  frameId: string;
  originX: number;
  originY: number;
  frameW: number;
  frameH: number;
  pxPerFt: number;
  selected: boolean;
  spaceHeld: boolean;
}) {
  const scale = frameH / RINK_NOMINAL_HEIGHT_FT;
  const size = MARKER_SIZE_FT[el.kind];
  const w = size.width * scale;
  const h = size.height * scale;
  const cx = originX + el.position.x * frameW;
  const cy = originY + el.position.y * frameH;
  const hitR = hitRadius(w, h);
  const selStroke = 1.5 / pxPerFt;
  const rotateHandleR = 5 / pxPerFt;
  const rotateHandleOffset = hitR + 10 / pxPerFt;
  const cursor = spaceHeld ? undefined : "move";
  const rotateCursor = spaceHeld ? undefined : ROTATE_CURSOR;

  const dataAttrs = {
    "data-frame-id": frameId,
    "data-element-id": el.id,
    "data-element-kind": MARKER_ELEMENT_ATTR,
  } as const;

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${el.rotation})`}>
      {selected && (
        <circle
          cx={0}
          cy={0}
          r={hitR + hitR * 0.12}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={selStroke}
          style={{ pointerEvents: "none" }}
        />
      )}
      {selected && (
        <circle
          {...dataAttrs}
          data-element-rotate={ELEMENT_ROTATE_ATTR}
          cx={0}
          cy={-rotateHandleOffset}
          r={rotateHandleR}
          fill="#ffffff"
          stroke={SELECTION_COLOR}
          strokeWidth={selStroke}
          style={{ cursor: rotateCursor }}
        />
      )}
      <circle
        {...dataAttrs}
        cx={0}
        cy={0}
        r={hitR}
        fill="transparent"
        style={{ cursor }}
      />
      <g style={{ pointerEvents: "none" }}>
        <MarkerGlyph kind={el.kind} w={w} h={h} />
      </g>
    </g>
  );
}
