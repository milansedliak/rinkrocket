"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";

import { PlacedFrameView } from "./placed-frame";
import {
  applyFrameResize,
  FRAME_DRAG_MIME,
  isFrameKind,
  type FrameKind,
  type PlacedFrame,
  type ResizeHandle,
} from "@/lib/frame";
import {
  PRINT_AREA_SIZE,
  PRINT_FT_PER_INCH,
  PRINT_PAPER_LABEL,
  PX_PER_FT_AT_100,
} from "@/lib/print";

type Vec = { x: number; y: number };

type Viewport = {
  /** Screen-space offset applied to the world. */
  pan: Vec;
  /** World→screen scale factor. 1 = 100%. */
  zoom: number;
};

type CanvasProps = {
  frames: PlacedFrame[];
  selectedFrameId: string | null;
  onAddFrame: (kind: FrameKind, worldPos: Vec) => void;
  onSelectFrame: (id: string | null) => void;
  onUpdateFrame: (id: string, partial: Partial<PlacedFrame>) => void;
  onDeleteFrame: (id: string) => void;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const GRID_SIZE = 5; // world feet between minor grid lines (one stride)
const MAJOR_GRID_MULTIPLE = 5; // major line every Nth minor line → 25 ft
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const KEY_ZOOM_FACTOR = 1.2;

const RESIZE_HANDLES: readonly ResizeHandle[] = ["tl", "tr", "br", "bl"];
const isResizeHandle = (v: string): v is ResizeHandle =>
  (RESIZE_HANDLES as readonly string[]).includes(v);

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/**
 * Infinite 2D canvas with grid, wheel/keyboard zoom, spacebar-drag pan, and
 * drag-and-drop of frame templates from the sidebar. Placed frames are
 * selectable, movable, and resizable.
 *
 * Interaction priority on pointer-down:
 *   1. Space held or middle mouse  → pan
 *   2. Hit a resize handle         → start resize
 *   3. Hit a frame body            → select + start move
 *   4. Empty background            → deselect (if anything was selected)
 *
 * Keyboard:
 *   - Space + drag        → pan
 *   - Wheel / pinch       → zoom around cursor
 *   - + / -               → zoom around center
 *   - 0 or F              → reset viewport
 *   - Esc                 → deselect
 *   - Backspace / Delete  → delete selected frame
 */
export function Canvas({
  frames,
  selectedFrameId,
  onAddFrame,
  onSelectFrame,
  onUpdateFrame,
  onDeleteFrame,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [interacting, setInteracting] = useState(false); // move or resize active
  const [dragHover, setDragHover] = useState(false);

  // Refs to avoid stale closures inside long-lived listeners.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const spaceHeldRef = useRef(false);
  spaceHeldRef.current = spaceHeld;
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const selectedFrameIdRef = useRef(selectedFrameId);
  selectedFrameIdRef.current = selectedFrameId;

  const panDragRef = useRef<{
    pointerId: number;
    startClient: Vec;
    startPan: Vec;
  } | null>(null);

  const moveDragRef = useRef<{
    pointerId: number;
    frameId: string;
    startClient: Vec;
    startPos: Vec;
  } | null>(null);

  const resizeDragRef = useRef<{
    pointerId: number;
    frameId: string;
    handle: ResizeHandle;
    startClient: Vec;
    initial: { position: Vec; width: number; height: number };
  } | null>(null);

  // SVG resize observation.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Once we know the canvas size, center the world origin in the viewport so
  // the print-area guideline is visible immediately instead of being parked at
  // the top-left. Runs exactly once.
  const didCenterRef = useRef(false);
  useEffect(() => {
    if (didCenterRef.current) return;
    if (size.width === 0 || size.height === 0) return;
    didCenterRef.current = true;
    setViewport((v) => ({
      ...v,
      pan: { x: size.width / 2, y: size.height / 2 },
    }));
  }, [size]);

  const zoomAt = useCallback((factor: number, screenPoint: Vec) => {
    setViewport((v) => {
      const newZoom = clampZoom(v.zoom * factor);
      const realFactor = newZoom / v.zoom;
      const newPan: Vec = {
        x: screenPoint.x - (screenPoint.x - v.pan.x) * realFactor,
        y: screenPoint.y - (screenPoint.y - v.pan.y) * realFactor,
      };
      return { pan: newPan, zoom: newZoom };
    });
  }, []);

  const resetViewport = useCallback(() => {
    const { width, height } = sizeRef.current;
    setViewport({
      pan: { x: width / 2, y: height / 2 },
      zoom: 1,
    });
  }, []);

  // Native wheel listener — React's synthetic wheel events are passive and
  // can't preventDefault, which we need to stop browser page zoom.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const screenPoint: Vec = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
      zoomAt(factor, screenPoint);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keyboard shortcuts.
  useEffect(() => {
    const isTextInput = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;

      if (e.code === "Space") {
        if (!e.repeat) setSpaceHeld(true);
        e.preventDefault();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const { width, height } = sizeRef.current;
        zoomAt(KEY_ZOOM_FACTOR, { x: width / 2, y: height / 2 });
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const { width, height } = sizeRef.current;
        zoomAt(1 / KEY_ZOOM_FACTOR, { x: width / 2, y: height / 2 });
        return;
      }
      if (e.key === "0" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        resetViewport();
        return;
      }
      if (e.key === "Escape") {
        if (selectedFrameIdRef.current !== null) {
          e.preventDefault();
          onSelectFrame(null);
        }
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        const id = selectedFrameIdRef.current;
        if (id) {
          e.preventDefault();
          onDeleteFrame(id);
        }
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        if (panDragRef.current) {
          panDragRef.current = null;
          setPanning(false);
        }
      }
    };

    const onBlur = () => {
      setSpaceHeld(false);
      panDragRef.current = null;
      moveDragRef.current = null;
      resizeDragRef.current = null;
      setPanning(false);
      setInteracting(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [zoomAt, resetViewport, onSelectFrame, onDeleteFrame]);

  const onPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      // 1. Pan: space held OR middle mouse.
      if (spaceHeldRef.current || e.button === 1) {
        e.preventDefault();
        panDragRef.current = {
          pointerId: e.pointerId,
          startClient: { x: e.clientX, y: e.clientY },
          startPan: { ...viewportRef.current.pan },
        };
        setPanning(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Only the primary (left) button drives selection/move/resize.
      if (e.button !== 0) return;

      const target = e.target as Element | null;
      const frameId = target?.getAttribute("data-frame-id") ?? null;
      const handleAttr = target?.getAttribute("data-handle") ?? null;

      // 2. Resize handle.
      if (frameId && handleAttr && isResizeHandle(handleAttr)) {
        const frame = framesRef.current.find((f) => f.id === frameId);
        if (!frame) return;
        e.preventDefault();
        onSelectFrame(frameId);
        resizeDragRef.current = {
          pointerId: e.pointerId,
          frameId,
          handle: handleAttr,
          startClient: { x: e.clientX, y: e.clientY },
          initial: {
            position: { ...frame.position },
            width: frame.width,
            height: frame.height,
          },
        };
        setInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 3. Frame body / label.
      if (frameId) {
        const frame = framesRef.current.find((f) => f.id === frameId);
        if (!frame) return;
        e.preventDefault();
        onSelectFrame(frameId);
        moveDragRef.current = {
          pointerId: e.pointerId,
          frameId,
          startClient: { x: e.clientX, y: e.clientY },
          startPos: { ...frame.position },
        };
        setInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 4. Background — deselect.
      if (selectedFrameIdRef.current !== null) {
        onSelectFrame(null);
      }
    },
    [onSelectFrame],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const panDrag = panDragRef.current;
      if (panDrag && e.pointerId === panDrag.pointerId) {
        const dx = e.clientX - panDrag.startClient.x;
        const dy = e.clientY - panDrag.startClient.y;
        setViewport((v) => ({
          ...v,
          pan: { x: panDrag.startPan.x + dx, y: panDrag.startPan.y + dy },
        }));
        return;
      }

      const pxPerFt = viewportRef.current.zoom * PX_PER_FT_AT_100;

      const moveDrag = moveDragRef.current;
      if (moveDrag && e.pointerId === moveDrag.pointerId) {
        const dxw = (e.clientX - moveDrag.startClient.x) / pxPerFt;
        const dyw = (e.clientY - moveDrag.startClient.y) / pxPerFt;
        onUpdateFrame(moveDrag.frameId, {
          position: {
            x: moveDrag.startPos.x + dxw,
            y: moveDrag.startPos.y + dyw,
          },
        });
        return;
      }

      const resizeDrag = resizeDragRef.current;
      if (resizeDrag && e.pointerId === resizeDrag.pointerId) {
        const dxw = (e.clientX - resizeDrag.startClient.x) / pxPerFt;
        const dyw = (e.clientY - resizeDrag.startClient.y) / pxPerFt;
        const next = applyFrameResize(resizeDrag.initial, resizeDrag.handle, {
          x: dxw,
          y: dyw,
        });
        onUpdateFrame(resizeDrag.frameId, {
          position: next.position,
          width: next.width,
          height: next.height,
        });
        return;
      }
    },
    [onUpdateFrame],
  );

  const endPointer = useCallback((e: PointerEvent<SVGSVGElement>) => {
    let released = false;

    const panDrag = panDragRef.current;
    if (panDrag && e.pointerId === panDrag.pointerId) {
      panDragRef.current = null;
      setPanning(false);
      released = true;
    }
    const moveDrag = moveDragRef.current;
    if (moveDrag && e.pointerId === moveDrag.pointerId) {
      moveDragRef.current = null;
      released = true;
    }
    const resizeDrag = resizeDragRef.current;
    if (resizeDrag && e.pointerId === resizeDrag.pointerId) {
      resizeDragRef.current = null;
      released = true;
    }

    if (!moveDragRef.current && !resizeDragRef.current) {
      setInteracting(false);
    }

    if (released) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released; ignore.
      }
    }
  }, []);

  // HTML5 drag-and-drop (sidebar → canvas).
  const isFrameDrag = (e: DragEvent<SVGSVGElement>) =>
    e.dataTransfer.types.includes(FRAME_DRAG_MIME);

  const onDragOver = useCallback(
    (e: DragEvent<SVGSVGElement>) => {
      if (!isFrameDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!dragHover) setDragHover(true);
    },
    [dragHover],
  );

  const onDragLeave = useCallback((e: DragEvent<SVGSVGElement>) => {
    if (e.currentTarget === e.target) setDragHover(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<SVGSVGElement>) => {
      const kindStr = e.dataTransfer.getData(FRAME_DRAG_MIME);
      if (!isFrameKind(kindStr)) return;
      e.preventDefault();
      setDragHover(false);

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const v = viewportRef.current;
      const pxPerFt = v.zoom * PX_PER_FT_AT_100;
      const worldPos: Vec = {
        x: (screenX - v.pan.x) / pxPerFt,
        y: (screenY - v.pan.y) / pxPerFt,
      };
      onAddFrame(kindStr, worldPos);
    },
    [onAddFrame],
  );

  // Effective screen pixels per world foot. `viewport.zoom` is the dimensionless
  // user-facing zoom (1.0 = 100% = print scale), `PX_PER_FT_AT_100` is the base
  // scale derived from print DPI. Multiply once here and reuse.
  const pxPerFt = viewport.zoom * PX_PER_FT_AT_100;
  const minorGridScreen = GRID_SIZE * pxPerFt;
  const majorGridScreen = minorGridScreen * MAJOR_GRID_MULTIPLE;
  // Page grid: tile of one printable area. Offset so that one tile boundary
  // falls exactly at world origin (the "center page" straddles the origin).
  const pageGridW = PRINT_AREA_SIZE.width * pxPerFt;
  const pageGridH = PRINT_AREA_SIZE.height * pxPerFt;
  const pageGridX = viewport.pan.x + pageGridW / 2;
  const pageGridY = viewport.pan.y + pageGridH / 2;
  const worldTransform = `translate(${viewport.pan.x} ${viewport.pan.y}) scale(${pxPerFt})`;

  // Top-level SVG cursor. Per-element cursors (e.g. move/resize on frames)
  // override this on hover; here we just set the canvas-wide default.
  const svgCursor = panning
    ? "grabbing"
    : interacting
      ? "grabbing"
      : spaceHeld
        ? "grab"
        : "default";

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ cursor: svgCursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <defs>
          <pattern
            id="canvas-grid-minor"
            x={viewport.pan.x}
            y={viewport.pan.y}
            width={minorGridScreen}
            height={minorGridScreen}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${minorGridScreen} 0 L 0 0 0 ${minorGridScreen}`}
              fill="none"
              stroke="rgba(15, 23, 42, 0.06)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          </pattern>
          <pattern
            id="canvas-grid-major"
            x={viewport.pan.x}
            y={viewport.pan.y}
            width={majorGridScreen}
            height={majorGridScreen}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${majorGridScreen} 0 L 0 0 0 ${majorGridScreen}`}
              fill="none"
              stroke="rgba(15, 23, 42, 0.12)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          </pattern>
          {/* Page-boundary grid (printable area, tiled).
              Dash cycle chosen in world units (8 ft on, 4 ft off → 12 ft) so
              it divides both 180 ft and 240 ft evenly. That guarantees the
              dashes tile seamlessly at any zoom level. */}
          <pattern
            id="canvas-page-grid"
            x={pageGridX}
            y={pageGridY}
            width={pageGridW}
            height={pageGridH}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${pageGridW} 0 L 0 0 0 ${pageGridH}`}
              fill="none"
              stroke="rgba(99, 102, 241, 0.55)"
              strokeWidth={1}
              strokeDasharray={`${8 * pxPerFt} ${4 * pxPerFt}`}
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#canvas-grid-minor)" />
        <rect width="100%" height="100%" fill="url(#canvas-grid-major)" />
        <rect width="100%" height="100%" fill="url(#canvas-page-grid)" />

        <g transform={worldTransform}>
          {/* Origin marker (3 ft across, screen-scale stroke). */}
          <g>
            <line
              x1={-3}
              y1={0}
              x2={3}
              y2={0}
              stroke="rgba(15, 23, 42, 0.45)"
              strokeWidth={1 / pxPerFt}
            />
            <line
              x1={0}
              y1={-3}
              x2={0}
              y2={3}
              stroke="rgba(15, 23, 42, 0.45)"
              strokeWidth={1 / pxPerFt}
            />
          </g>
          {frames.map((frame) => (
            <PlacedFrameView
              key={frame.id}
              frame={frame}
              pxPerFt={pxPerFt}
              selected={frame.id === selectedFrameId}
              spaceHeld={spaceHeld}
            />
          ))}
        </g>
      </svg>

      {dragHover && (
        <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-sky-400/70 bg-sky-50/30" />
      )}

      {frames.length === 0 && !dragHover && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-md border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
            Drag a frame from the right to start designing a drill.
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-3 bottom-3 flex flex-col items-end gap-1.5 text-[11px] font-medium text-slate-600">
        <div className="pointer-events-auto rounded-md border border-slate-200 bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
          {Math.round(viewport.zoom * 100)}%
        </div>
        <div className="rounded-md border border-slate-200 bg-white/80 px-2 py-1 shadow-sm backdrop-blur">
          {PRINT_PAPER_LABEL} · 1″ = {PRINT_FT_PER_INCH} ft
        </div>
        <div className="rounded-md border border-slate-200 bg-white/80 px-2 py-1 leading-relaxed shadow-sm backdrop-blur">
          <kbd className="font-sans">space</kbd> + drag · pan &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">wheel</kbd> · zoom &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">0</kbd> · reset &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">⌫</kbd> · delete
        </div>
      </div>
    </div>
  );
}
