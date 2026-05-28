"use client";

import type { DragEvent } from "react";

import {
  buildFramePath,
  FRAME_DRAG_MIME,
  frameCornerRadius,
  type FrameTemplate,
} from "@/lib/frame";

/**
 * Draggable card in the right sidebar. Carries the frame kind via a custom
 * MIME so the canvas can distinguish frame drops from unrelated drags.
 */
export function FrameCard({ template }: { template: FrameTemplate }) {
  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(FRAME_DRAG_MIME, template.kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
    >
      <FrameThumb template={template} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {template.label}
        </div>
        <div className="truncate text-[11px] text-slate-500">
          {template.description}
        </div>
      </div>
    </div>
  );
}

function FrameThumb({ template }: { template: FrameTemplate }) {
  const boxW = 56;
  const boxH = 32;
  const pad = 4;
  const scale = Math.min(
    (boxW - pad * 2) / template.width,
    (boxH - pad * 2) / template.height,
  );
  const w = template.width * scale;
  const h = template.height * scale;
  const x = (boxW - w) / 2;
  const y = (boxH - h) / 2;
  // template.cornerRadiusRatio is a fraction of min(width, height); convert to
  // world feet via the helper, then scale into the thumb's pixel coords.
  const r = frameCornerRadius(template) * scale;
  const d = buildFramePath(x, y, w, h, r, template.roundedCorners);
  return (
    <svg
      width={boxW}
      height={boxH}
      viewBox={`0 0 ${boxW} ${boxH}`}
      className="shrink-0 rounded bg-slate-100"
      aria-hidden
    >
      <path
        d={d}
        fill="#ffffff"
        stroke="rgba(15, 23, 42, 0.55)"
        strokeWidth={1}
      />
    </svg>
  );
}
