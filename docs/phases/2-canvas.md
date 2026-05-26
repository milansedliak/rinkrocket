# Phase 2 — Canvas MVP

Status: `[ ]` not started
Depends on: [Phase 1](./1-vertical-slice.md)
Target duration: 4–6 weeks

> **This is the phase that wins or loses the product.** The canvas is the core differentiator. Everything in this phase is measured against the quality bar in `docs/specs/canvas-ux.md`. If a feature ships but does not meet that bar, it does not count.

---

## Goal

Take the wired-up vertical slice from Phase 1 and make the canvas **best-in-class** for hockey drill creation. By the end of this phase, a coach should prefer RinkRocket over every existing drill tool on the market.

---

## Scope

### Editing Tools (full MVP element set)

- [ ] Select tool
- [ ] Hand (pan) tool
- [ ] Player tool (team-a / team-b, optional jersey number, optional role)
- [ ] Puck tool
- [ ] Cone tool
- [ ] Path tool (skate / pass / shot)
- [ ] Zone tool (rect / ellipse)
- [ ] Text tool

### Canvas Behavior

- [ ] Pan (spacebar-drag, middle-mouse, Hand tool)
- [ ] Zoom (wheel, pinch, keyboard)
- [ ] Fit-to-screen (`0` / `F`)
- [ ] Snap-to-grid (5 ft), toggle in header
- [ ] Snap-to-element + snap-to-rink-marking
- [ ] Multi-select via shift-click and marquee
- [ ] Drag-to-move with live update
- [ ] Resize handles on zones
- [ ] Rotate handles on players, zones, text
- [ ] Inline path-point editing
- [ ] Delete via `Delete` / `Backspace`

### Tool Modes and Shortcuts

- [ ] All keyboard shortcuts from `canvas-ux.md`
- [ ] Tool palette (left rail) visible at all times
- [ ] Spacebar-held = temporary Hand tool
- [ ] `Esc` returns to Select
- [ ] Tool stays active after placing (does not auto-switch to Select)

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
- [ ] Frame thumbnails update live as canvas changes
- [ ] Drag-to-reorder frames

### Undo / Redo

- [ ] `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z`
- [ ] At least 50 ops of history
- [ ] Frame structure changes are part of history

### Save

- [ ] Debounced 750 ms
- [ ] Forced on frame switch, tool switch to Select, window blur, navigation
- [ ] "Saving…" / "Saved" indicator in header
- [ ] Retry with backoff; unobtrusive error after 3 failures

### Empty States

- [ ] Empty drill: clean rink, palette visible, single hint text
- [ ] No modal walkthroughs, no tutorials, no product tours

### Sharing UX

- [ ] One-click "Share" in header opens popover with copy-ready link
- [ ] Revoke + regenerate inside the popover
- [ ] Shared view is read-only, mobile-friendly, no app chrome
- [ ] Shared view has a frame stepper if drill has > 1 frame

### AI-readiness foundations (built here, used in Phase 5)

These are functionally useful for the editor itself (anchor snapping, undo via patches) and also unblock Phase 5.

- [ ] Rink anchor catalog + resolver in `packages/core/src/rink/anchors.ts`
  - Implements every anchor in `docs/specs/drill-system.md#rink-anchors`
  - Anchor positions correct for `full`, `half`, and `zone` views
- [ ] Editor snap-to-anchor while dragging (uses the same resolver)
- [ ] Tool surface complete in `apps/web/server/tools/`:
  - drill / frame / element CRUD via typed Server Actions
  - `applyDrillPatch` implementation
  - `validateDrill` returns structured `Issue[]`
- [ ] Undo/redo system uses `DrillPatch` operations as its history entries (one history model for users *and* AI)
- [ ] Schema export endpoints at `/api/ai/schema/*` (drill, element, anchors, tools, version)
- [ ] Public `apps/web/app/(marketing)/docs/ai` page (placeholder, fleshed out in Phase 4)

See `docs/specs/ai-interface.md` for the full plan.

### Mobile / Tablet Web (read-only)

- [ ] App is responsive on phones and tablets
- [ ] Shared drill view works flawlessly on mobile browsers
- [ ] Editor on touch shows a "view-only on mobile" notice (not a broken editor)
- [ ] App is installable as a PWA

---

## Performance Targets (CI-enforced)

A benchmark fixture lives in `apps/web/test/perf/`. CI fails if any target is missed.

| Metric                                   | Target            |
| ---------------------------------------- | ----------------- |
| Cold load TTI on broadband desktop       | < 2.0 s           |
| Drag frame time, 50 elements             | < 16 ms (60 fps)  |
| Pan/zoom frame time, 4 frames            | < 16 ms           |
| Input-to-paint on tool action            | < 50 ms           |
| Save round-trip p95                      | < 500 ms          |

---

## Quality Bar (manual acceptance — from `canvas-ux.md`)

1. A coach who has never seen the product places 5 players, 1 puck, and 1 skate path **in under 30 seconds** without help.
2. They duplicate the frame and move 2 players for Frame 2 **in under 15 seconds**.
3. They generate a share link, open it on their phone, drill renders correctly **in under 10 seconds**.
4. They do **not** ask "how do I save?"
5. They do **not** ask "how do I delete?"
6. They describe the product as closer to **Figma / Excalidraw / tldraw** than to **PowerPoint**.

Tested with at least 3 of the coaches recruited in Phase 0.

---

## Design System

Token extraction is part of this phase since the canvas depends on it.

- [ ] Extract design tokens from `packages/design/drill-composer.pen` into a local module in `apps/web` (no `packages/ui` yet)
  - colors
  - typography
  - spacing
  - radius
  - shadows
- [ ] Define hockey-specific tokens: team-a / team-b colors, path stroke styles per kind, zone fill alpha
- [ ] Build minimal primitives inline in `apps/web/components/`: `Button`, `IconButton`, `Popover`, `Tabs`, `Tooltip`

If a second app ever appears, the tokens get extracted into `packages/ui` then. Not before.

---

## Definition of Done

- [ ] All editing tools shipped and meet quality bar
- [ ] Frames work end-to-end
- [ ] All performance targets pass in CI
- [ ] At least 3 coaches from Phase 0 cohort tested the editor and met the manual acceptance criteria
- [ ] PWA install works on iOS Safari, Android Chrome, and desktop Chrome
- [ ] Share view passes Lighthouse mobile Performance > 90

Next: [Phase 3 — Practice and Sharing Polish](./3-practice-sharing.md)
