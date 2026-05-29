"use client";

import { useCallback, useRef, useState } from "react";

import { Canvas } from "@/components/canvas/canvas";
import { FrameSidebar } from "@/components/sidebar/frame-sidebar";
import {
  clonePlacedFrame,
  createPath,
  createPlayer,
  getFrameTemplate,
  placeFrameFromTemplate,
  type DrawToolId,
  type FrameKind,
  type PathElement,
  type PathEndStyle,
  type PathKind,
  type PlacedFrame,
  type PlayerElement,
  type PlayerTeam,
} from "@/lib/frame";

/** Which child element (if any) is selected, identified by frame + element. */
type ElementSelection = { frameId: string; elementId: string } | null;

/** Active canvas tool: select, or one of the movement draw tools. */
export type Tool = "select" | DrawToolId;

/**
 * Editor layout: infinite canvas on the left, frames sidebar on the right.
 * Owns the list of placed frames + the current selection (a set of ids) so
 * canvas and sidebar can stay focused on rendering/interaction.
 */
export function Editor() {
  const [frames, setFrames] = useState<PlacedFrame[]>([]);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementSelection>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");

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
      setSelectedElement(null);
    },
    [],
  );

  // Frame selection and element selection are mutually exclusive.
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedFrameIds(ids);
    setSelectedElement(null);
  }, []);

  const handleSelectElement = useCallback((sel: ElementSelection) => {
    setSelectedElement(sel);
    if (sel) setSelectedFrameIds([]);
  }, []);

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
      setSelectedElement(null);
    },
    [],
  );

  // ── Element (player) operations ──────────────────────────────────────────

  const handleAddPlayer = useCallback(
    (frameId: string, team: PlayerTeam, localPos: { x: number; y: number }) => {
      const player = createPlayer(team, localPos);
      setFrames((prev) =>
        prev.map((f) =>
          f.id === frameId ? { ...f, elements: [...f.elements, player] } : f,
        ),
      );
      setSelectedFrameIds([]);
      setSelectedElement({ frameId, elementId: player.id });
    },
    [],
  );

  const handleAddPath = useCallback(
    (
      frameId: string,
      kind: PathKind,
      endStyle: PathEndStyle,
      points: ReadonlyArray<{ x: number; y: number }>,
    ) => {
      const path = createPath(kind, endStyle, points);
      setFrames((prev) =>
        prev.map((f) =>
          f.id === frameId ? { ...f, elements: [...f.elements, path] } : f,
        ),
      );
      setSelectedFrameIds([]);
      setSelectedElement({ frameId, elementId: path.id });
    },
    [],
  );

  const handleUpdateElement = useCallback(
    (
      frameId: string,
      elementId: string,
      partial: Partial<PlayerElement> | Partial<PathElement>,
    ) => {
      setFrames((prev) =>
        prev.map((f) =>
          f.id === frameId
            ? {
                ...f,
                elements: f.elements.map((el) =>
                  el.id === elementId
                    ? ({ ...el, ...partial } as typeof el)
                    : el,
                ),
              }
            : f,
        ),
      );
    },
    [],
  );

  const handleDeleteElement = useCallback(
    (frameId: string, elementId: string) => {
      setFrames((prev) =>
        prev.map((f) =>
          f.id === frameId
            ? { ...f, elements: f.elements.filter((el) => el.id !== elementId) }
            : f,
        ),
      );
      setSelectedElement((cur) =>
        cur && cur.frameId === frameId && cur.elementId === elementId
          ? null
          : cur,
      );
    },
    [],
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="relative flex-1">
        <Canvas
          frames={frames}
          selectedFrameIds={selectedFrameIds}
          selectedElement={selectedElement}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onAddFrame={handleAddFrame}
          onSelectionChange={handleSelectionChange}
          onUpdateFrame={handleUpdateFrame}
          onUpdateFrames={handleUpdateFrames}
          onDeleteFrames={handleDeleteFrames}
          onCopyFrames={handleCopyFrames}
          onPasteFrames={handlePasteFrames}
          onDuplicateFrames={handleDuplicateFrames}
          onAddPlayer={handleAddPlayer}
          onAddPath={handleAddPath}
          onSelectElement={handleSelectElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
        />
      </div>
      <FrameSidebar activeTool={activeTool} onToolChange={setActiveTool} />
    </div>
  );
}
