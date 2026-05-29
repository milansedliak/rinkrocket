/** Sidebar preview icons for equipment markers (36×24 viewBox). */
export function MarkerGlyphPreview({ kind }: { kind: string }) {
  const icon = "#0f172a";
  const orange = "#ea580c";
  const red = "#dc2626";

  return (
    <svg
      width={36}
      height={24}
      viewBox="0 0 36 24"
      className="shrink-0 rounded bg-slate-100"
      aria-hidden
    >
      {kind === "goal" && (
        <g stroke={red} strokeWidth={1.4} fill="none" strokeLinejoin="round">
          <path d="M 8 5 Q 28 9 8 12 Q 28 15 8 19 Z" />
        </g>
      )}
      {kind === "puck" && (
        <circle cx={18} cy={12} r={4} fill={icon} stroke="#fff" strokeWidth={1} />
      )}
      {kind === "bumper" && (
        <rect x={16} y={4} width={4} height={16} rx={1} fill={icon} />
      )}
      {kind === "pylon" && (
        <path d="M18 6 L26 18 L10 18 Z" fill={orange} />
      )}
      {kind === "passer" && (
        <g>
          <circle cx={18} cy={12} r={7} fill="none" stroke="#64748b" strokeWidth={1.4} />
          <text
            x={18}
            y={13}
            fontSize={9}
            fill="#475569"
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            P
          </text>
        </g>
      )}
      {kind === "coach" && (
        <g fill="#334155">
          <circle cx={18} cy={8} r={3.5} />
          <path d="M12 11 Q18 6 24 11 L22 18 L14 18 Z" />
          <rect x={22} y={10} width={2} height={5} fill="#fbbf24" />
        </g>
      )}
    </svg>
  );
}
