"use client";

import { PATH_TOOLS, type PathKind } from "@/lib/frame";

type DrawTool = (typeof PATH_TOOLS)[number];

const ICON = "#0f172a";

/** Small preview glyph for each movement line type (24×24 viewBox). */
function ToolGlyph({
  kind,
  endStyle,
}: {
  kind: PathKind;
  endStyle: DrawTool["endStyle"];
}) {
  const y = 12;
  return (
    <svg width={36} height={24} viewBox="0 0 36 24" aria-hidden>
      {kind === "carry" ? (
        <path
          d="M3 12 q3 -6 6 0 t6 0 t6 0 t6 0"
          fill="none"
          stroke={ICON}
          strokeWidth={1.6}
        />
      ) : kind === "backward" ? (
        <g fill="none" stroke={ICON} strokeWidth={1.6}>
          <line x1={3} y1={y} x2={27} y2={y} />
          <circle cx={9} cy={y} r={2.4} />
          <circle cx={16} cy={y} r={2.4} />
          <circle cx={23} cy={y} r={2.4} />
        </g>
      ) : (
        <line
          x1={3}
          y1={y}
          x2={27}
          y2={y}
          stroke={ICON}
          strokeWidth={1.6}
          strokeDasharray={kind === "pass" ? "3 2" : undefined}
        />
      )}

      {kind === "shot" && (
        <line x1={18} y1={y - 4} x2={18} y2={y + 4} stroke={ICON} strokeWidth={1.6} />
      )}

      {endStyle === "arrow" ? (
        <path d={`M27 ${y} L22 ${y - 3.5} L22 ${y + 3.5} Z`} fill={ICON} />
      ) : (
        <line x1={27} y1={y - 4.5} x2={27} y2={y + 4.5} stroke={ICON} strokeWidth={1.6} />
      )}
    </svg>
  );
}

const baseClasses =
  "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition";

export function MovementToolButton({
  tool,
  active,
  onClick,
}: {
  tool: DrawTool;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${
        active
          ? "border-sky-400 bg-sky-50 shadow-sm"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <span className="shrink-0 rounded bg-slate-100 px-1 py-1">
        <ToolGlyph kind={tool.kind} endStyle={tool.endStyle} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {tool.label}
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {tool.description}
        </span>
      </span>
    </button>
  );
}

export function SelectToolButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${
        active
          ? "border-sky-400 bg-sky-50 shadow-sm"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <span className="shrink-0 rounded bg-slate-100 px-1 py-1">
        <svg width={36} height={24} viewBox="0 0 36 24" aria-hidden>
          <path
            d="M14 5 L14 19 L17.5 15.5 L20 20 L22 19 L19.5 14.5 L24 14 Z"
            fill="#0f172a"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          Select
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          Move &amp; edit elements
        </span>
      </span>
    </button>
  );
}
