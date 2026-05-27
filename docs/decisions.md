# Decisions

This file tracks open product/technical decisions and a lightweight log of resolved ones.

## Status Legend

- `[?]` Open — needs a decision
- `[→]` Decided — see ADR below for rationale

---

## Open Decisions

- `[?]` **Email auth flavor**: magic link vs password (low stakes; pick during Phase 1)
- `[?]` **Stroke style conventions** for skate / pass / shot — pick a published standard (USA Hockey or Hockey Canada)
- `[?]` **Player numbering** — auto-increment per team or always blank by default
- `[?]` **Zone rotation in MVP** — currently default `yes`; revisit if it complicates the inspector
- `[?]` **Free-draw / annotation tool in MVP** — current default `no`
- `[?]` **Pricing model at launch** — free, freemium, or paid (decide before Phase 4 marketing site)
- `[?]` **Analytics tool** — PostHog vs Plausible vs first-party (decide before Phase 4)
- `[?]` **AI model provider for Phase 5** — Anthropic (Claude) vs OpenAI vs both behind abstraction (decide before Phase 5)
- `[?]` **AI consent default** — opt-in or opt-out at account creation (decide before Phase 5)
- `[?]` **MCP transport** — stdio only, or stdio + HTTP for browser-based agents (decide in Phase 5)

---

## Architecture Decision Records (ADR-lite)

Each entry: short title, date, status, context, decision, consequences.

### ADR-001: Web-first, no native app in MVP
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** Original plan included an Expo + React Native app in MVP for mobile/tablet viewing. This added a second platform, RN Web ambiguity, canvas porting work, EAS builds, and app store overhead — all before validating the product.
- **Decision:** MVP ships **one Next.js web app** that is responsive and installable as a PWA. Native apps are post-MVP and live in `docs/phases/later.md`.
- **Consequences:**
  - Removes an entire workstream from MVP.
  - Mobile/tablet experience for MVP is web + PWA.
  - Touch-first editing UX is also deferred to post-MVP; mobile is view-only.
  - When native apps come back, they wrap the existing web canvas or use a shared rendering package extracted at that time.

### ADR-002: Two workspaces day one, not seven
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** Earlier plan called for `apps/web`, `apps/app`, `packages/core`, `packages/ui`, `packages/api`, `packages/canvas`, `packages/design`. Most of those would be empty scaffolds with their own tsconfigs.
- **Decision:** Start with only `apps/web`, `packages/core`, and `packages/design`. Additional packages are extracted **only when a second consumer exists**.
- **Consequences:**
  - Less boilerplate; faster startup.
  - Risk of refactor when a package is extracted later — accepted, because YAGNI is cheaper than premature extraction.

### ADR-003: No Turborepo in MVP
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** Turborepo solves multi-app build orchestration. We have one app.
- **Decision:** Use pnpm workspaces only. Add Turborepo when a second app exists.
- **Consequences:** Minor — pnpm scripts handle one app fine.

### ADR-004: PNG export only in MVP; no PDF
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** PDF export is high value but introduces print layout, page breaks, and multi-page rendering complexity. PNG is what coaches actually paste into texts and Discord.
- **Decision:** Ship PNG export in Phase 3. Defer PDF to post-MVP.
- **Consequences:** Coaches who print may be unhappy at launch; we will hear about it and prioritize PDF if it shows up in feedback.

### ADR-005: Practices are an ordered array of drill ids, not a join table
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** A `PracticeDrill` join table with `position` is more SQL-correct but adds boilerplate. MVP practices have no per-drill metadata.
- **Decision:** Practices store `drill_ids text[]` and rely on array order. If per-drill notes/duration are added later, migrate to a join table.
- **Consequences:** Reordering is a single column update. Migration to a join table is cheap when needed.

### ADR-006: Drill `team` uses neutral labels (`team-a` / `team-b`)
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** "Home/away/neutral" is game terminology, not drill terminology. Coaches think in two colors during drills.
- **Decision:** `team: 'team-a' | 'team-b'`. Colors come from design tokens, not data.
- **Consequences:** Re-skinning team colors is a token change, not a data change.

### ADR-007: Path elements have no base position
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** Earlier model had both `x, y` on every element and `points` on `PathElement` — ambiguous.
- **Decision:** `PathElement` has only `points` (absolute rink-feet). No `position` field.
- **Consequences:** Path moving is implemented by translating all points. Simpler model, simpler renderer.

### ADR-008: Active frame is editor state, not persisted
- **Date:** 2026-05-25
- **Status:** Decided
- **Context:** Storing `activeFrameId` in `CanvasState` invites bugs when frames are deleted, and it isn't user-meaningful data.
- **Decision:** `CanvasState` contains only `frames`. The editor opens the first frame by default.
- **Consequences:** Editor maintains its own selection state. Drill JSON is cleaner.

### ADR-009: AI agents and coaches share one data model and one tool surface
- **Date:** 2026-05-26
- **Status:** Decided
- **Context:** A parallel "AI-only" API would diverge from the user-facing model over time, producing two products' worth of maintenance and rendering subtle inconsistencies.
- **Decision:** AI and the editor both call the same typed Server Actions in `apps/web/server/tools/`. Anything an AI can do, a coach can do, and vice versa.
- **Consequences:**
  - The tool surface gets first-class engineering attention from MVP onward.
  - AI features in Phase 5 are mostly UX and prompt work, not new architecture.
  - The editor's undo system shares the same `DrillPatch` shape as AI proposals — one history model.

