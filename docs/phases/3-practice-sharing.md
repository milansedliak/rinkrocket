# Phase 3 — Practice and Sharing Polish

Status: `[ ]` not started
Depends on: [Phase 2](./2-canvas.md)
Target duration: 2–3 weeks

## Goal

Coaches don't share single drills in a vacuum — they share **practice plans**. This phase wraps the canvas in just enough surrounding product to make a practice useful.

This is **not** a full practice planner. Practices in MVP are intentionally simple: an ordered list of drills, nothing more.

---

## Scope

### Practice Model

- [ ] DB schema: `practices (id, owner_id, name, description, duration_sec, drill_ids text[], created_at, updated_at)`
- [ ] RLS: owner read/write; public read via share link
- [ ] Practices reference drills by ordered id array — no join table

### Practice CRUD

- [ ] `/app/practices` — list of my practices
- [ ] `/app/practices/[id]` — practice detail page
- [ ] Create a new practice
- [ ] Add a drill (existing drill from library)
- [ ] Remove a drill
- [ ] Reorder drills (drag handle)
- [ ] Edit practice name, description, duration

### Drill Reuse

- [ ] A drill can be referenced by multiple practices
- [ ] Editing a drill updates everywhere it appears
- [ ] Confirmation if deleting a drill that is referenced by practices

### Practice Sharing

- [ ] One-click share generates a public link
- [ ] `/p/[token]` renders the practice read-only:
  - practice header (name, description, duration)
  - ordered list of drills
  - each drill is expandable with frame stepper
  - mobile-friendly
  - no login required

### PNG Export

- [ ] Export current drill frame as PNG
- [ ] Export all drill frames as a single tall PNG (or grid)
- [ ] Export uses the same renderer as the canvas (no separate codepath)

### Drill Library Polish

- [ ] Drill list shows thumbnails (rendered + cached in Supabase storage)
- [ ] Search by name
- [ ] Filter by tag
- [ ] Sort by recently edited
- [ ] Bulk delete

---

## Explicitly Out of Scope

- Per-drill notes inside a practice (post-MVP)
- Per-drill duration overrides inside a practice (post-MVP)
- PDF export (post-MVP, see `later.md`)
- Practice templates (post-MVP)
- Native mobile apps (post-MVP)
- Teams, invites, shared libraries (post-MVP)

---

## Definition of Done

- [ ] A coach can build a 5-drill practice in under 5 minutes
- [ ] The shared practice URL renders correctly on phone, tablet, and desktop
- [ ] PNG export produces a clean image suitable for text/email
- [ ] At least 3 coaches from Phase 0 build a real practice they would use

Next: [Phase 4 — Launch](./4-launch.md)
