"use client";

import {
  PLAYER_DIAMETER_FT,
  RINK_NOMINAL_HEIGHT_FT,
  type PlayerElement,
} from "@/lib/frame";

const SELECTION_COLOR = "rgb(14, 165, 233)"; // sky-500

/**
 * Team styling. Teams use classic hockey notation — Team A is an "O" (ring),
 * Team B is an "X" — so they read at a glance and differ by BOTH shape and
 * color (color is never the sole signal).
 */
const TEAM_STYLE: Record<
  PlayerElement["team"],
  { color: string; glyph: "O" | "X" }
> = {
  "team-a": { color: "#2563eb", glyph: "O" }, // blue-600
  "team-b": { color: "#dc2626", glyph: "X" }, // red-600
};

export const PLAYER_ELEMENT_ATTR = "player";

/**
 * Renders a single player parented to a frame. `el.position` is a normalized
 * fraction of the frame, so the player keeps its relative spot when the frame
 * is resized. The token size scales with the frame's height (so it grows and
 * shrinks with the rink). The parent <g> already applies the frame's rotation,
 * so this only adds the player's own `rotation`.
 *
 * Sizes that should stay screen-constant (selection ring) are divided by
 * `pxPerFt`; the glyph is in feet so it scales with the rink. A white halo
 * keeps the marker legible over rink lines.
 */
export function PlayerView({
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
  el: PlayerElement;
  frameId: string;
  /** Parent frame's top-left in world feet. */
  originX: number;
  originY: number;
  /** Parent frame's size in world feet. */
  frameW: number;
  frameH: number;
  pxPerFt: number;
  selected: boolean;
  spaceHeld: boolean;
}) {
  const cx = originX + el.position.x * frameW;
  const cy = originY + el.position.y * frameH;
  // Token radius scales with the rink: nominal feet → world feet via the
  // frame's height relative to the 85-ft nominal rink width.
  const r = (PLAYER_DIAMETER_FT / 2) * (frameH / RINK_NOMINAL_HEIGHT_FT);
  const selStroke = 1.5 / pxPerFt;
  const selGap = r * 0.22;

  const style = TEAM_STYLE[el.team];
  const cursor = spaceHeld ? undefined : "move";
  const glyphW = r * 0.3; // glyph stroke width
  const haloW = glyphW + r * 0.18; // white halo behind the glyph

  // Glyph extents inside the token radius.
  const ringR = r * 0.74;
  const arm = r * 0.6;

  const dataAttrs = {
    "data-frame-id": frameId,
    "data-element-id": el.id,
    "data-element-kind": PLAYER_ELEMENT_ATTR,
  } as const;

  return (
    <g
      transform={el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined}
    >
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={r + selGap}
          fill="none"
          stroke={SELECTION_COLOR}
          strokeWidth={selStroke}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Transparent hit area covering the whole token — easy to click/grab. */}
      <circle
        {...dataAttrs}
        cx={cx}
        cy={cy}
        r={r}
        fill="transparent"
        style={{ cursor }}
      />

      {style.glyph === "O" ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="#ffffff"
            strokeWidth={haloW}
            style={{ pointerEvents: "none" }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke={style.color}
            strokeWidth={glyphW}
            style={{ pointerEvents: "none" }}
          />
        </>
      ) : (
        <>
          {[
            { x1: cx - arm, y1: cy - arm, x2: cx + arm, y2: cy + arm },
            { x1: cx - arm, y1: cy + arm, x2: cx + arm, y2: cy - arm },
          ].map((ln, i) => (
            <line
              key={`halo-${i}`}
              x1={ln.x1}
              y1={ln.y1}
              x2={ln.x2}
              y2={ln.y2}
              stroke="#ffffff"
              strokeWidth={haloW}
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
          ))}
          {[
            { x1: cx - arm, y1: cy - arm, x2: cx + arm, y2: cy + arm },
            { x1: cx - arm, y1: cy + arm, x2: cx + arm, y2: cy - arm },
          ].map((ln, i) => (
            <line
              key={`x-${i}`}
              x1={ln.x1}
              y1={ln.y1}
              x2={ln.x2}
              y2={ln.y2}
              stroke={style.color}
              strokeWidth={glyphW}
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
          ))}
        </>
      )}

      {/* Jersey number (Team A only — the ring has room for it). */}
      {style.glyph === "O" && el.number && (
        <text
          x={cx}
          y={cy}
          fontSize={r * 0.9}
          fill={style.color}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {el.number}
        </text>
      )}
    </g>
  );
}