### ADR-010: Rink anchors are derived sugar, not stored data
- **Date:** 2026-05-26
- **Status:** Decided
- **Context:** Anchors like "faceoff-center" are useful for AI prompts and editor snapping. Storing anchored positions instead of coordinates introduces ambiguity when an anchored element is dragged.
- **Decision:** Storage is always coordinates. Anchors are an input convenience that resolves to coordinates at the tool layer. The renderer never sees anchors.
- **Consequences:** Single source of truth (coordinates). Anchors can evolve without migrations. AI is encouraged to use anchors; editor uses them for snap.

### ADR-011: AI proposals are `DrillPatch` documents, not raw drill JSON
- **Date:** 2026-05-26
- **Status:** Decided
- **Context:** Letting AI return a full drill replaces hidden user edits and is hard to preview. Returning a structured patch of typed operations is reviewable, validatable, and composable with undo/redo.
- **Decision:** Every AI mutation returns a `DrillPatch`. The patch is validated, previewed on canvas, and accepted/rejected by the user before applying.
- **Consequences:**
  - Validation layer is the airlock — malformed patches are rejected with structured errors the AI can iterate on.
  - Undo/redo entries are also `DrillPatch` operations, so AI-applied changes are first-class history.
  - No autonomous AI mutations of user drills.

### ADR-013: Default canvas tech is plain SVG
- **Date:** 2026-05-26
- **Status:** Decided
- **Context:** Earlier plan called for a Phase 0 canvas spike to choose between plain SVG, `react-konva`, and `@shopify/react-native-skia`. We removed Phase 0 — direction is locked, time-to-real-product matters more than picking a "perfect" renderer up front.
- **Decision:** Use plain SVG (React-driven) as the canvas renderer in Phase 1 and Phase 2. The renderer sits behind a stable interface (`packages/canvas` when extracted) so we can swap implementations later without changing the data model or the editor logic.
- **Why SVG:**
  - Hockey drills are small (typically <100 elements per frame, <10 frames). SVG handles this comfortably.
  - DOM-native: best-in-class accessibility, hit testing, focus, keyboard, screen reader support.
  - Trivial to render server-side for share pages (`<img src="…">` works).
  - No additional dependency for a feature that is already complex.
  - Same renderer works for thumbnail generation and PNG export.
- **Consequences:**
  - We trust Phase 2's CI-enforced perf budget to detect regressions early.
  - If perf falls short with realistic drills, swap to `react-konva` (Canvas2D) behind the same interface — a contained rewrite, not an architectural reset.
  - We avoid Skia entirely until / unless we ship a native app and need a shared renderer.

### ADR-015: Canvas ships first, local-only. Auth and cloud come later.
- **Date:** 2026-05-27
- **Status:** Decided
- **Context:** Earlier plan had Phase 1 (Vertical Slice with auth + save + share) before Phase 2 (Canvas MVP). That order forced us to build auth, RLS, share links, and Supabase plumbing **before** the actual product was good. It also slowed the canvas itself by spending time on infrastructure no user has asked for yet.
- **Decision:** The canvas + drill system is **Phase 1**, shipped as a **local-only** app. No login, no Supabase, no share links. Drills live in IndexedDB. Auth, cloud sync, and sharing land in **Phase 2** as a strict additive layer.
- **Why:**
  - Spends 100% of the initial build on the differentiator (the canvas).
  - Coaches can try the product instantly — no signup wall.
  - The same drill JSON shape lives in IndexedDB and (later) Supabase, so the Phase 2 migration is a sync, not a rewrite.
  - All AI-readiness foundations (Zod schemas, anchors, tool surface, `DrillPatch`, schema export) still land in Phase 1; they don't depend on the backend.
- **Consequences:**
  - Phase 1 is the biggest, most important phase. It owns the canvas quality bar end-to-end.
  - Phase 2 takes on the local→cloud migration as a one-time task.
  - Anonymous use is supported permanently — sign-in is opt-in.
  - The tool surface is implemented twice: client-side in Phase 1, server-side (Server Actions) in Phase 2. Both satisfy the same TypeScript interface so AI assist doesn't care which is active.

### ADR-014: No formal validation phase
- **Date:** 2026-05-26
- **Status:** Decided
- **Context:** Earlier plan included a Phase 0 with coach interviews and a canvas tech spike before any real implementation work.
- **Decision:** Phases start at 1. We validate continuously via the Phase 2 manual coach acceptance tests, the Phase 3 "real coaches build a real practice" gate, and the Phase 4 beta cohort.
- **Consequences:**
  - Faster start; no upfront research phase.
  - Validation moves into the build itself: Phase 2 cannot be marked done until ≥3 real coaches pass the canvas acceptance bar in `canvas-ux.md`.
  - If user research reveals the product is wrong, we course-correct mid-build rather than gating the whole project on it.

### ADR-012: MCP server is the canonical external integration
- **Date:** 2026-05-26
- **Status:** Decided
- **Context:** Multiple external surfaces (REST, GraphQL, MCP, plugins) would fragment effort.
- **Decision:** External AI integration ships as a single MCP server in `apps/mcp/`. Tool definitions are auto-derived from the same Zod schemas the web app uses.
- **Consequences:**
  - No duplicate tool definitions.
  - Coverage parity between in-app assist and external agents is automatic.
  - REST/GraphQL/etc. can come later if real demand emerges.

---

## How to Add a Decision

1. Add an `[?]` line under Open Decisions when a real question surfaces.
2. When you decide, append a new ADR entry with: title, date, status, context, decision, consequences.
3. Update the spec/phase/PROJECT files to reflect the decision.
4. Remove the `[?]` line.
