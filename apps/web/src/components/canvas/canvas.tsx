"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";

import { PlacedFrameView, ROTATE_CORNER_ATTR } from "./placed-frame";
import {
  applyFrameResize,
  frameAtPoint,
  frameCenter,
  FRAME_DRAG_MIME,
  isFrameKind,
  normalizeRotation,
  PLAYER_DRAG_MIME,
  worldToFrameLocal,
  type FrameKind,
  type PlacedFrame,
  type PlayerElement,
  type PlayerTeam,
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

type FrameUpdate = { id: string; partial: Partial<PlacedFrame> };

type ElementSelection = { frameId: string; elementId: string } | null;

type CanvasProps = {
  frames: PlacedFrame[];
  selectedFrameIds: string[];
  selectedElement: ElementSelection;
  onAddFrame: (kind: FrameKind, worldPos: Vec) => void;
  onSelectionChange: (ids: string[]) => void;
  /** Single-frame update — used by resize/rotate of the sole selected frame. */
  onUpdateFrame: (id: string, partial: Partial<PlacedFrame>) => void;
  /** Batched update — used by group move so all frames shift in one render. */
  onUpdateFrames: (updates: ReadonlyArray<FrameUpdate>) => void;
  onDeleteFrames: (ids: ReadonlyArray<string>) => void;
  onCopyFrames: (frames: ReadonlyArray<PlacedFrame>) => void;
  onPasteFrames: () => void;
  onDuplicateFrames: (frames: ReadonlyArray<PlacedFrame>) => void;
  onAddPlayer: (frameId: string, team: PlayerTeam, localPos: Vec) => void;
  onSelectElement: (sel: ElementSelection) => void;
  onUpdateElement: (
    frameId: string,
    elementId: string,
    partial: Partial<PlayerElement>,
  ) => void;
  onDeleteElement: (frameId: string, elementId: string) => void;
};

/**
 * Compute the next selection after a click on `frameId`.
 * - additive (Shift): toggle the frame in/out of the current set.
 * - plain: if already selected keep the set (so a group stays draggable),
 *   otherwise select only this frame.
 */
function nextSelection(
  current: ReadonlyArray<string>,
  frameId: string,
  additive: boolean,
): string[] {
  if (additive) {
    return current.includes(frameId)
      ? current.filter((id) => id !== frameId)
      : [...current, frameId];
  }
  return current.includes(frameId) ? [...current] : [frameId];
}

/** AABB overlap test between a frame's (unrotated) bbox and a world rect. */
function frameIntersectsRect(
  frame: PlacedFrame,
  r: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  const fx0 = frame.position.x;
  const fy0 = frame.position.y;
  const fx1 = fx0 + frame.width;
  const fy1 = fy0 + frame.height;
  return fx0 <= r.x1 && fx1 >= r.x0 && fy0 <= r.y1 && fy1 >= r.y0;
}

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
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Figma-style rotation: free-rotate by default; hold Shift to snap.
const ROTATE_SNAP_DEG = 15;
const ROTATE_KEY_STEP_DEG = 15; // R / Shift+R nudge step

const radToDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Infinite 2D canvas with grid, wheel/keyboard zoom, spacebar-drag pan, and
 * drag-and-drop of frame templates from the sidebar. Placed frames are
 * selectable, movable, resizable, and rotatable.
 *
 * Selection is a set of frame ids. Resize/rotate handles only appear when
 * exactly one frame is selected; multi-select supports group move, copy,
 * duplicate, and delete.
 *
 * Interaction priority on pointer-down:
 *   1. Space held or middle mouse        → pan
 *   2. Hit a player/element              → select element + move within frame
 *   3. Hit a corner's rotate zone        → rotate around bbox center (sole sel)
 *   4. Hit a resize handle               → resize (sole sel)
 *   5. Hit the name label or border edge → select + start group move
 *   6. Hit the frame interior            → select only (no move)
 *   7. Empty background                  → marquee select (Shift adds)
 *
 * Shift+click a frame toggles it in/out of the selection.
 *
 * Keyboard:
 *   - Space + drag        → pan
 *   - Wheel / pinch       → zoom around cursor
 *   - + / -               → zoom around center
 *   - 0 or F              → reset viewport
 *   - R / Shift+R         → rotate selected frames ±15°
 *   - Drag rotate         → free; hold Shift to snap to 15°
 *   - ⌘/Ctrl A            → select all
 *   - ⌘/Ctrl C / V        → copy / paste selection (cascades on repeat)
 *   - ⌘/Ctrl D            → duplicate selection
 *   - Esc                 → deselect
 *   - Backspace / Delete  → delete selection
 */
export function Canvas({
  frames,
  selectedFrameIds,
  selectedElement,
  onAddFrame,
  onSelectionChange,
  onUpdateFrame,
  onUpdateFrames,
  onDeleteFrames,
  onCopyFrames,
  onPasteFrames,
  onDuplicateFrames,
  onAddPlayer,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
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
  // Rubber-band selection rectangle in screen px (relative to the svg).
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Refs to avoid stale closures inside long-lived listeners.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const spaceHeldRef = useRef(false);
  spaceHeldRef.current = spaceHeld;
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const selectedFrameIdsRef = useRef(selectedFrameIds);
  selectedFrameIdsRef.current = selectedFrameIds;
  const selectedElementRef = useRef(selectedElement);
  selectedElementRef.current = selectedElement;

  const panDragRef = useRef<{
    pointerId: number;
    startClient: Vec;
    startPan: Vec;
  } | null>(null);

  // Group move: capture each moving frame's start position so the whole
  // selection translates together by the same world delta.
  const moveDragRef = useRef<{
    pointerId: number;
    startClient: Vec;
    starts: ReadonlyArray<{ id: string; pos: Vec }>;
  } | null>(null);

  // Element (player) move: drag a parented element within its frame. The grab
  // offset is stored in the frame's local coords so the element stays under the
  // cursor even when the parent frame is rotated.
  const elementDragRef = useRef<{
    pointerId: number;
    frameId: string;
    elementId: string;
    grabOffset: Vec;
  } | null>(null);

  // Marquee (rubber-band) drag from empty background.
  const marqueeRef = useRef<{
    pointerId: number;
    startClient: Vec;
    /** Selection that existed before the drag (used when Shift-adding). */
    base: ReadonlyArray<string>;
    additive: boolean;
  } | null>(null);

  const resizeDragRef = useRef<{
    pointerId: number;
    frameId: string;
    handle: ResizeHandle;
    initial: {
      position: Vec;
      width: number;
      height: number;
      rotation: number;
    };
  } | null>(null);

  const rotateDragRef = useRef<{
    pointerId: number;
    frameId: string;
    /** Frame's bbox center in world coords (pivot, fixed during drag). */
    centerWorld: Vec;
    /** atan2 of (initial cursor − center), radians. */
    startAngleRad: number;
    /** Rotation (deg) at the moment the drag started. */
    startRotationDeg: number;
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
        if (selectedElementRef.current) {
          e.preventDefault();
          onSelectElement(null);
        } else if (selectedFrameIdsRef.current.length > 0) {
          e.preventDefault();
          onSelectionChange([]);
        }
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        const el = selectedElementRef.current;
        if (el) {
          e.preventDefault();
          onDeleteElement(el.frameId, el.elementId);
          return;
        }
        const ids = selectedFrameIdsRef.current;
        if (ids.length) {
          e.preventDefault();
          onDeleteFrames([...ids]);
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      // Select all.
      if (mod && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        onSelectionChange(framesRef.current.map((f) => f.id));
        return;
      }

      // Clipboard: Cmd/Ctrl + C copy, V paste, D duplicate (Figma-style).
      // All operate on the full selection.
      const selectedFrames = () =>
        framesRef.current.filter((f) =>
          selectedFrameIdsRef.current.includes(f.id),
        );
      if (mod && (e.key === "c" || e.key === "C")) {
        const sel = selectedFrames();
        if (!sel.length) return;
        e.preventDefault();
        onCopyFrames(sel);
        return;
      }
      if (mod && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        onPasteFrames();
        return;
      }
      if (mod && (e.key === "d" || e.key === "D")) {
        const sel = selectedFrames();
        if (!sel.length) return;
        e.preventDefault();
        onDuplicateFrames(sel);
        return;
      }

      // Plain R / Shift+R only — never swallow Ctrl+R or Cmd+R, those are
      // the browser's reload shortcut. Rotates the selected element, else every
      // selected frame, about its own center.
      if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey) {
        const dir = e.shiftKey ? -1 : 1;
        const elSel = selectedElementRef.current;
        if (elSel) {
          const frame = framesRef.current.find((f) => f.id === elSel.frameId);
          const el = frame?.elements.find((x) => x.id === elSel.elementId);
          if (!el) return;
          e.preventDefault();
          onUpdateElement(elSel.frameId, elSel.elementId, {
            rotation: normalizeRotation(el.rotation + dir * ROTATE_KEY_STEP_DEG),
          });
          return;
        }
        const sel = selectedFrames();
        if (!sel.length) return;
        e.preventDefault();
        onUpdateFrames(
          sel.map((f) => ({
            id: f.id,
            partial: {
              rotation: normalizeRotation(f.rotation + dir * ROTATE_KEY_STEP_DEG),
            },
          })),
        );
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
        return;
      }
    };

    const onBlur = () => {
      setSpaceHeld(false);
      panDragRef.current = null;
      moveDragRef.current = null;
      resizeDragRef.current = null;
      rotateDragRef.current = null;
      elementDragRef.current = null;
      marqueeRef.current = null;
      setMarquee(null);
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
  }, [
    zoomAt,
    resetViewport,
    onSelectionChange,
    onDeleteFrames,
    onUpdateFrames,
    onCopyFrames,
    onPasteFrames,
    onDuplicateFrames,
    onSelectElement,
    onUpdateElement,
    onDeleteElement,
  ]);

  /** Convert a clientX/Y to world coords using the current viewport. */
  const clientToWorld = useCallback((clientX: number, clientY: number): Vec => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const v = viewportRef.current;
    const pxPerFt = v.zoom * PX_PER_FT_AT_100;
    return {
      x: (clientX - rect.left - v.pan.x) / pxPerFt,
      y: (clientY - rect.top - v.pan.y) / pxPerFt,
    };
  }, []);

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

      // Only the primary (left) button drives selection/move/resize/rotate.
      if (e.button !== 0) return;

      const target = e.target as Element | null;
      const frameId = target?.getAttribute("data-frame-id") ?? null;
      const handleAttr = target?.getAttribute("data-handle") ?? null;
      const moveAttr = target?.getAttribute("data-frame-move") ?? null;
      const rotateAttr = target?.getAttribute("data-rotate-corner") ?? null;
      const elementId = target?.getAttribute("data-element-id") ?? null;

      // 2a. Element (player) hit — select it and start a within-frame move.
      //     Players render on top of the frame body, so this takes priority.
      if (elementId && frameId) {
        const frame = framesRef.current.find((f) => f.id === frameId);
        const el = frame?.elements.find((x) => x.id === elementId);
        if (!frame || !el) return;
        e.preventDefault();
        onSelectElement({ frameId, elementId });
        const cursor = clientToWorld(e.clientX, e.clientY);
        const local = worldToFrameLocal(frame, cursor);
        // Offset in normalized frame space so the element stays under the
        // cursor regardless of frame size/rotation.
        elementDragRef.current = {
          pointerId: e.pointerId,
          frameId,
          elementId,
          grabOffset: {
            x: el.position.x - local.x / frame.width,
            y: el.position.y - local.y / frame.height,
          },
        };
        setInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 2. Rotate. Grabbing a corner's rotate zone (just outside the resize
      //    handle) starts an angle-based rotation around the frame's bbox
      //    center, following the cursor like Figma. Free by default; Shift
      //    snaps to 15° (handled in pointermove).
      if (frameId && rotateAttr === ROTATE_CORNER_ATTR) {
        const frame = framesRef.current.find((f) => f.id === frameId);
        if (!frame) return;
        e.preventDefault();
        onSelectionChange([frameId]);
        const center = frameCenter(frame);
        const cursor = clientToWorld(e.clientX, e.clientY);
        rotateDragRef.current = {
          pointerId: e.pointerId,
          frameId,
          centerWorld: center,
          startAngleRad: Math.atan2(cursor.y - center.y, cursor.x - center.x),
          startRotationDeg: frame.rotation,
        };
        setInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 3. Resize handle.
      if (frameId && handleAttr && isResizeHandle(handleAttr)) {
        const frame = framesRef.current.find((f) => f.id === frameId);
        if (!frame) return;
        e.preventDefault();
        onSelectionChange([frameId]);
        resizeDragRef.current = {
          pointerId: e.pointerId,
          frameId,
          handle: handleAttr,
          initial: {
            position: { ...frame.position },
            width: frame.width,
            height: frame.height,
            rotation: frame.rotation,
          },
        };
        setInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 4. Move handle (name label or border edge only). The interior is NOT
      //    a move handle, so dragging inside the frame won't drag the whole
      //    thing once it holds objects.
      if (frameId && moveAttr) {
        e.preventDefault();
        const additive = e.shiftKey;
        const sel = nextSelection(
          selectedFrameIdsRef.current,
          frameId,
          additive,
        );
        onSelectionChange(sel);
        // Shift-click just toggles membership — it does not start a drag.
        if (additive) return;
        const moving = framesRef.current.filter((f) => sel.includes(f.id));
        moveDragRef.current = {
          pointerId: e.pointerId,
          startClient: { x: e.clientX, y: e.clientY },
          starts: moving.map((f) => ({ id: f.id, pos: { ...f.position } })),
        };
        setInteracting(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 5. Frame interior — select only (no move).
      if (frameId) {
        e.preventDefault();
        onSelectionChange(
          nextSelection(selectedFrameIdsRef.current, frameId, e.shiftKey),
        );
        return;
      }

      // 6. Empty background — start a marquee (rubber-band) selection. A plain
      //    press clears the current selection; Shift adds to it.
      e.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      const additive = e.shiftKey;
      marqueeRef.current = {
        pointerId: e.pointerId,
        startClient: { x: e.clientX, y: e.clientY },
        base: additive ? [...selectedFrameIdsRef.current] : [],
        additive,
      };
      if (!additive && selectedFrameIdsRef.current.length > 0) {
        onSelectionChange([]);
      }
      if (rect) {
        setMarquee({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          w: 0,
          h: 0,
        });
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [onSelectionChange, onSelectElement, clientToWorld],
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

      const elemDrag = elementDragRef.current;
      if (elemDrag && e.pointerId === elemDrag.pointerId) {
        const frame = framesRef.current.find((f) => f.id === elemDrag.frameId);
        if (!frame) return;
        const cursor = clientToWorld(e.clientX, e.clientY);
        const local = worldToFrameLocal(frame, cursor);
        onUpdateElement(elemDrag.frameId, elemDrag.elementId, {
          position: {
            x: clamp01(local.x / frame.width + elemDrag.grabOffset.x),
            y: clamp01(local.y / frame.height + elemDrag.grabOffset.y),
          },
        });
        return;
      }

      const moveDrag = moveDragRef.current;
      if (moveDrag && e.pointerId === moveDrag.pointerId) {
        const dxw = (e.clientX - moveDrag.startClient.x) / pxPerFt;
        const dyw = (e.clientY - moveDrag.startClient.y) / pxPerFt;
        onUpdateFrames(
          moveDrag.starts.map((s) => ({
            id: s.id,
            partial: { position: { x: s.pos.x + dxw, y: s.pos.y + dyw } },
          })),
        );
        return;
      }

      const resizeDrag = resizeDragRef.current;
      if (resizeDrag && e.pointerId === resizeDrag.pointerId) {
        const cursorWorld = clientToWorld(e.clientX, e.clientY);
        const next = applyFrameResize(
          resizeDrag.initial,
          resizeDrag.handle,
          cursorWorld,
        );
        onUpdateFrame(resizeDrag.frameId, {
          position: next.position,
          width: next.width,
          height: next.height,
        });
        return;
      }

      const rotateDrag = rotateDragRef.current;
      if (rotateDrag && e.pointerId === rotateDrag.pointerId) {
        const cursor = clientToWorld(e.clientX, e.clientY);
        const angle = Math.atan2(
          cursor.y - rotateDrag.centerWorld.y,
          cursor.x - rotateDrag.centerWorld.x,
        );
        const deltaDeg = radToDeg(angle - rotateDrag.startAngleRad);
        let nextDeg = rotateDrag.startRotationDeg + deltaDeg;
        // Free-rotate by default; hold Shift to snap to 15° (Figma).
        if (e.shiftKey) {
          nextDeg = Math.round(nextDeg / ROTATE_SNAP_DEG) * ROTATE_SNAP_DEG;
        }
        onUpdateFrame(rotateDrag.frameId, {
          rotation: normalizeRotation(nextDeg),
        });
        return;
      }

      const marqueeDrag = marqueeRef.current;
      if (marqueeDrag && e.pointerId === marqueeDrag.pointerId) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const sx = marqueeDrag.startClient.x - rect.left;
          const sy = marqueeDrag.startClient.y - rect.top;
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          setMarquee({
            x: Math.min(sx, cx),
            y: Math.min(sy, cy),
            w: Math.abs(cx - sx),
            h: Math.abs(cy - sy),
          });
        }
        // Live selection: frames touched by the world-space marquee rect.
        const a = clientToWorld(
          marqueeDrag.startClient.x,
          marqueeDrag.startClient.y,
        );
        const b = clientToWorld(e.clientX, e.clientY);
        const worldRect = {
          x0: Math.min(a.x, b.x),
          y0: Math.min(a.y, b.y),
          x1: Math.max(a.x, b.x),
          y1: Math.max(a.y, b.y),
        };
        const hits = framesRef.current
          .filter((f) => frameIntersectsRect(f, worldRect))
          .map((f) => f.id);
        const next = marqueeDrag.additive
          ? Array.from(new Set([...marqueeDrag.base, ...hits]))
          : hits;
        onSelectionChange(next);
        return;
      }
    },
    [
      onUpdateFrame,
      onUpdateFrames,
      onUpdateElement,
      onSelectionChange,
      clientToWorld,
    ],
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
    const rotateDrag = rotateDragRef.current;
    if (rotateDrag && e.pointerId === rotateDrag.pointerId) {
      rotateDragRef.current = null;
      released = true;
    }
    const elemDrag = elementDragRef.current;
    if (elemDrag && e.pointerId === elemDrag.pointerId) {
      elementDragRef.current = null;
      released = true;
    }
    const marqueeDrag = marqueeRef.current;
    if (marqueeDrag && e.pointerId === marqueeDrag.pointerId) {
      marqueeRef.current = null;
      setMarquee(null);
      released = true;
    }

    if (
      !moveDragRef.current &&
      !resizeDragRef.current &&
      !rotateDragRef.current &&
      !elementDragRef.current
    ) {
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
  const isCanvasDrag = (e: DragEvent<SVGSVGElement>) =>
    e.dataTransfer.types.includes(FRAME_DRAG_MIME) ||
    e.dataTransfer.types.includes(PLAYER_DRAG_MIME);

  const onDragOver = useCallback(
    (e: DragEvent<SVGSVGElement>) => {
      if (!isCanvasDrag(e)) return;
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
      // Player drop: must land on a frame (players are parented).
      const playerTeam = e.dataTransfer.getData(PLAYER_DRAG_MIME);
      if (playerTeam === "team-a" || playerTeam === "team-b") {
        e.preventDefault();
        setDragHover(false);
        const world = clientToWorld(e.clientX, e.clientY);
        const frame = frameAtPoint(framesRef.current, world);
        if (!frame) return; // dropped on empty canvas — ignore
        const local = worldToFrameLocal(frame, world);
        onAddPlayer(frame.id, playerTeam, {
          x: clamp01(local.x / frame.width),
          y: clamp01(local.y / frame.height),
        });
        return;
      }

      const kindStr = e.dataTransfer.getData(FRAME_DRAG_MIME);
      if (!isFrameKind(kindStr)) return;
      e.preventDefault();
      setDragHover(false);
      const worldPos = clientToWorld(e.clientX, e.clientY);
      onAddFrame(kindStr, worldPos);
    },
    [onAddFrame, onAddPlayer, clientToWorld],
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
              selected={selectedFrameIds.includes(frame.id)}
              showHandles={
                selectedFrameIds.length === 1 && selectedFrameIds[0] === frame.id
              }
              spaceHeld={spaceHeld}
              selectedElementId={
                selectedElement?.frameId === frame.id
                  ? selectedElement.elementId
                  : null
              }
            />
          ))}
        </g>
      </svg>

      {marquee && (marquee.w > 0 || marquee.h > 0) && (
        <div
          className="pointer-events-none absolute border border-sky-400 bg-sky-400/10"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
          }}
        />
      )}

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
          drag bg · marquee &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">⇧</kbd> click · multi &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">⌘D</kbd> · duplicate &nbsp;·&nbsp;{" "}
          <kbd className="font-sans">⌫</kbd> · delete
        </div>
      </div>
    </div>
  );
}
