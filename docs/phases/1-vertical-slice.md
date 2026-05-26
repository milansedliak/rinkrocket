# Phase 1 — Vertical Slice

Status: `[ ]` not started
Depends on: [Phase 0](./0-validate.md)
Target duration: 1–2 weeks

## Goal

Get **one end-to-end flow** working with intentionally minimal UI:

1. Coach signs in
2. Creates a drill
3. Places **one player** on the rink
4. Saves
5. Generates a share link
6. Anyone opens the link and sees the drill

This phase is about **wiring all the pipes** — auth, data, render, share — not about features. The canvas in this phase has exactly one tool. Everything else is Phase 2.

---

## Scope

### In scope
- Minimal Next.js app (one app, one package)
- Email auth via Supabase
- Postgres schema for `profiles`, `drills`, `share_links`
- Drill list page (very basic)
- Drill editor page (one tool: place player)
- Drill save (debounced JSON write)
- Share link generation and read-only view

### Out of scope (Phase 2 or later)
- Other element types (puck, cone, path, zone, text)
- Frames (Phase 1 drills have exactly one frame, implicit)
- Pan / zoom / undo
- Practice planner
- PNG export
- PWA install
- Production polish

### AI-readiness foundations (built here, used in Phase 5)
- [ ] Zod schemas for `Drill`, `Frame`, `PlayerElement` (the only element in Phase 1)
- [ ] Tool surface scaffolded as typed Server Actions in `apps/web/server/tools/`:
  - `createDrill`, `getDrill`, `addElement`, `validateDrill`
- [ ] The editor UI calls the same Server Actions as future AI agents — no parallel path
- [ ] `DrillPatch` type defined in `packages/core` (not yet applied; sets the shape)

See `docs/specs/ai-interface.md` for the full plan.

---

## Repo Setup (do once, here)

- [ ] Initialize pnpm workspace at repo root
- [ ] Create `apps/web` (Next.js, App Router, TypeScript)
- [ ] Create `packages/core` with the types from `docs/specs/drill-system.md`
- [ ] Shared `tsconfig` base
- [ ] ESLint + Prettier
- [ ] `.env` template with Supabase placeholders
- [ ] GitHub repo with branch protection on `main`
- [ ] GitHub Actions CI: typecheck, lint, build on PR

**Explicitly not done in Phase 1:** Turborepo, `packages/ui`, `packages/api`, `packages/canvas`, Sentry, PostHog, Storybook, Expo app. Defer until a real consumer appears.

---

## Backend (Supabase)

- [ ] Create Supabase project
- [ ] Enable email auth (magic link or password — decision in `docs/decisions.md`)
- [ ] Schema:
  - `profiles (id uuid pk, email text, created_at)`
  - `drills (id uuid pk, owner_id uuid fk, name text, canvas_state jsonb, schema_version int, rink_view text, created_at, updated_at)`
  - `share_links (id uuid pk, resource_type text, resource_id uuid, token text unique, created_at, revoked_at)`
- [ ] RLS:
  - `drills`: read/write only by owner
  - `drills`: public read **only** when a matching unrevoked `share_links` row exists
  - `share_links`: read/write only by drill owner; public can lookup by token
- [ ] Smoke RLS test that proves user B cannot read user A's drill without a share link

---

## Frontend (Next.js)

- [ ] Routes:
  - `/` — placeholder landing
  - `/login` — email auth
  - `/app/drills` — list of my drills
  - `/app/drills/[id]` — editor
  - `/d/[token]` — read-only shared drill
- [ ] Editor:
  - Renders a rink SVG (full view)
  - One tool: place player
  - Saves debounced 750 ms
- [ ] Share button in editor header: generates a share link, copies it to clipboard
- [ ] `/d/[token]` page renders the drill JSON read-only

---

## Acceptance Criteria

A new user can, from a cold browser:

1. Sign up with email
2. Click "New drill"
3. Click on the rink three times to place three players
4. Wait one second
5. Click "Share" and copy the link
6. Open the link in an incognito window
7. See the drill rendered correctly with all three players

If any of those steps require explanation, Phase 1 is not done.

---

## Definition of Done

- [ ] All routes work in production deploy (Vercel)
- [ ] Smoke test in CI runs the above flow against a preview deploy
- [ ] Canvas places a player within 50 ms of click
- [ ] Share link page passes Lighthouse Performance > 90 on mobile

Next: [Phase 2 — Canvas MVP](./2-canvas.md)
