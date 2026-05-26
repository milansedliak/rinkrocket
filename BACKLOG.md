# RinkRocket Backlog

This backlog is the single source of truth for what is decided, in progress, and next. It is paired with `PROJECT.md` (vision and strategy) and `docs/specs/drill-system.md` (drill spec).

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[draft]` Drafted, not yet finalized
- `[?]` Needs decision

## Where We Stand

- `[draft]` Product vision in `PROJECT.md`
- `[draft]` Drill system spec in `docs/specs/drill-system.md`
- `[draft]` Drill composer UI design in `packages/design/drill-composer.pen`
- `[ ]` Coach validation conversations
- `[ ]` Repo scaffolded
- `[ ]` Backend configured
- `[ ]` First vertical slice working

## Guiding Principles

- Ship a thin vertical slice end-to-end before going wide.
- Web first for the drill composer; mobile is a viewer in MVP.
- Defer teams, animation, and AI until after MVP.
- Every milestone has a demoable outcome.
- The drill data model is versioned from day one.

---

## Milestone 0 — Validate and De-risk

Goal: don't build the wrong thing or hit an architectural wall.

- `[ ]` Talk to 3–5 hockey coaches about how they currently plan and share practices
- `[ ]` Identify must-have vs nice-to-have features from those conversations
- `[ ]` Time-boxed canvas spike: SVG drill canvas in Next.js with pan/zoom, place/move/delete a player and a puck on a rink background
- `[ ]` Decide canvas tech: plain SVG vs `react-konva` vs Skia (`@shopify/react-native-skia`)
- `[ ]` Confirm web-first ordering (currently the working assumption)

## Milestone 1 — Spec Locked

Goal: anyone can read the docs and understand exactly what we are building.

- `[~]` Reconcile vision: MVP is static canvas with frames; simulation is post-MVP
- `[ ]` Finalize `Drill`, `CanvasState`, `Frame`, `DrillElement` types
- `[ ]` Finalize `Practice`, `PracticeDrill`, `ShareLink` types
- `[ ]` Lock rink coordinate system (feet, origin, axes, supported views)
- `[ ]` Lock MVP element set (player, puck, cone, path, zone, text)
- `[ ]` Document data model versioning policy
- `[ ]` Document non-goals so scope creep is easy to push back on

## Milestone 2 — Repo and Tooling

Goal: a clean, runnable monorepo.

- `[ ]` Initialize pnpm workspace
- `[ ]` Add Turborepo
- `[ ]` Create `apps/web` (Next.js)
- `[ ]` Create `apps/app` (Expo, viewer-only for now)
- `[ ]` Create `packages/core` (types, drill model, rink coordinates, migrations)
- `[ ]` Create `packages/ui` (design tokens, primitives)
- `[ ]` Create `packages/api` (Supabase client, typed helpers)
- `[ ]` Create `packages/canvas` (rendering and input)
- `[ ]` Add shared TypeScript config
- `[ ]` Add ESLint and Prettier
- `[ ]` Set up GitHub repo with branch protection on `main`
- `[ ]` Set up GitHub Actions CI: typecheck, lint, build
- `[ ]` Add a minimal test setup (Vitest)
- `[ ]` Wire Sentry for error tracking
- `[ ]` Wire PostHog (or similar) for product analytics
- `[ ]` Set up environment strategy: `local`, `preview`, `prod`

## Milestone 3 — Backend Foundation

Goal: persist a drill and a practice.

- `[ ]` Create Supabase project
- `[ ]` Configure email auth
- `[ ]` Schema: `profiles`, `drills`, `practices`, `practice_drills`, `share_links`
- `[ ]` Row-level security: users can only read/write their own drills and practices
- `[ ]` Public read access for practices reachable via valid `share_links.token`
- `[ ]` Storage bucket for drill thumbnails
- `[ ]` Generate typed Supabase client into `packages/api`
- `[ ]` RLS test suite that proves users cannot read other users' drills

## Milestone 4 — Vertical Slice (the demo)

Goal: end-to-end flow with intentionally minimal UI.

- `[ ]` Login screen (email)
- `[ ]` Empty drill list screen
- `[ ]` "New drill" creates a drill with one empty frame
- `[ ]` Place a player, a puck, and a skate path on the canvas
- `[ ]` Save the drill
- `[ ]` Empty practice list screen
- `[ ]` "New practice" attaches an existing drill
- `[ ]` "Share" generates a public share link
- `[ ]` Public share page renders the practice and its drills (read-only) on web
- `[ ]` Demo this flow end-to-end and capture issues before going wider

## Milestone 5 — Drill Composer MVP

Goal: a canvas a coach actually wants to use.

- `[ ]` Translate Pencil design into real components
- `[ ]` Rink background renderer (full / half / neutral zone / offensive zone)
- `[ ]` Element palette (player, puck, cone, path, zone, text)
- `[ ]` Player team toggle (home / away / neutral) and jersey number
- `[ ]` Path drawing with skate / pass / shot styles
- `[ ]` Zone drawing (rect / ellipse) with fill and stroke
- `[ ]` Text labels
- `[ ]` Select, move, delete elements
- `[ ]` Multi-select (shift-click and marquee)
- `[ ]` Pan and zoom
- `[ ]` Undo / redo
- `[ ]` Frame filmstrip: add, duplicate, reorder, delete
- `[ ]` Save and reload `CanvasState`
- `[ ]` Drill thumbnail generation

## Milestone 6 — Practice and Sharing Polish

Goal: practices feel like real artifacts coaches will use.

- `[ ]` Practice detail screen with ordered drills
- `[ ]` Reorder drills within a practice
- `[ ]` Per-drill notes inside a practice
- `[ ]` Practice metadata (name, duration, description)
- `[ ]` Public share page: drill stepper through frames
- `[ ]` Revoke and regenerate share links
- `[ ]` Export drill (current frame / all frames) to PNG
- `[ ]` Export practice to multi-page PDF

## Milestone 7 — Mobile Viewer

Goal: open a shared practice on phone or tablet without pain.

- `[ ]` Expo app boots and signs in with email
- `[ ]` View own practices and drills (read-only)
- `[ ]` Open a public share link from the OS share sheet
- `[ ]` Render drills via shared `packages/canvas` on `react-native-svg`
- `[ ]` Step through frames

## Design System

- `[ ]` Extract design tokens from `drill-composer.pen` into `packages/ui/tokens`
  - colors
  - typography
  - spacing
  - radius
  - shadows
- `[ ]` Build base primitives: `Button`, `Input`, `IconButton`, `Modal`, `Tabs`, `Tooltip`
- `[ ]` Define hockey-specific tokens: home/away player colors, path stroke styles, zone fill alpha
- `[ ]` Document tokens and primitives in Storybook or equivalent

## Operations

- `[ ]` GitHub Actions CI on every PR
- `[ ]` Vercel preview deploys for `apps/web`
- `[ ]` EAS preview builds for `apps/app`
- `[ ]` Production deploy on `main`
- `[ ]` Error tracking wired in both apps
- `[ ]` Product analytics wired in both apps
- `[ ]` Smoke test on preview that creates a drill, saves, and shares it

## Risk Register

- `[ ]` Canvas perf on mobile — mitigate by shipping mobile as a viewer first
- `[ ]` React Native Web canvas/SVG limitations — mitigate by keeping the editor on Next.js initially
- `[ ]` Gesture conflicts (pan vs draw vs select) — explicit tool modes from day one
- `[ ]` Drill data model churn — versioning + migrations from `schemaVersion: 1`
- `[ ]` Supabase RLS misconfiguration leaking drills — RLS test suite
- `[ ]` Share-link enumeration — long opaque tokens, never sequential ids
- `[ ]` Solo-dev burnout — vertical slice early, demo to coaches early, don't build infra without users

## Later (Post-MVP)

- `[ ]` Teams, roles, and invites
- `[ ]` Drill animation / playback
- `[ ]` Behavior-driven simulation (Stage 2)
- `[ ]` Practice templates
- `[ ]` AI-generated drills
- `[ ]` Public drill discovery
- `[ ]` Player development tracking
- `[ ]` Parent and player training hub
- `[ ]` Marketplace for gear and team apparel
- `[ ]` Real-time collaboration

## Open Decisions

- `[?]` Confirm web-first ordering (web editor, mobile viewer in MVP, mobile editor later)
- `[?]` Canvas tech: plain SVG vs `react-konva` vs Skia
- `[?]` Whether share links require any kind of access code in MVP, or stay token-only
- `[?]` Stroke style conventions for skate / pass / shot (which standard to follow)
- `[?]` Whether to support free-draw annotations in MVP

## Definition of "MVP Done"

- 5 real coaches each create at least one practice without help
- Each practice contains at least 2 drills
- Each practice has been opened via its share link by at least one other person
- The shared link works on phone, tablet, and desktop browsers
- The most common feedback is feature requests, not "this doesn't work"
