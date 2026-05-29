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
 * Marks an element as a "move handle" for the frame. Only the name label and
 * the border edge carry this — the interior does NOT, so dragging inside the
 * frame (e.g. to place/select objects on the ice) never moves the whole frame
 * by accident. The Canvas reads `data-frame-move` at pointerdown.
 */
export const FRAME_MOVE_ATTR = "frame-move";

/**
 * Marks the invisible rotate zone just outside each corner (Figma-style). The
 * Canvas reads `data-rotate-corner` at pointerdown to start an angle-based
 * rotate around the frame's center.
 */
export const ROTATE_CORNER_ATTR = "frame-rotate-corner";

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
 * a dashed outline, four corner resize handles, and an invisible rotate zone
 * just outside each corner (Figma-style). The Canvas dispatches interactions
 * from `data-frame-id` / `data-handle` / `data-rotate-corner` / `data-frame-move`
 * on the event target.
 *
 * `pxPerFt` is the world→screen scale; visual elements (strokes, label, handles)
 * are divided by it so they stay screen-constant under zoom.
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
}: {
  frame: PlacedFrame;
  pxPerFt: number;
  selected: boolean;
  spaceHeld: boolean;
}) {
  const stroke = 2 / pxPerFt;
  // Figma-style frame title: a fixed on-screen size (~11px) regardless of zoom
  // or frame size. Because this <g> is rendered inside the world group (scaled
  // by pxPerFt), dividing by pxPerFt yields a constant screen-space size.
  const labelSize = 11 / pxPerFt;
  const labelGap = 7 / pxPerFt; // gap above the frame's top edge
  const selStroke = 1.5 / pxPerFt;
  const dashOn = 4 / pxPerFt;
  const dashOff = 3 / pxPerFt;
  const handleR = 5 / pxPerFt;
  const handleStroke = 1.5 / pxPerFt;
  const borderHit = 10 / pxPerFt; // grab band centered on the outline
  const rotateZoneR = 16 / pxPerFt; // rotate ring radius outside each corner

  const interiorCursor = spaceHeld ? undefined : "pointer";
  const moveCursor = spaceHeld ? undefined : "move";
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
        style={{ cursor: interiorCursor }}
      />

      <RinkMarkings frame={frame} pxPerFt={pxPerFt} framePath={framePath} />

      {/* Border grab band: a thick, transparent stroke along the outline that
          is the only part of the frame body you can drag to move it. Interior
          clicks fall through to the fill path above (select only). */}
      <path
        data-frame-id={frame.id}
        data-frame-move={FRAME_MOVE_ATTR}
        d={framePath}
        fill="none"
        stroke="transparent"
        strokeWidth={borderHit}
        pointerEvents="stroke"
        style={{ cursor: moveCursor }}
      />

      <text
        data-frame-id={frame.id}
        data-frame-move={FRAME_MOVE_ATTR}
        x={frame.position.x}
        y={frame.position.y - labelGap}
        fontSize={labelSize}
        fill={selected ? SELECTION_COLOR : "rgba(15, 23, 42, 0.65)"}
        fontWeight={500}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        style={{ cursor: moveCursor, userSelect: "none" }}
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
              <g key={h.id}>
                {/* Rotate zone — transparent disc just outside/around the
                    corner. Rendered before the resize handle so the handle
                    (resize) wins when the cursor is directly on it, while the
                    surrounding ring rotates (Figma behavior). */}
                <circle
                  data-frame-id={frame.id}
                  data-rotate-corner={ROTATE_CORNER_ATTR}
                  cx={cx}
                  cy={cy}
                  r={rotateZoneR}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: spaceHeld ? undefined : ROTATE_CURSOR }}
                />
                <circle
                  data-frame-id={frame.id}
                  data-handle={h.id}
                  cx={cx}
                  cy={cy}
                  r={handleR}
                  fill="#ffffff"
                  stroke={SELECTION_COLOR}
                  strokeWidth={handleStroke}
                  style={{ cursor: spaceHeld ? undefined : h.cursor }}
                />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
}
