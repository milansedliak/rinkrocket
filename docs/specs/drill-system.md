# RinkRocket – Drill System Specification

This spec defines how hockey drills are modeled, stored, rendered, and shared. It is the canonical reference for the data layer.

UX and quality bar for the editor live in `canvas-ux.md`.

> **Scope:** MVP drill composer (static, multi-frame). Simulation, behaviors, and playback are out of scope here.

---

## Core Concept

A drill is a **sequence of frames** rendered on a hockey rink canvas. Each frame contains hockey-specific elements (players, pucks, cones, paths, zones, labels) at fixed positions. Coaches step through frames to communicate progression.

The model is structured (rink-relative coordinates, typed primitives) so it can extend cleanly into animation and simulation later.

---

## Goals

### Primary
- A coach can create a usable drill in under 60 seconds
- The canvas works on desktop browsers in MVP and renders correctly on mobile and tablet web (responsive + PWA)
- Multi-frame progression is supported from day one
- The data model is forward-compatible with future animation

### Non-goals (MVP)
- Full Figma-level editing capabilities
- Animation, playback, simulation
- Real-time collaboration
- Native mobile/tablet apps
- AI-generated drills
- Behaviors, events, or physics
- Templating and drill reuse libraries (post-MVP)

---

## Rink Coordinate System

All drill elements live in a **rink-relative coordinate space**, not pixel space.

- The rink is modeled as **200 ft × 85 ft** (NHL regulation), as a normalized rectangle.
- Coordinate origin `(0, 0)` is the **top-left of the rink rectangle**.
- X increases to the right (toward the right end boards).
- Y increases downward (toward the bottom boards).
- Coordinates are stored as **floating-point feet**, not pixels.
- The renderer is responsible for scaling rink-feet to screen-pixels.

Supported rink views:

| `rinkView` | Dimensions  | Use case                         |
| ---------- | ----------- | -------------------------------- |
| `full`     | 200 × 85 ft | Full-ice drills                  |
| `half`     | 100 × 85 ft | Half-ice drills                  |
| `zone`     | 50 × 85 ft  | Zone drills (offensive/defensive geometry is identical) |

The renderer may rotate the rendered rink (e.g. portrait on phones), but stored coordinates remain in landscape rink space.

---

## Rink Anchors

The rink has named **anchor points** that map to coordinates. Anchors serve two purposes:

1. **Snap-to-anchor** in the editor (drag a player near the faceoff dot, it snaps).
2. **Semantic positioning** for AI agents (see `ai-interface.md`).

Anchors are **derived**, not stored. Drill data always stores absolute coordinates. Anchors are resolved by `packages/core/src/rink/anchors.ts` based on `rinkView`.

### Anchor catalog

```ts
type RinkAnchor =
  // Lines (full view coordinates shown; resolver remaps for half / zone views)
  | 'goal-line-left'        // x = 11
  | 'goal-line-right'       // x = 189
  | 'blue-line-left'        // x = 75
  | 'blue-line-right'       // x = 125
  | 'red-line'              // x = 100

  // Faceoff dots
  | 'faceoff-center'                  // (100, 42.5)
  | 'faceoff-offensive-left'          // attacking team's offensive zone, left dot
  | 'faceoff-offensive-right'
  | 'faceoff-defensive-left'
  | 'faceoff-defensive-right'
  | 'faceoff-neutral-left-top'
  | 'faceoff-neutral-left-bottom'
  | 'faceoff-neutral-right-top'
  | 'faceoff-neutral-right-bottom'

  // Nets and creases
  | 'net-left'              // center of left net
  | 'net-right'
  | 'crease-left'           // center of left crease
  | 'crease-right'

  // Zone centroids (useful for "place 3 players in the offensive zone")
  | 'zone-offensive'
  | 'zone-neutral'
  | 'zone-defensive';
```

### Resolver contract

```ts
function resolveAnchor(name: RinkAnchor, rinkView: RinkView): Vec;
function listAnchors(rinkView: RinkView): Array<{ name: RinkAnchor; position: Vec }>;
```

- Coordinates are returned in the same rink-feet space the drill data uses.
- For `half` and `zone` views, anchors outside the visible region are still resolvable but may return coordinates outside the view (the renderer clips appropriately).
- Anchors that don't exist in a view (e.g. `red-line` in a `zone` view) throw a typed error.

### Why anchors aren't stored

If a drill stored "player at faceoff-center" rather than `(100, 42.5)`, dragging the player a few feet would create ambiguity: is it still anchored, or now absolute? Keeping storage as coordinates eliminates this. The editor and AI tools use anchors as input sugar that immediately resolves.

---

## Drill Data Model

All identifiers are stable, opaque strings (UUID or NanoID).
All colors are `#RRGGBB` or `#RRGGBBAA`.

