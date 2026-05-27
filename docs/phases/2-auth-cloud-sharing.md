# Phase 2 — Auth, Cloud, Sharing

Status: `[ ]` not started
Depends on: [Phase 1](./1-canvas.md)
Target duration: 2–3 weeks

## Goal

Wrap the Phase 1 canvas in a real product surface: optional sign-in, cloud persistence, and shareable drill links. The canvas itself doesn't change — this phase is plumbing.

The Phase 1 canvas keeps working without auth. Sign-in is a strict upgrade: signed-in users get cloud sync, a library across devices, and the ability to share. Anonymous use stays supported.

---

## Scope

### Auth

- [ ] Set up Supabase project
- [ ] Email auth (magic link as default — pending ADR)
- [ ] `profiles` table with id, email, created_at
- [ ] Sign-in page is a single screen, opt-in (a button in the header, not a wall)
- [ ] Anonymous users can still build drills locally; "Sign in to sync" CTA appears when they have ≥ 1 drill

### Drill schema in Supabase

- [ ] `drills` table: `id uuid pk, owner_id uuid fk, name text, canvas_state jsonb, schema_version int, rink_view text, created_at, updated_at`
- [ ] RLS: read/write only by owner
- [ ] Optimistic concurrency via `updated_at`

### Local → cloud migration

- [ ] On first successful sign-in, IndexedDB drills are uploaded to Supabase under the new account
- [ ] Migration is idempotent (re-runs are safe)
- [ ] Original local copies are kept until the migration confirms cloud writes
- [ ] After successful migration, IndexedDB becomes an offline cache, not the source of truth

### Cloud-backed library

- [ ] `/app/drills` shows the user's drills from Supabase
- [ ] Create / open / delete / duplicate / rename
- [ ] Offline support: cached drills viewable when offline; edits queue for sync

### Sharing

- [ ] `share_links` table: `id, resource_type ('drill'), resource_id, token (opaque, 21+ char NanoID), created_at, revoked_at`
- [ ] Multiple share links allowed per drill (per ADR / spec)
- [ ] One-click "Share" in the editor header opens a popover with a copy-ready link
- [ ] "Revoke link" creates a fresh token and invalidates the old one
- [ ] Public route `/d/[token]` renders the drill read-only
- [ ] Share view is mobile-first; frame stepper if > 1 frame
- [ ] Share view contains a small "Open in RinkRocket" CTA
- [ ] RLS allows public read of drills only via a valid unrevoked share link

### Tool surface upgrade

The tool surface from Phase 1 (client-side, IndexedDB-backed) gets a server-backed variant.

- [ ] Implement Server Actions in `apps/web/server/tools/` that mirror the Phase 1 client tool surface
- [ ] Signed-in users use the server tools; anonymous users keep using the local tools
- [ ] Both implementations satisfy the same TypeScript interface (so AI assist in Phase 5 doesn't care which is active)

### Security / RLS

- [ ] Cross-user isolation test suite: user B cannot read user A's drill without a share link
- [ ] Public share view enforces token validity (unrevoked, exists)
- [ ] Rate-limit share-link creation per user (cheap CSPRNG-backed tokens, but prevent abuse)
- [ ] Rate-limit auth endpoints

---

## Acceptance Criteria

From a cold browser, a signed-out user can:

1. Build a 5-element drill in the canvas
2. Click "Sign in to sync"
3. Sign in with email
4. See their drill appear in their library
5. Click "Share" and copy the link
6. Open the link in an incognito window on a phone and see the drill render correctly

If any step requires explanation, Phase 2 is not done.

---

## Definition of Done

- [ ] All acceptance criteria pass on a real production deploy (Vercel)
- [ ] Smoke test in CI runs the above flow against a preview deploy
- [ ] RLS audit test suite passes
- [ ] Local → cloud migration is run-once safe and validated against a fixture user with 20 drills
- [ ] Share-link page passes Lighthouse mobile Performance > 90
- [ ] Anonymous (no sign-in) experience from Phase 1 still works exactly as it did

Next: [Phase 3 — Practices and Polish](./3-practice-sharing.md)
