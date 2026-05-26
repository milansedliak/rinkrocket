# RinkRocket

## Project Vision

RinkRocket is a cross-platform hockey coaching and player development platform.

The first product wedge is the fastest way for coaches to create, organize, and share hockey practices and drills.

Long-term, RinkRocket becomes:
- a dynamic drill simulation platform
- a practice planning tool
- a player development tracker
- a parent/player training hub
- a hockey gear and team apparel marketplace

## Product Strategy

The product is built in two stages so we ship something useful before tackling the hardest problems.

### Stage 1 — Drill Composer (MVP)

A canvas-based drill editor inspired by Figma and Excalidraw, with hockey-specific primitives. Drills are composed of one or more **frames** (steps), each containing static elements (players, cones, pucks, paths, zones, labels) on a rink.

Stage 1 is **not** a simulation. It is a fast, modern visual drill builder with multi-step support.

### Stage 2 — Drill Simulation (post-MVP)

Once the static drill builder has real users, evolve drills into behavior-driven simulations:
- entities with state
- timeline
- behaviors
- events
- playback

The Stage 1 data model is designed to extend into Stage 2 without rewrites (frames become keyframes, elements gain behavior bindings).

## MVP Scope

### In scope
1. Email auth
2. Drill library (per user)
3. Practice planner (a practice is an ordered list of drills)
4. Drill composer with multi-frame support
5. Read-only shareable practice links
6. Export drill or practice to image / PDF

### Out of scope (deferred to post-MVP)
- Teams, roles, invites
- Real-time collaboration
- Animation / playback / simulation
- Marketplace
- AI-generated drills
- Public drill discovery
- Player and parent training hub

## Platform Strategy

The product must eventually ship on web, iOS, Android, tablets, and PWA. For MVP we ship in this order:

1. **Web app first** (Next.js). The drill composer is a desktop-class canvas tool, and web is the fastest, lowest-risk surface for a Figma-style editor.
2. **Mobile and tablet viewer** (Expo + React Native). View and share practices on phone and tablet. Editing on mobile comes later.
3. **Mobile editing**. Post-MVP.

This ordering avoids fighting React Native canvas limitations during the riskiest phase of the product.

## Tech Stack

- Next.js for the web app, marketing site, and shared practice pages
- Expo + React Native for mobile and tablet
- React Native Web where it makes sense for shared UI
- Supabase for auth, database, and storage
- TypeScript everywhere
- pnpm workspaces + Turborepo

## Brand

Use `RinkRocket` as the main brand.

## Architecture

Monorepo:

- `apps/web` — Next.js app (drill composer, marketing, shared pages)
- `apps/app` — Expo app (mobile and tablet viewer in MVP)
- `packages/core` — shared domain types, drill model, rink coordinate system
- `packages/ui` — design tokens and shared UI primitives
- `packages/api` — Supabase client and typed API helpers
- `packages/canvas` — drill canvas engine (rendering, input, frame state)
- `packages/design` — Pencil design files

## Constraints

- TypeScript everywhere
- Drill builder stays simple in MVP (no animation, no behaviors)
- Drill data model is versioned from day one
- Drill rendering is deterministic given a `CanvasState`
- Web-first; mobile editor comes later

## Success Criteria for MVP

The MVP is "done" when:
- 5 real coaches each create at least one practice without help
- Each practice contains at least 2 drills
- Each practice has been opened via its share link by at least one other person
- The shared link works on phone, tablet, and desktop browsers
- The most common feedback is feature requests, not "this doesn't work"

## First Milestone: Vertical Slice

End-to-end working flow with intentionally minimal UI:

1. Coach signs in
2. Creates a practice
3. Creates one drill with a few players, a puck, and a path
4. Generates a share link
5. Anyone with the link opens the practice and sees the drill

Everything else builds on top of this slice.

## References

- Drill system specification: `docs/specs/drill-system.md`
- Backlog and milestones: `BACKLOG.md`
- Drill composer design: `packages/design/drill-composer.pen`
