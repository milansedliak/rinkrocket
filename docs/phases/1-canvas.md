# Phase 1 — Canvas + Drill System

Status: `[ ]` not started
Target duration: 4–6 weeks

> **This is the whole product in Phase 1.** No login, no accounts, no backend. You visit the URL, the canvas is already there, you start drawing. Drills live in the browser. Everything else — auth, cloud, sharing, practices — is a later phase that wraps this one.
>
> The canvas quality bar in `docs/specs/canvas-ux.md` is non-negotiable. If a feature ships but does not meet that bar, it does not count.

---

## Goal

Build the best hockey drill builder on the market, and ship it as a **local-only** tool first. A coach can land on the URL, build a multi-frame drill in under a minute, save it (locally), export a PNG, and come back tomorrow to find it still there.

Doing it local-first lets us spend 100% of this phase on the canvas itself — no auth flows, no RLS rules, no migration scripts, no share-link plumbing. Those come in Phase 2 once the canvas is genuinely great.

---

## Scope

### Repo setup (do once, here)

- [ ] Initialize pnpm workspace at repo root
- [ ] Create `apps/web` (Next.js, App Router, TypeScript)
- [ ] Create `packages/core` for shared types, drill model, rink coords, anchors, validation, migrations
- [ ] Shared `tsconfig` base
- [ ] ESLint + Prettier
- [ ] GitHub Actions CI: typecheck, lint, build, perf budget
- [ ] Minimal test setup (Vitest)

Explicitly **not** done in Phase 1: Turborepo, `packages/ui`, `packages/api`, `packages/canvas`, Supabase, Sentry, PostHog, Storybook, Expo app, auth, any cloud service. All deferred until they're justified.

### Drill data model and validation

- [ ] All types from `docs/specs/drill-system.md` implemented in `packages/core`
- [ ] Zod schemas for `Drill`, `Frame`, every `DrillElement` variant
- [ ] `schemaVersion: 1` enforced, migrations folder scaffolded
- [ ] Rink coordinate system (200×85, supported views: `full`, `half`, `zone`)
- [ ] Rink anchor catalog + resolver (`packages/core/src/rink/anchors.ts`)
- [ ] `DrillPatch` type defined and applied via a single reducer

### Rendering

- [ ] SVG-based renderer in `apps/web` (plain SVG per ADR-013)
- [ ] Rink background rendered correctly for `full`, `half`, and `zone`
- [ ] Renderer is deterministic: `(CanvasState, rinkView, size) → SVG`
- [ ] Same renderer used for editor, thumbnails, and PNG export

### Editing tools (full MVP element set)

- [ ] Select tool
- [ ] Hand (pan) tool
- [ ] Player tool (team-a / team-b, optional jersey number, optional role)
- [ ] Puck tool
- [ ] Cone tool
- [ ] Path tool (skate / pass / shot)
- [ ] Zone tool (rect / ellipse)
- [ ] Text tool

### Canvas behavior

- [ ] Pan (spacebar-drag, middle-mouse, Hand tool)
- [ ] Zoom (wheel, pinch, keyboard)
- [ ] Fit-to-screen (`0` / `F`)
- [ ] Snap-to-grid (5 ft), toggle in header
- [ ] Snap-to-anchor (uses the rink anchor resolver)
- [ ] Snap-to-element (centers and rink markings)
- [ ] Multi-select via shift-click and marquee
- [ ] Drag-to-move with live update
- [ ] Resize handles on zones
- [ ] Rotate handles on players, zones, text
- [ ] Inline path-point editing
- [ ] Delete via `Delete` / `Backspace`

### Tool modes and shortcuts

- [ ] All keyboard shortcuts from `docs/specs/canvas-ux.md`
- [ ] Tool palette (left rail) visible at all times
- [ ] Spacebar-held = temporary Hand tool
- [ ] `Esc` returns to Select
- [ ] Tool stays active after placing (does not auto-switch)

### Inspector

- [ ] Always-visible right inspector for selected element
- [ ] Player: team, number, role
- [ ] Path: kind, end style
- [ ] Zone: shape, fill, stroke, label
- [ ] Text: content, size

### Frames

- [ ] Filmstrip along bottom
- [ ] Add, duplicate, reorder, delete frames
- [ ] Click thumbnail to switch
- [ ] `Cmd/Ctrl + ←` / `→` switches frames
- [ ] Live thumbnails
- [ ] Drag-to-reorder

