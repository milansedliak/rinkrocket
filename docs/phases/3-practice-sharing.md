# Phase 3 — Practices and Library Polish

Status: `[ ]` not started
Depends on: [Phase 2](./2-auth-cloud-sharing.md)
Target duration: 2–3 weeks

## Goal

Coaches don't share single drills in a vacuum — they share **practice plans**. This phase wraps the canvas in just enough surrounding product to make a practice useful, and polishes the drill library so a coach with 30 drills can actually find what they need.

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

- [ ] Share links also support `resource_type: 'practice'` (schema already in place from Phase 2)
- [ ] One-click share generates a public link
- [ ] `/p/[token]` renders the practice read-only:
  - practice header (name, description, duration)
  - ordered list of drills
  - each drill is expandable with frame stepper
  - mobile-friendly
  - no login required

### Library Polish

- [ ] Drill list shows thumbnails (rendered + cached in Supabase storage)
- [ ] Search by name
- [ ] Filter by tag
- [ ] Sort by recently edited / alphabetical / created
- [ ] Bulk delete
- [ ] Bulk move-to-practice

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
- [ ] At least 3 real coaches build a real practice they would use
- [ ] Library handles 50+ drills without performance regression

Next: [Phase 4 — Launch](./4-launch.md)
