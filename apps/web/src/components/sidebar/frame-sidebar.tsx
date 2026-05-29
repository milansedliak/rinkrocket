"use client";

import {
  FRAME_TEMPLATES,
  MARKER_TOOLS,
  PATH_TOOLS,
  type DrawToolId,
  type PlayerTeam,
} from "@/lib/frame";
import { MovementToolButton, SelectToolButton } from "@/components/sidebar/movement-tools";

import { FrameCard } from "./frame-card";
import { MarkerCard } from "./marker-card";
import { PlayerCard } from "./player-card";

const PLAYER_TEAMS: PlayerTeam[] = ["team-a", "team-b"];

type Tool = "select" | DrawToolId;

export function FrameSidebar({
  activeTool,
  onToolChange,
}: {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-200 bg-slate-50/70">
      <div className="flex-1 overflow-y-auto">
        <section>
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Frames</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Drag onto the canvas to add a playing surface.
            </p>
          </header>
          <ul className="space-y-2 p-3">
            {FRAME_TEMPLATES.map((template) => (
              <li key={template.kind}>
                <FrameCard template={template} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <header className="border-y border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Players</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Drag onto a frame to place a player.
            </p>
          </header>
          <ul className="space-y-2 p-3">
            {PLAYER_TEAMS.map((team) => (
              <li key={team}>
                <PlayerCard team={team} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <header className="border-y border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Equipment</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Drag onto a frame to place goals, pucks, obstacles, and staff.
            </p>
          </header>
          <ul className="space-y-2 p-3">
            {MARKER_TOOLS.map((tool) => (
              <li key={tool.kind}>
                <MarkerCard
                  kind={tool.kind}
                  label={tool.label}
                  description={tool.description}
                />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <header className="border-y border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Movement</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pick a line, then drag (or click points) on a frame. Esc finishes.
            </p>
          </header>
          <div className="space-y-2 p-3">
            <SelectToolButton
              active={activeTool === "select"}
              onClick={() => onToolChange("select")}
            />
            {PATH_TOOLS.map((tool) => (
              <MovementToolButton
                key={tool.id}
                tool={tool}
                active={activeTool === tool.id}
                onClick={() => onToolChange(tool.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
