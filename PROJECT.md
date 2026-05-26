# RinkRocket

## Vision

RinkRocket is a cross-platform hockey coaching and player development platform.

The first product wedge is the **best hockey drill builder on the market** — fast, beautiful, and easy to share.

Long-term, RinkRocket becomes:
- a dynamic drill simulation platform
- a practice planning tool
- a player development tracker
- a parent and player training hub
- a hockey gear and team apparel marketplace

## Core Differentiator

The drill canvas is **the product**. Everything else (auth, library, sharing, practices, AI) exists to support it.

We win this category if the canvas is better than every existing hockey drill tool on three dimensions:

1. **Speed** — a coach can draw a usable drill in under 60 seconds. No menus, no friction, no learning curve.
2. **Sharing** — a drill or practice is shareable with one click, viewable on anything (phone, tablet, desktop), no login required.
3. **Extensibility** — the underlying data model is structured (rink-relative coordinates, typed primitives, anchored positions) so animation, simulation, AI generation, and templates can be built on top of it without rewrites.

If we are not better than the competition on these three things, the rest doesn't matter.

## Two Equal Users

The drill system has two first-class consumers:

1. **Hockey coaches** clicking on the canvas.
2. **AI agents** producing structured drill data (in-app AI assist and external agents via MCP).

Both go through the same data model and the same tool surface. There is no parallel "AI-only" path. This constraint is what keeps the data model clean — anything an AI can do, a coach can do, and vice versa.

The AI-ready foundations (validation, anchors, tool surface, schema export) are built into MVP so AI-powered features can land quickly in Phase 5. See `docs/specs/ai-interface.md`.

## Product Strategy

The product ships in two stages so we deliver value before tackling the hardest problems.

### Stage 1 — Drill Composer (MVP)

A canvas-based drill editor inspired by Figma and Excalidraw, with hockey-specific primitives. Drills are composed of one or more **frames** (steps), each containing static elements (players, pucks, cones, paths, zones, labels) on a rink.

Stage 1 is **not** a simulation. It is a fast, modern visual drill builder with multi-step support.

### Stage 2 — Drill Simulation (post-MVP)

Once the static drill builder has real users, evolve drills into behavior-driven simulations: entities with state, timelines, behaviors, events, and playback. The Stage 1 data model is designed to extend into Stage 2 without rewrites (frames become keyframes, elements gain behavior bindings).

## MVP Scope

The MVP is intentionally narrow. Anything not on this list is post-MVP.

### In scope
1. Email auth
2. Drill library (per user)
3. Drill composer with multi-frame support
4. Read-only shareable drill links

### Out of scope (deferred)
- Practice planner (separate post-MVP phase, see `docs/phases/3-practice-sharing.md`)
- PDF export (PNG only in MVP)
- Native mobile/tablet apps (web + PWA covers mobile in MVP)
- Teams, roles, invites
- Real-time collaboration
- Animation, playback, simulation
- AI-generated drills
- Public drill discovery
- Marketplace
- Player and parent training hub

## Platform Strategy

The product must eventually ship on web, iOS, Android, tablets, and PWA. For MVP:

- **One web app** (Next.js) is the only product surface.
- It is **responsive** and installable as a **PWA**, so phone and tablet users can use it without a native app.
- Native iOS and Android apps come after MVP, once we know what we are wrapping.

This removes an entire native app from scope and lets us focus everything on the canvas.

## Tech Stack

- **Next.js** — product app, marketing routes, and shared drill pages
- **Supabase** — auth, Postgres database, storage
- **TypeScript** — everywhere
- **pnpm workspaces** — monorepo (Turborepo deferred until we actually have multiple apps)

## Brand

Use `RinkRocket` as the main brand.

## Architecture

Monorepo (intentionally minimal day one):

- `apps/web` — Next.js app (drill composer, marketing, shared pages)
- `packages/core` — shared domain types, drill model, rink coordinate system, migrations
- `packages/design` — Pencil design files

Additional packages (`packages/ui`, `packages/api`, `packages/canvas`) are added **only when they earn their existence** by having a second consumer. Premature extraction is forbidden.

## Constraints

- TypeScript everywhere
- Drill data model is versioned from day one (`schemaVersion`)
- Drill rendering is deterministic given a `CanvasState`
- Canvas quality bar is non-negotiable (see `docs/specs/canvas-ux.md`)
- Web-only in MVP; native apps come later

## Success Criteria for MVP

The MVP is "done" when:
- 5 real coaches each create at least one drill without help
- Each coach successfully shares a drill link with at least one other person
- The shared link renders correctly on phone, tablet, and desktop browsers
- Median time from "new drill" to "shared link" is under 3 minutes
- The most common feedback is feature requests, not "this doesn't work"

## References

- Drill data model: `docs/specs/drill-system.md`
- Canvas UX and quality bar: `docs/specs/canvas-ux.md`
- AI / agent integration: `docs/specs/ai-interface.md`
- Phased delivery plan: `BACKLOG.md`
- Open decisions: `docs/decisions.md`
- Risk register: `docs/risks.md`
- Composer UI design: `packages/design/drill-composer.pen`
