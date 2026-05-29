"use client";

import type { DragEvent } from "react";

import { MARKER_DRAG_MIME, type MarkerKind } from "@/lib/frame";

import { MarkerGlyphPreview } from "./marker-glyph-preview";

/**
 * Draggable equipment / staff chip. The canvas places the marker into whichever
 * frame it is dropped on.
 */
export function MarkerCard({
  kind,
  label,
  description,
}: {
  kind: MarkerKind;
  label: string;
  description: string;
}) {
  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(MARKER_DRAG_MIME, kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
    >
      <MarkerGlyphPreview kind={kind} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">{label}</div>
        <div className="truncate text-[11px] text-slate-500">{description}</div>
      </div>
    </div>
  );
}