```ts
type Drill = {
  id: string;
  schemaVersion: number;          // starts at 1, bumps on breaking changes
  ownerId: string;
  name: string;
  description?: string;
  durationSec?: number;
  tags?: string[];
  rinkView: 'full' | 'half' | 'zone';
  canvasState: CanvasState;
  createdAt: string;              // ISO timestamp
  updatedAt: string;
};

type CanvasState = {
  frames: Frame[];                // always at least one frame
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

type Vec = { x: number; y: number };   // rink feet

type PlayerElement = {
  type: 'player';
  id: string;
  position: Vec;
  rotation?: number;              // degrees, default 0
  team: 'team-a' | 'team-b';
  number?: string;                // jersey number / label
  role?: 'F' | 'D' | 'G';         // optional position role
};

type PuckElement = {
  type: 'puck';
  id: string;
  position: Vec;
};

type ConeElement = {
  type: 'cone';
  id: string;
  position: Vec;
};

type PathElement = {
  type: 'path';
  id: string;
  kind: 'skate' | 'pass' | 'shot';
  points: Vec[];                  // absolute rink-feet coordinates
  endStyle?: 'arrow' | 'none';
};

type ZoneElement = {
  type: 'zone';
  id: string;
  position: Vec;                  // top-left corner
  rotation?: number;
  shape: 'rect' | 'ellipse';
  width: number;                  // rink feet
  height: number;                 // rink feet
  fill?: string;                  // #RRGGBB[AA]
  stroke?: string;                // #RRGGBB[AA]
  label?: string;
};

type TextElement = {
  type: 'text';
  id: string;
  position: Vec;
  rotation?: number;
  content: string;
  size: 'sm' | 'md' | 'lg';       // semantic, renderer maps to pixels
};
```

### Notes on the model

- **`PathElement` has no `position`** — its `points` are absolute. This avoids the relative-vs-absolute ambiguity.
- **`rotation` is only on elements where it makes sense** (Player, Zone, Text). Pucks, cones, and paths have no rotation.
- **Active frame is editor state, not data state.** It is not stored in `CanvasState`. On load, the first frame is active.
- **`team` uses neutral labels** (`team-a` / `team-b`). The renderer assigns colors via design tokens.
- **`size` on text is semantic** (`sm` / `md` / `lg`). Coaches don't think in font sizes; renderer maps to feet.

### Versioning

- `schemaVersion` starts at `1`. Bump on any breaking change.
- Migrations live in `packages/core/src/drill/migrations/`.
- Migrations apply on read. Writes always use the latest version.
- A migration is `(old: unknown) => Drill` and is responsible for shape validation.

---

## Practice Model

A practice is an ordered collection of drills. For MVP, practices are intentionally simple.

```ts
type Practice = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  durationSec?: number;
  drillIds: string[];             // ordered; source of truth for drill order
  createdAt: string;
  updatedAt: string;
};
```

There is no `PracticeDrill` join row in MVP — practices reference drills by id, ordered by array position. Per-drill notes and metadata are post-MVP.

---

## Sharing Model

Drills (and later practices) can be shared via opaque public links.

```ts
type ShareLink = {
  id: string;
  resourceType: 'drill' | 'practice';
  resourceId: string;
  token: string;                  // long, opaque, URL-safe
  createdAt: string;
  revokedAt?: string;
};
```

Rules:
- A resource may have multiple active share links (different audiences, different revocation lifetimes).
- Revoking a link sets `revokedAt`. The token immediately stops working.
- Tokens are never sequential; use a CSPRNG-backed generator (e.g. NanoID, 21+ chars).
- A shared page is read-only and requires no login.

---

## MVP Element Set

The drill composer ships with exactly:

- Player (team-a / team-b, optional jersey number, optional role)
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
- Each frame is a full snapshot of element positions; **there is no inheritance between frames** in MVP.
- "Duplicate frame" is the primary way to build progression: duplicate frame N, advance to N+1, move things.

This deliberately keeps MVP simple. Inheritance and keyframing belong to Stage 2.

---

## Storage and Loading

- Drills are stored in Supabase as a row with `canvas_state` as `jsonb`.
- The drill JSON is the source of truth; rendering is deterministic.
- Drill thumbnails for the library are rendered server-side or client-side on demand and cached in storage.
- Save semantics (debouncing, conflict handling) are an editor concern, not part of this spec.

---

## Export

MVP supports:
- Export drill (current frame or all frames) as **PNG**.

PDF export is **post-MVP**.

---

## Rendering

- Web: SVG-based renderer in `apps/web`.
- The renderer takes `CanvasState`, `rinkView`, and a target size, and produces output deterministically.
- Player colors, path stroke styles, and zone fills come from design tokens in `packages/ui` (when extracted) so the model stays presentation-agnostic.
- Canvas tech decision (plain SVG vs `react-konva` vs Skia) is tracked in `docs/decisions.md` and resolved in Phase 0.

---

## Open Questions

Tracked in `docs/decisions.md`:
- Stroke style conventions for skate / pass / shot
- Whether numbered players auto-increment per team
- Whether zone shapes support rotation in MVP (current default: yes, via `rotation`)
- Whether free-draw annotations are supported in MVP (current default: no)

---

## Related

- Product overview: `PROJECT.md`
- Canvas UX and quality bar: `canvas-ux.md`
- AI / agent integration: `ai-interface.md`
- Phased delivery plan: `BACKLOG.md`
- Composer UI design: `packages/design/drill-composer.pen`
