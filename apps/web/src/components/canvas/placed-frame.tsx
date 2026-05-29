"use client";

import {
  buildFramePath,
  frameCenter,
  frameCornerRadius,
  type MarkerElement,
  type PlacedFrame,
  type ResizeHandle,
} from "@/lib/frame";
import { RinkMarkings } from "./rink-markings";
import { PlayerView } from "./player-element";
import { PathView } from "./path-element";
import { MarkerView } from "./marker-element";
import {
  FRAME_MOVE_ATTR,
  ROTATE_CORNER_ATTR,
  ROTATE_CURSOR,
} from "./interaction";

export { FRAME_MOVE_ATTR, ROTATE_CORNER_ATTR } from "./interaction";

const SELECTION_COLOR = "rgb(14, 165, 233)"; // sky-500

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
  showHandles,
  spaceHeld,
  selectedElementId,
}: {
  frame: PlacedFrame;
  pxPerFt: number;
  /** Part of the current selection — draws the dashed outline. */
  selected: boolean;
  /** Sole selected frame — also draws resize + rotate handles. */
  showHandles: boolean;
  spaceHeld: boolean;
  /** Id of the selected child element in this frame, if any. */
  selectedElementId: string | null;
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

      {/* Parented child elements. Rendered above the body/markings and the
          border move-band so a click hits the element, not the frame. They
          inherit the frame's rotation via this same <g>. Movement lines are
          drawn first so player tokens sit on top of them. */}
      {frame.elements
        .filter((el) => el.type === "path")
        .map((el) =>
          el.type === "path" ? (
            <PathView
              key={el.id}
              el={el}
              frameId={frame.id}
              originX={frame.position.x}
              originY={frame.position.y}
              frameW={frame.width}
              frameH={frame.height}
              pxPerFt={pxPerFt}
              selected={el.id === selectedElementId}
              spaceHeld={spaceHeld}
            />
          ) : null,
        )}
      {frame.elements
        .filter(
          (el): el is MarkerElement =>
            el.type === "marker" && el.kind !== "puck",
        )
        .map((el) => (
          <MarkerView
            key={el.id}
            el={el}
            frameId={frame.id}
            originX={frame.position.x}
            originY={frame.position.y}
            frameW={frame.width}
            frameH={frame.height}
            pxPerFt={pxPerFt}
            selected={el.id === selectedElementId}
            spaceHeld={spaceHeld}
          />
        ))}
      {frame.elements
        .filter((el) => el.type === "player")
        .map((el) =>
          el.type === "player" ? (
            <PlayerView
              key={el.id}
              el={el}
              frameId={frame.id}
              originX={frame.position.x}
              originY={frame.position.y}
              frameW={frame.width}
              frameH={frame.height}
              pxPerFt={pxPerFt}
              selected={el.id === selectedElementId}
              spaceHeld={spaceHeld}
            />
          ) : null,
        )}
      {frame.elements
        .filter((el): el is MarkerElement => el.type === "marker" && el.kind === "puck")
        .map((el) => (
          <MarkerView
            key={el.id}
            el={el}
            frameId={frame.id}
            originX={frame.position.x}
            originY={frame.position.y}
            frameW={frame.width}
            frameH={frame.height}
            pxPerFt={pxPerFt}
            selected={el.id === selectedElementId}
            spaceHeld={spaceHeld}
          />
        ))}

      {selected && (
        <path
          d={framePath}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={selStroke}
          strokeDasharray={`${dashOn} ${dashOff}`}
          style={{ pointerEvents: "none" }}
        />
      )}

      {showHandles && (
        <>
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
