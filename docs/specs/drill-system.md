# RinkRocket – Drill System Specification

## Overview

The Drill System defines how hockey drills are created, edited, stored, rendered, and shared within RinkRocket.

Unlike traditional hockey tools that rely on rigid templates, RinkRocket introduces a **freeform, canvas-based drill builder** inspired by Figma and Excalidraw, combined with **structured hockey-specific primitives**.

> **Scope of this spec:** the MVP drill composer (static, multi-frame). Simulation, behaviors, and playback are out of scope and have a separate future spec (`drill-simulation.md`).

---

## Core Concept

A drill is a **sequence of frames** rendered on a hockey rink canvas. Each frame contains hockey-specific elements (players, cones, pucks, paths, zones, labels) at fixed positions. Coaches step through frames to communicate progression.

This enables:
- flexible drill creation
- multi-step progression
- visual clarity
- fast editing
- a clean migration path to animation later (frames become keyframes)

---

## Goals

### Primary
- A coach can create a usable drill in under 60 seconds
- The canvas works well on web in MVP and renders read-only on mobile and tablet
- Multi-frame progression is supported from day one
- The data model is forward-compatible with future animation

### Secondary
- Drill reuse and templating
- Export to image and PDF
- Easy sharing with players and parents

### Non-goals (MVP)
- Full Figma-level editing capabilities
- Animation, playback, or simulation
- Real-time collaboration
- Mobile-native drill editing (mobile is view-only in MVP)
- AI-generated drills
- Behaviors, events, or physics

---

## Rink Coordinate System

All drill elements live in a **rink-relative coordinate space**, not pixel space.

- The rink is modeled as 200 ft x 85 ft (NHL regulation), as a normalized rectangle.
- Coordinate origin `(0, 0)` is the **top-left of the rink rectangle**.
- X increases to the right (toward the right end boards).
- Y increases downward (toward the bottom boards).
- Coordinates are stored as **floating-point feet**, not pixels.
- The renderer is responsible for scaling rink-feet → screen-pixels.

Supported rink views:
- `full` — full sheet (200 x 85)
- `half` — one half (100 x 85)
- `neutral-zone` — center region (50 x 85)
- `offensive-zone` — end zone (50 x 85)

A drill records which `rinkView` it was authored for. The renderer crops and scales accordingly.

---

## Drill Data Model

All identifiers are stable, opaque strings.

```ts
type Drill = {
  id: string;
  schemaVersion: 1;
  ownerId: string;
  name: string;
  description?: string;
  durationSec?: number;
  tags: string[];
  rinkView: 'full' | 'half' | 'neutral-zone' | 'offensive-zone';
  canvasState: CanvasState;
  createdAt: string;
  updatedAt: string;
};

type CanvasState = {
  frames: Frame[];
  activeFrameId: string;
};

type Frame = {
  id: string;
  label?: string;
  elements: DrillElement[];
};

type DrillElement =
  | PlayerElement
  | PuckElement
  | ConeElement
  | PathElement
  | ZoneElement
  | TextElement;

type ElementBase = {
  id: string;
  x: number;
  y: number;
  rotation?: number;
};

type PlayerElement = ElementBase & {
  type: 'player';
  team: 'home' | 'away' | 'neutral';
  number?: string;
  role?: string;
};

type PuckElement = ElementBase & { type: 'puck' };

type ConeElement = ElementBase & { type: 'cone' };

type PathElement = ElementBase & {
  type: 'path';
  kind: 'skate' | 'pass' | 'shot';
  points: Array<{ x: number; y: number }>;
  endStyle?: 'arrow' | 'none';
};

type ZoneElement = ElementBase & {
  type: 'zone';
  shape: 'rect' | 'ellipse';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  label?: string;
};

type TextElement = ElementBase & {
  type: 'text';
  content: string;
  fontSize?: number;
};
```

### Versioning

- `schemaVersion` is required and starts at `1`.
- Any breaking change to a field bumps `schemaVersion`.
- Migrations live in `packages/core/src/drill/migrations/` and are applied on read.
- Storage always writes the latest version.

### Practice Model

```ts
type Practice = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  durationSec?: number;
  drills: PracticeDrill[];
  createdAt: string;
  updatedAt: string;
};

type PracticeDrill = {
  id: string;
  drillId: string;
  position: number;
  notes?: string;
};

type ShareLink = {
  id: string;
  practiceId: string;
  token: string;
  createdAt: string;
  revokedAt?: string;
};
```

---

## MVP Element Set

The drill composer ships with exactly:
- Player (home / away / neutral, optional jersey number)
- Puck
- Cone
- Path (skate / pass / shot)
- Zone (rect / ellipse)
- Text label

Anything else is post-MVP.

---

## Frames and Progression

- A drill always has at least one frame.
- New drills start with a single empty frame.
- Frames are ordered.
- Coaches can add, duplicate, reorder, and delete frames.
- Each frame is a full snapshot of element positions; there is no inheritance between frames in MVP.
- "Duplicate frame" is the primary way to build progression: copy frame N, advance to frame N+1, move things.

This deliberately keeps MVP simple. Inheritance and keyframing are Stage 2 problems.

---

## Editing Behavior (MVP, web only)

- Single-select with click
- Multi-select with shift-click or marquee
- Drag to move
- Delete with Delete or Backspace
- Undo / redo at the frame level
- Snap-to-grid optional, off by default
- Pan and zoom on the canvas
- Explicit tool modes (select, player, puck, cone, path, zone, text) to avoid gesture conflicts
- Keyboard shortcuts on web

Touch editing on mobile is **not** in MVP; mobile is read-only.

---

## Storage and Loading

- Drills are stored in Supabase as a row with `canvas_state` as `jsonb`.
- The drill JSON is the source of truth; rendering is deterministic.
- The editor uses a debounced "save" transaction per change batch to avoid autosave races.
- Drill thumbnails for the library are rendered on demand and cached in storage.

---

## Sharing

- A practice can have one active share link at a time.
- Share links are public-by-token in MVP (no login required to view).
- Tokens are long, opaque, URL-safe; never sequential ids.
- Share links can be revoked, which invalidates the token.
- The shared page is read-only and renders the practice with each drill expandable and steppable through frames.

---

## Export

MVP supports:
- Export drill (current frame or all frames) as PNG
- Export practice as multi-page PDF

Export is high-value for coaches who print or text their practice plans.

---

## Rendering

- Web (MVP editor and viewer): SVG-based renderer in `packages/canvas`.
- Mobile (MVP viewer): the same `packages/canvas` rendering layer running on `react-native-svg`.
- The renderer takes `CanvasState`, `rinkView`, and a target size, and produces output deterministically.
- Canvas tech decision is open; current default is plain SVG. Alternatives under consideration: `react-konva`, `@shopify/react-native-skia`. See `BACKLOG.md`.

---

## Open Questions

- Stroke style conventions for skate, pass, and shot — pick a published standard (USA Hockey or Hockey Canada).
- Whether numbered players auto-increment per team.
- Whether zone shapes support rotation in MVP.
- Whether free-draw annotations are supported in MVP (current default: no).

---

## Related

- Product overview: `PROJECT.md`
- Backlog and milestones: `BACKLOG.md`
- Composer UI design: `packages/design/drill-composer.pen`
