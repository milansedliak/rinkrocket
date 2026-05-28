import {
  buildFramePath,
  frameCornerRadius,
  type PlacedFrame,
  type ResizeHandle,
} from "@/lib/frame";

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
 * Renders a placed frame in world coordinates with optional selection
 * affordances (outline + resize handles). All interaction is delegated to the
 * Canvas, which inspects `data-frame-id` / `data-handle` on event targets.
 *
 * `pxPerFt` is the effective world→screen scale (canvas multiplies user-facing
 * zoom by the base print scale). Stroke widths, label size, dashes, and handle
 * size are divided by it so they stay visually constant across zoom levels.
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
  const labelSize = 12 / pxPerFt;
  const labelPad = 6 / pxPerFt;
  const selStroke = 1.5 / pxPerFt;
  const dashOn = 4 / pxPerFt;
  const dashOff = 3 / pxPerFt;
  const handleR = 5 / pxPerFt;
  const handleStroke = 1.5 / pxPerFt;

  const bodyCursor = spaceHeld ? undefined : selected ? "move" : "pointer";
  // Derived from the frame's current size, so resizing scales the corner
  // curve proportionally (a stretched rink still looks like a rink). The path
  // honors the per-frame `roundedCorners` so half-rinks / zones get a square
  // edge on the "cut" side.
  const radius = frameCornerRadius(frame);
  const framePath = buildFramePath(
    frame.position.x,
    frame.position.y,
    frame.width,
    frame.height,
    radius,
    frame.roundedCorners,
  );

  return (
    <g>
      <path
        data-frame-id={frame.id}
        d={framePath}
        fill="#ffffff"
        stroke="rgba(15, 23, 42, 0.85)"
        strokeWidth={stroke}
        shapeRendering="geometricPrecision"
        style={{ cursor: bodyCursor }}
      />

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
                style={{ cursor: spaceHeld ? undefined : h.cursor }}
              />
            );
          })}
        </>
      )}
    </g>
  );
}
