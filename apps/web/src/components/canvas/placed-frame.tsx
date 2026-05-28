"use client";

import {
  buildFramePath,
  frameCenter,
  frameCornerRadius,
  type PlacedFrame,
  type ResizeHandle,
} from "@/lib/frame";
import { RinkMarkings } from "./rink-markings";

const SELECTION_COLOR = "rgb(14, 165, 233)"; // sky-500

/**
 * Rotation cursor: a Lucide-style rotate-cw glyph with a white halo so it
 * reads against any background. Hotspot at (12, 12). Falls back to `grab` on
 * platforms that reject SVG cursors.
 */
const ROTATE_CURSOR =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath stroke='white' stroke-width='4' d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.65 2.85L21 8'/%3E%3Cpath stroke='white' stroke-width='4' d='M21 3v5h-5'/%3E%3Cpath stroke='black' stroke-width='2' d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.65 2.85L21 8'/%3E%3Cpath stroke='black' stroke-width='2' d='M21 3v5h-5'/%3E%3C/svg%3E\") 12 12, grab";

const HANDLES: ReadonlyArray<{
  id: ResizeHandle;
  fx: 0 | 1;
  fy: 0 | 1;
  cursor: string;
}> = [
  { id: "tl", fx: 0, fy: 0, cursor: "nwse-resize" },
  { id: "tr", fx: 1, fy: 0, cursor: "nesw-resize" },
  { id: "br", fx: 1, fy: 1, cursor: "nwse-resize" },
  { id: "bl", fx: 0, fy: 1, cursor: "nesw-resize" },
];

/**
 * Renders a placed frame in world coordinates with selection affordances:
 * dashed outline plus four corner resize handles. Rotation piggy-backs on the
 * same handles via the Ctrl/Cmd modifier — when `ctrlHeld` is true the
 * handle's cursor swaps to a rotate glyph and a curved-arrow hint fades in
 * at every corner. The Canvas owns the modifier state and inspects
 * `e.ctrlKey || e.metaKey` at pointerdown to decide between resize and
 * rotate drags.
 *
 * `pxPerFt` is the world→screen scale; visual elements (strokes, labels,
 * handles, hint) are divided by it so they stay screen-constant under zoom.
 *
 * Rotation is applied by an outer <g rotate(deg cx cy)> so the body, label,
 * outline, and all handles rotate as one — child math stays in unrotated
 * local coords.
 */
export function PlacedFrameView({
  frame,
  pxPerFt,
  selected,
  spaceHeld,
  ctrlHeld,
}: {
  frame: PlacedFrame;
  pxPerFt: number;
  selected: boolean;
  spaceHeld: boolean;
  /** True while Ctrl/Cmd is held — switches resize handles to rotate mode. */
  ctrlHeld: boolean;
}) {
  const stroke = 2 / pxPerFt;
  const labelSize = 12 / pxPerFt;
  const labelPad = 6 / pxPerFt;
  const selStroke = 1.5 / pxPerFt;
  const dashOn = 4 / pxPerFt;
  const dashOff = 3 / pxPerFt;
  const handleR = 5 / pxPerFt;
  const handleStroke = 1.5 / pxPerFt;

  const bodyCursor = spaceHeld
    ? undefined
    : selected && ctrlHeld
      ? ROTATE_CURSOR
      : selected
        ? "move"
        : "pointer";
  const radius = frameCornerRadius(frame);
  const framePath = buildFramePath(
    frame.position.x,
    frame.position.y,
    frame.width,
    frame.height,
    radius,
    frame.roundedCorners,
  );

  const center = frameCenter(frame);
  const groupTransform =
    frame.rotation !== 0
      ? `rotate(${frame.rotation} ${center.x} ${center.y})`
      : undefined;

  return (
    <g transform={groupTransform}>
      <path
        data-frame-id={frame.id}
        d={framePath}
        fill="#ffffff"
        stroke="rgba(15, 23, 42, 0.85)"
        strokeWidth={stroke}
        shapeRendering="geometricPrecision"
        style={{ cursor: bodyCursor }}
      />

      <RinkMarkings frame={frame} pxPerFt={pxPerFt} framePath={framePath} />

      <text
        data-frame-id={frame.id}
        x={frame.position.x + labelPad}
        y={frame.position.y - labelPad}
        fontSize={labelSize}
        fill={selected ? SELECTION_COLOR : "rgba(15, 23, 42, 0.65)"}
        fontWeight={500}
        style={{ cursor: bodyCursor, userSelect: "none" }}
      >
        {frame.label}
      </text>

      {selected && (
        <>
          <path
            d={framePath}
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth={selStroke}
            strokeDasharray={`${dashOn} ${dashOff}`}
            style={{ pointerEvents: "none" }}
          />

          {HANDLES.map((h) => {
            const cx = frame.position.x + h.fx * frame.width;
            const cy = frame.position.y + h.fy * frame.height;
            return (
              <circle
                key={h.id}
                data-frame-id={frame.id}
                data-handle={h.id}
                cx={cx}
                cy={cy}
                r={handleR}
                fill="#ffffff"
                stroke={SELECTION_COLOR}
                strokeWidth={handleStroke}
                style={{
                  cursor: spaceHeld
                    ? undefined
                    : ctrlHeld
                      ? ROTATE_CURSOR
                      : h.cursor,
                }}
              />
            );
          })}

          {/* Single rotation indicator in the middle of the frame while Ctrl
              is held, signalling that the corner handles will rotate. */}
          {ctrlHeld && !spaceHeld && (
            <RotationHint
              cx={frame.position.x + frame.width / 2}
              cy={frame.position.y + frame.height / 2}
              pxPerFt={pxPerFt}
            />
          )}
        </>
      )}
    </g>
  );
}

/**
 * Curved-arrow rotation glyph centered at (cx, cy). Non-interactive; just
 * communicates that rotation mode is active.
 */
function RotationHint({
  cx,
  cy,
  pxPerFt,
}: {
  cx: number;
  cy: number;
  pxPerFt: number;
}) {
  const iconScreenPx = 28;
  const sizeWorld = iconScreenPx / pxPerFt;
  const tx = cx - sizeWorld / 2;
  const ty = cy - sizeWorld / 2;
  const scale = sizeWorld / 24;

  return (
    <g
      transform={`translate(${tx} ${ty}) scale(${scale})`}
      style={{ pointerEvents: "none" }}
    >
      <path
        d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.65 2.85L21 8"
        fill="none"
        stroke="white"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        fill="none"
        stroke="white"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.65 2.85L21 8"
        fill="none"
        stroke={SELECTION_COLOR}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        fill="none"
        stroke={SELECTION_COLOR}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
