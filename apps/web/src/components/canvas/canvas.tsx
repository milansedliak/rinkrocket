"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

type Vec = { x: number; y: number };

type Viewport = {
  /** Screen-space offset applied to the world. */
  pan: Vec;
  /** World→screen scale factor. 1 = 100%. */
  zoom: number;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const GRID_SIZE = 20; // world units between minor grid lines
const MAJOR_GRID_MULTIPLE = 5; // major line every Nth minor line
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const KEY_ZOOM_FACTOR = 1.2;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/**
 * Infinite 2D canvas with a grid background, wheel/keyboard zoom centered on the
 * cursor, and spacebar-drag panning. This is the foundation for the drill
 * composer — no rink or drill elements yet.
 *
 * Interactions:
 * - Hold Space, drag with mouse  → pan
 * - Middle mouse drag            → pan
 * - Mouse wheel / pinch          → zoom around cursor
 * - `+` / `-`                    → zoom around center
 * - `0` or `F`                   → reset viewport
 */
export function Canvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<Viewport>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });

  // UI state we want to render against.
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);

  // Refs to avoid stale closures inside long-lived listeners.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const spaceHeldRef = useRef(false);
  spaceHeldRef.current = spaceHeld;

  // Track active pan drag.
  const panDragRef = useRef<{
    pointerId: number;
    startClient: Vec;
    startPan: Vec;
  } | null>(null);

  // Observe SVG size for centering and shortcuts.
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

  const zoomAt = useCallback((factor: number, screenPoint: Vec) => {
    setViewport((v) => {
      const newZoom = clampZoom(v.zoom * factor);
      const realFactor = newZoom / v.zoom;
      // Keep `screenPoint` stable in world space:
      //   newPan = screenPoint - (screenPoint - oldPan) * realFactor
      const newPan: Vec = {
        x: screenPoint.x - (screenPoint.x - v.pan.x) * realFactor,
        y: screenPoint.y - (screenPoint.y - v.pan.y) * realFactor,
      };
      return { pan: newPan, zoom: newZoom };
    });
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({ pan: { x: 0, y: 0 }, zoom: 1 });
  }, []);

  // Native wheel listener so we can preventDefault (React's synthetic wheel
  // events are passive in modern browsers and can't stop page zoom).
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

  // Keyboard: space (pan modifier), +/-/0/F.
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
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        // If we're mid-drag, end it cleanly.
        if (panDragRef.current) {
          panDragRef.current = null;
          setPanning(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    // If the window loses focus, drop the space-held state so the user isn't
    // stuck in pan mode when they come back.
    const onBlur = () => {
      setSpaceHeld(false);
      panDragRef.current = null;
      setPanning(false);
    };
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [zoomAt, resetViewport]);

  const onPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const isMiddleMouse = e.button === 1;
      const shouldPan = spaceHeldRef.current || isMiddleMouse;
      if (!shouldPan) return;
      e.preventDefault();
      const startPan = { ...viewportRef.current.pan };
      panDragRef.current = {
        pointerId: e.pointerId,
        startClient: { x: e.clientX, y: e.clientY },
        startPan,
      };
      setPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback((e: PointerEvent<SVGSVGElement>) => {
    const drag = panDragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startClient.x;
    const dy = e.clientY - drag.startClient.y;
    setViewport((v) => ({
      ...v,
      pan: { x: drag.startPan.x + dx, y: drag.startPan.y + dy },
    }));
  }, []);

  const endPan = useCallback((e: PointerEvent<SVGSVGElement>) => {
    const drag = panDragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    panDragRef.current = null;
    setPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released; ignore.
    }
  }, []);

  const minorGridScreen = GRID_SIZE * viewport.zoom;
  const majorGridScreen = minorGridScreen * MAJOR_GRID_MULTIPLE;

  // World→screen transform for content rendered in world coordinates (origin
  // marker for now, drill content later).
  const worldTransform = `translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom})`;

  const cursor = panning ? "grabbing" : spaceHeld ? "grab" : "default";

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <defs>
          {/* Minor grid: light gray, every GRID_SIZE world units. */}
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
          {/* Major grid: darker, every MAJOR_GRID_MULTIPLE minor lines. */}
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
        </defs>

        {/* Layer the two grids. */}
        <rect width="100%" height="100%" fill="url(#canvas-grid-minor)" />
        <rect width="100%" height="100%" fill="url(#canvas-grid-major)" />

        {/* World-space content. Just an origin marker for now. */}
        <g transform={worldTransform}>
          <g>
            <line
              x1={-12}
              y1={0}
              x2={12}
              y2={0}
              stroke="rgba(15, 23, 42, 0.45)"
              strokeWidth={1 / viewport.zoom}
            />
            <line
              x1={0}
              y1={-12}
              x2={0}
              y2={12}
              stroke="rgba(15, 23, 42, 0.45)"
              strokeWidth={1 / viewport.zoom}
            />
          </g>
        </g>
      </svg>

      {/* HUD: zoom indicator + controls hint. Lives in screen space, outside the SVG. */}
      <div className="pointer-events-none absolute right-3 bottom-3 flex flex-col items-end gap-1.5 text-[11px] font-medium text-slate-600">
        <div className="pointer-events-auto rounded-md border border-slate-200 bg-white/90 px-2 py-1 shadow-sm backdrop-blur">
          {Math.round(viewport.zoom * 100)}%
        </div>
        <div className="rounded-md border border-slate-200 bg-white/80 px-2 py-1 leading-relaxed shadow-sm backdrop-blur">
          <kbd className="font-sans">space</kbd> + drag · pan &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">wheel</kbd> · zoom &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">0</kbd> · reset
        </div>
      </div>
    </div>
  );
}
