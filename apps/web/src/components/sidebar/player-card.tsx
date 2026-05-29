"use client";

import type { DragEvent } from "react";

import { PLAYER_DRAG_MIME, type PlayerTeam } from "@/lib/frame";

const TEAM_META: Record<
  PlayerTeam,
  { label: string; color: string; glyph: "O" | "X" }
> = {
  "team-a": { label: "Team A", color: "#2563eb", glyph: "O" },
  "team-b": { label: "Team B", color: "#dc2626", glyph: "X" },
};

/**
 * Draggable player chip. Carries the team via a custom MIME; the canvas places
 * the player into whichever frame it's dropped on (players are parented).
 */
export function PlayerCard({ team }: { team: PlayerTeam }) {
  const meta = TEAM_META[team];

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(PLAYER_DRAG_MIME, team);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
    >
      <svg
        width={32}
        height={32}
        viewBox="0 0 32 32"
        className="shrink-0 rounded bg-slate-100"
        aria-hidden
      >
        {meta.glyph === "O" ? (
          <circle
            cx={16}
            cy={16}
            r={9}
            fill="none"
            stroke={meta.color}
            strokeWidth={3}
          />
        ) : (
          <g stroke={meta.color} strokeWidth={3} strokeLinecap="round">
            <line x1={9} y1={9} x2={23} y2={23} />
            <line x1={9} y1={23} x2={23} y2={9} />
          </g>
        )}
      </svg>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {meta.label}
        </div>
        <div className="truncate text-[11px] text-slate-500">
          Drag onto a frame
        </div>
      </div>
    </div>
  );
}
