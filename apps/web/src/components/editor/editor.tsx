"use client";

import { useCallback, useRef, useState } from "react";

import { Canvas } from "@/components/canvas/canvas";
import { FrameSidebar } from "@/components/sidebar/frame-sidebar";
import {
  clonePlacedFrame,
  getFrameTemplate,
  placeFrameFromTemplate,
  type FrameKind,
  type PlacedFrame,
} from "@/lib/frame";

/**
 * Editor layout: infinite canvas on the left, frames sidebar on the right.
 * Owns the list of placed frames + the current selection (a set of ids) so
 * canvas and sidebar can stay focused on rendering/interaction.
 */
export function Editor() {
  const [frames, setFrames] = useState<PlacedFrame[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);

  // In-memory clipboard for copy/paste (not the OS clipboard — frames are
  // structured data, and this keeps paste working without clipboard perms).
  const clipboardRef = useRef<PlacedFrame[] | null>(null);

  const handleAddFrame = useCallback(
    (kind: FrameKind, worldPos: { x: number; y: number }) => {
      const template = getFrameTemplate(kind);
      if (!template) return;
      const placed = placeFrameFromTemplate(template, worldPos);
      setFrames((prev) => [...prev, placed]);
      setSelectedFrameIds([placed.id]);
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

  const handleUpdateFrames = useCallback(
    (updates: ReadonlyArray<{ id: string; partial: Partial<PlacedFrame> }>) => {
      if (updates.length === 0) return;
      const byId = new Map(updates.map((u) => [u.id, u.partial]));
      setFrames((prev) =>
        prev.map((f) => {
          const partial = byId.get(f.id);
          return partial ? { ...f, ...partial } : f;
        }),
      );
    },
    [],
  );

  const handleDeleteFrames = useCallback((ids: ReadonlyArray<string>) => {
    if (ids.length === 0) return;
    const remove = new Set(ids);
    setFrames((prev) => prev.filter((f) => !remove.has(f.id)));
    setSelectedFrameIds((prev) => prev.filter((id) => !remove.has(id)));
  }, []);

  const handleCopyFrames = useCallback((toCopy: ReadonlyArray<PlacedFrame>) => {
    clipboardRef.current = toCopy.length ? toCopy.map((f) => ({ ...f })) : null;
  }, []);

  const handlePasteFrames = useCallback(() => {
    const src = clipboardRef.current;
    if (!src || src.length === 0) return;
    const copies = src.map((f) => clonePlacedFrame(f));
    setFrames((prev) => [...prev, ...copies]);
    setSelectedFrameIds(copies.map((c) => c.id));
    // Advance the clipboard so repeated pastes cascade down-right.
    clipboardRef.current = copies;
  }, []);

  const handleDuplicateFrames = useCallback(
    (toDup: ReadonlyArray<PlacedFrame>) => {
      if (toDup.length === 0) return;
      const copies = toDup.map((f) => clonePlacedFrame(f));
      setFrames((prev) => [...prev, ...copies]);
      setSelectedFrameIds(copies.map((c) => c.id));
    },
    [],
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="relative flex-1">
        <Canvas
          frames={frames}
          selectedFrameIds={selectedFrameIds}
          onAddFrame={handleAddFrame}
          onSelectionChange={setSelectedFrameIds}
          onUpdateFrame={handleUpdateFrame}
          onUpdateFrames={handleUpdateFrames}
          onDeleteFrames={handleDeleteFrames}
          onCopyFrames={handleCopyFrames}
          onPasteFrames={handlePasteFrames}
          onDuplicateFrames={handleDuplicateFrames}
        />
      </div>
      <FrameSidebar />
    </div>
  );
}
