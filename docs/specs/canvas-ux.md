# RinkRocket – Canvas UX Specification

This document defines the **quality bar** for the drill canvas — the core feature of the product.

If we are not best-in-class on the things in this document, the product fails. Everything in `BACKLOG.md` exists to support the canvas. The canvas is the product.

## Product Thesis

The drill canvas wins on three dimensions:

1. **Speed.** A coach can draw a usable drill in **under 60 seconds**, with no tutorial.
2. **Sharing.** Any drill is shareable with **one click**, viewable on any device, no login required.
3. **Extensibility.** The canvas sits on a typed, rink-relative data model so animation, simulation, AI generation, and templates can be built on top **without rewrites**.

Every interaction below is measured against these three.

---

## Performance Targets (non-negotiable)

| Metric                                   | Target            |
| ---------------------------------------- | ----------------- |
| Time-to-first-interactive (cold load)    | < 2.0 s on broadband desktop |
| Time-to-first-drill (new user, first drill saved) | < 60 s median |
| Frame time during drag with 50 elements  | < 16 ms (60 fps)  |
| Frame time during pan/zoom on 4-frame drill | < 16 ms        |
| Input-to-paint latency on tool actions   | < 50 ms           |
| Save round-trip (debounced)              | < 500 ms p95      |

These are tested in CI on a representative drill fixture.

---

## Tool Model

The canvas uses **explicit tool modes** to eliminate gesture ambiguity. Only one tool is active at a time.

| Tool       | Shortcut | Behavior                                              |
| ---------- | -------- | ----------------------------------------------------- |
| Select     | `V`      | Click to select, drag to move, marquee to multi-select |
| Hand (pan) | `H`      | Drag to pan the canvas                                |
| Player     | `P`      | Click to place a player; cycles team on subsequent clicks while held |
| Puck       | `K`      | Click to place a puck                                 |
| Cone       | `C`      | Click to place a cone                                 |
| Path       | `L`      | Click to start, click to add points, double-click or `Enter` to finish |
| Zone       | `Z`      | Drag to draw a zone rectangle (hold `Shift` for ellipse) |
| Text       | `T`      | Click to drop, immediately enter edit mode            |

**Rules:**
- After placing a primitive, the canvas does **not** auto-switch to Select. The current tool stays active so coaches can place multiple players in a row.
- `Esc` always returns to Select.
- Spacebar held = temporary Hand tool. Release returns to previous tool.
- Tool palette is always visible (left rail in the design).

---

## Pan, Zoom, Snap

- **Zoom**: mouse wheel, pinch, or `+` / `-` keys. Range 25% – 400%.
- **Pan**: spacebar-drag, middle-mouse-drag, or Hand tool.
- **Fit-to-screen**: `0` or `F` shortcut.
- **Snap-to-grid**: off by default, toggle in header. Grid is 5 ft. Hold `Alt` to bypass snap while a snap is active.
- **Snap-to-element**: snap to other element centers and to rink markings (faceoff dots, blue/red lines, hash marks) when within 2 px tolerance.

---

## Selection Model

- Click an element to select it.
- `Shift`-click to add/remove from selection.
- Marquee-drag (Select tool, empty area) to select a region.
- `Cmd/Ctrl + A` selects all elements in the current frame.
- `Esc` clears selection.
- Selection is **per-frame**. Switching frames clears the selection.

Selected elements show:
- 8-px-tolerance handle for move (any selected element)
- Rotate handle (for `Player`, `Zone`, `Text`)
- Resize handles (for `Zone` only)
- Inline path-point handles (for selected `Path`)

---

## Editing Primitives

### Players
- Default team alternates as you place (A, B, A, B…) — fast for setting up matchups.
- Hold `Shift` while placing to lock current team.
- Number is editable inline by selecting and pressing any digit.
- `R` rotates the player in 15° increments.

### Pucks and cones
- Click to place. No additional state.

### Paths
- Click to start. Each subsequent click adds a point. `Enter` or double-click finishes.
- `Backspace` while drawing removes the last point.
- `Esc` while drawing cancels.
- After finishing, points can be edited inline via handles.
- `1` / `2` / `3` while drawing switches between skate / pass / shot.

### Zones
- Drag to draw rectangle.
- Hold `Shift` while drawing to make it an ellipse.
- Resize via corner handles.
- `R` rotates in 15° increments.

