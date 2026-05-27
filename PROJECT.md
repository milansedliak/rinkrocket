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

The MVP is delivered across phases. The **canvas itself ships first**, locally, with no auth and no backend. Everything else wraps that core.

### Phase 1 — local canvas (the actual product)
1. Drill composer with multi-frame support
2. All MVP elements: player, puck, cone, path, zone, text
3. Rink coordinate system + anchors
4. Undo/redo, pan/zoom, snap
5. Local drill library (IndexedDB)
6. PNG export
7. PWA install
8. Runs without sign-in

### Phase 2 — cloud + sharing
9. Email auth (optional; anonymous use stays supported)
10. Cloud-backed drill library
11. Read-only shareable drill links

### Phase 3 — practices and polish
12. Practice planner (ordered list of drills)
13. Shareable practice links
14. Library search / filter / sort

### Out of scope (deferred post-MVP)
- PDF export (PNG only in MVP)
- Native mobile/tablet apps (web + PWA covers mobile in MVP)
- Teams, roles, invites
- Real-time collaboration
- Animation, playback, simulation
- Public drill discovery
- Marketplace
- Player and parent training hub

AI features (Phase 5) ship after MVP launches. The AI-readiness foundations are built into Phase 1.

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

## Success Criteria

### Phase 1 done (canvas only)
- 3 real coaches successfully use the local-only canvas
- Each builds a multi-frame drill that survives a browser restart
- Each meets the manual acceptance criteria from `docs/specs/canvas-ux.md`

### MVP done (Phase 4 launch)
- 5 real coaches each create at least one drill without help
- Each coach successfully shares a drill link with at least one other person
- The shared link renders correctly on phone, tablet, and desktop browsers
- The most common feedback is feature requests, not "this doesn't work"

## First Milestone — The Canvas

The first thing we ship is the canvas itself. No login. No backend. No accounts.

A coach visits the URL and immediately:

1. Sees a clean rink and a tool palette
2. Places players, pucks, and a path in seconds
3. Adds and duplicates frames
4. Exports a PNG
5. Closes the tab and comes back tomorrow — the drill is still there

That is Phase 1 done. Everything else — sign-in, cloud sync, shareable links, practice planner — wraps this core in later phases and **does not change the canvas**.

## References

- Drill data model: `docs/specs/drill-system.md`
- Canvas UX and quality bar: `docs/specs/canvas-ux.md`
- AI / agent integration: `docs/specs/ai-interface.md`
- Phased delivery plan: `BACKLOG.md`
- Open decisions: `docs/decisions.md`
- Risk register: `docs/risks.md`
- Composer UI design: `packages/design/drill-composer.pen`
