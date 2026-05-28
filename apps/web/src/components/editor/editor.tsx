"use client";

import { useCallback, useState } from "react";

import { Canvas } from "@/components/canvas/canvas";
import { FrameSidebar } from "@/components/sidebar/frame-sidebar";
import {
  getFrameTemplate,
  placeFrameFromTemplate,
  type FrameKind,
  type PlacedFrame,
} from "@/lib/frame";

/**
 * Editor layout: infinite canvas on the left, frames sidebar on the right.
 * Owns the list of placed frames + the current selection so canvas and sidebar
 * can stay focused on rendering/interaction.
 */
export function Editor() {
  const [frames, setFrames] = useState<PlacedFrame[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  const handleAddFrame = useCallback(
    (kind: FrameKind, worldPos: { x: number; y: number }) => {
      const template = getFrameTemplate(kind);
      if (!template) return;
      const placed = placeFrameFromTemplate(template, worldPos);
      setFrames((prev) => [...prev, placed]);
      setSelectedFrameId(placed.id);
    },
    [],
  );

  const handleUpdateFrame = useCallback(
    (id: string, partial: Partial<PlacedFrame>) => {
      setFrames((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...partial } : f)),
      );
    },
    [],
  );

  const handleDeleteFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
    setSelectedFrameId((current) => (current === id ? null : current));
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="relative flex-1">
        <Canvas
          frames={frames}
          selectedFrameId={selectedFrameId}
          onAddFrame={handleAddFrame}
          onSelectFrame={setSelectedFrameId}
          onUpdateFrame={handleUpdateFrame}
          onDeleteFrame={handleDeleteFrame}
        />
      </div>
      <FrameSidebar />
    </div>
  );
}