### Text
- Click to drop, immediately enters edit mode with cursor focused.
- `Esc` or click-away commits.
- Size is `sm` / `md` / `lg`, set via inspector.

---

## Frames (multi-step drills)

The frame filmstrip is the second-most-important UI after the canvas itself.

- Frames are shown as thumbnails along the bottom.
- Click a frame thumbnail to switch to it.
- `Cmd/Ctrl + ←` / `→` switches frames.
- "+" button at end adds an empty frame.
- Right-click (or long-press on tablet) on a frame thumbnail: **Duplicate**, **Delete**, **Rename**.
- Drag a frame thumbnail to reorder.
- The active frame is editor state; it is not persisted in the drill.

**Duplicate-and-edit is the primary multi-step pattern.** Coaches build Frame 2 by duplicating Frame 1 and moving things. This must feel instant.

---

## Undo / Redo

- `Cmd/Ctrl + Z` undo.
- `Cmd/Ctrl + Shift + Z` (or `Cmd/Ctrl + Y` on Windows) redo.
- Undo history is scoped per-drill, **not** per-frame.
- Frame structure changes (add/duplicate/delete/reorder) are part of the same history as element edits.
- History depth: at least 50 operations.

---

## Save Behavior

- The drill JSON is the source of truth.
- Saves are debounced 750 ms after the last change, and forced on:
  - Frame switch
  - Tool switch from any drawing tool to Select
  - Window blur
  - Navigation away
- A subtle "Saved" / "Saving…" indicator lives in the header.
- A failed save retries with backoff and surfaces an unobtrusive error after 3 failures.

---

## Sharing UX

One-click sharing is a core selling point. It must feel like Loom or tldraw, not like a CMS.

- A "Share" button in the header opens a small popover.
- Default state: shows a copy-ready link, already generated.
- Optional: "Revoke link" creates a new one and invalidates the old.
- Shared view is read-only:
  - Renders the drill on a clean page (no app chrome).
  - Frame stepper if the drill has >1 frame.
  - "Open in RinkRocket" CTA for coaches.
  - Mobile-friendly by default.

---

## Touch and Mobile Web

Mobile is **read-only in MVP**. The web app is responsive so the shared view works perfectly on phones and tablets, but editing on touch is not supported until post-MVP.

Editing-on-touch requires its own design pass (gesture conflicts, tool palette ergonomics, on-screen keyboard impact). We avoid that work in MVP.

---

## Accessibility

- Every tool has a keyboard shortcut.
- Every interactive element is reachable by `Tab`.
- Focus rings are visible.
- Color is never the sole signal (team-a vs team-b also differ in shape/glyph).
- Shared view passes WCAG AA contrast on rink markings and elements.

---

## Empty States

The empty drill state is the **single most important screen** in the product. It's the first thing a new coach sees.

- A clean rink is rendered in the center.
- The tool palette is visible on the left.
- A short hint: "Press `P` to place a player, or pick a tool from the left."
- No modal walkthrough. No tutorial popup. Coaches learn by doing.

---

## Quality Bar — How We Know It's Good

A drill canvas passes the bar when:

1. A coach who has never seen the product places 5 players, 1 puck, and 1 skate path **in under 30 seconds** without help.
2. They successfully duplicate the frame and move 2 players for Frame 2 **in under 15 seconds**.
3. They generate a share link, open it on their phone, and the drill renders correctly **in under 10 seconds**.
4. They do **not** ask "how do I save?" — it's automatic.
5. They do **not** ask "how do I delete?" — Delete/Backspace just works.
6. The product feels closer to **Figma / Excalidraw / tldraw** than to **PowerPoint / Word**.

If we fail any of these, we fix the canvas before adding features.

---

## Anti-goals (things we explicitly will not do)

- Layer panels. The model is flat by design.
- Component libraries / symbols. Use duplicate-frame instead.
- Right-click menus as primary interaction. Keyboard shortcuts and direct manipulation are primary.
- Toolbars that change based on selection. The tool palette is stable.
- Modal dialogs for editing element properties. Use an always-visible inspector.
- Tutorials, onboarding flows, or product tours in MVP. Discoverability comes from interaction design, not from popups.

---

## References

- Data model: `drill-system.md`
- Visual design: `packages/design/drill-composer.pen`
- Phased delivery: `BACKLOG.md`