### Undo / Redo

- [ ] `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z`
- [ ] History entries are `DrillPatch` operations (one history model — same shape AI will produce later)
- [ ] At least 50 ops of history
- [ ] Frame structure changes are part of history

### Local persistence

- [ ] All drills persisted to IndexedDB (localStorage is too small for many drills with frames)
- [ ] Debounced save 750 ms after last change
- [ ] Forced save on: frame switch, tool switch to Select, window blur, navigation
- [ ] "Saving…" / "Saved" indicator in header
- [ ] Drill list page shows all local drills with thumbnails
- [ ] Drill rename, duplicate, delete from list
- [ ] Forward-compatible: drill JSON is the same shape that Phase 2 will sync to the cloud, so existing drills survive the migration

### Empty states

- [ ] First visit: a clean rink in the editor, palette visible, single hint text
- [ ] No modal walkthroughs, no tutorials, no product tours

### Mobile / tablet web (read-only)

- [ ] App is responsive on phones and tablets
- [ ] Editor on touch shows a "view-only on mobile" notice (not a broken editor)
- [ ] App is installable as a PWA

### PNG Export (no backend required)

- [ ] Export current frame as PNG
- [ ] Export all frames as a single tall PNG
- [ ] Uses the same SVG renderer (no separate codepath)
- [ ] Downloads directly from the browser; no server round-trip

### AI-readiness foundations

These land here, used by Phase 5. Most are useful for the editor itself.

- [ ] Anchor catalog + resolver covers every anchor in `docs/specs/drill-system.md#rink-anchors`
- [ ] Editor snap-to-anchor uses the same resolver
- [ ] Tool surface implemented as typed client functions in `packages/core/src/tools/`
  - drill / frame / element CRUD
  - `applyDrillPatch`
  - `validateDrill` returns structured `Issue[]`
- [ ] Same tools are called by editor UI and (later) by AI assist — no parallel path
- [ ] Schema export endpoints at `/api/ai/schema/*` (drill, element, anchors, tools, version) — read directly from the Zod schemas

See `docs/specs/ai-interface.md`.

---

## Performance Targets (CI-enforced)

A benchmark fixture lives in `apps/web/test/perf/`. CI fails if any target is missed.

| Metric                                | Target           |
| ------------------------------------- | ---------------- |
| Cold load TTI on broadband desktop    | < 2.0 s          |
| Drag frame time, 50 elements          | < 16 ms (60 fps) |
| Pan/zoom frame time, 4 frames         | < 16 ms          |
| Input-to-paint on tool action         | < 50 ms          |

---

## Quality Bar (manual acceptance — from `canvas-ux.md`)

1. A coach who has never seen the product places 5 players, 1 puck, and 1 skate path **in under 30 seconds** without help.
2. They duplicate the frame and move 2 players for Frame 2 **in under 15 seconds**.
3. They export a PNG of the drill and successfully text it to themselves.
4. They close the tab, come back the next day, the drill is still there.
5. They do **not** ask "how do I save?"
6. They do **not** ask "how do I delete?"
7. They describe the product as closer to **Figma / Excalidraw / tldraw** than to **PowerPoint**.

Tested with at least 3 real coaches before Phase 1 is considered done.

---

## Design System

Token extraction is part of this phase since the canvas depends on it.

- [ ] Extract design tokens from `packages/design/drill-composer.pen` into a local module in `apps/web` (no `packages/ui` yet)
  - colors, typography, spacing, radius, shadows
- [ ] Hockey-specific tokens: team-a / team-b colors, path stroke styles per kind, zone fill alpha
- [ ] Minimal primitives inline in `apps/web/components/`: `Button`, `IconButton`, `Popover`, `Tabs`, `Tooltip`

If a second app ever appears, the tokens get extracted into `packages/ui` then. Not before.

---

## Definition of Done

- [ ] All editing tools shipped and meet the quality bar
- [ ] Frames work end-to-end
- [ ] All performance targets pass in CI
- [ ] At least 3 real coaches met the manual acceptance criteria
- [ ] PWA install works on iOS Safari, Android Chrome, and desktop Chrome
- [ ] PNG export produces clean images
- [ ] Drills persist across browser sessions reliably
- [ ] Drill JSON shape is identical to what Phase 2 will sync to the cloud — no breaking migration needed

Next: [Phase 2 — Auth, Cloud, Sharing](./2-auth-cloud-sharing.md)
