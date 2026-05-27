# RinkRocket Backlog

This is the **index** of the project plan. Detailed work lives in phase files under `docs/phases/`.

For vision and strategy, see `PROJECT.md`.

---

## Status Snapshot

| Area                                | Status     |
| ----------------------------------- | ---------- |
| Product vision                      | `[draft]`  |
| Drill data model spec               | `[draft]`  |
| Canvas UX spec                      | `[draft]`  |
| AI interface spec                   | `[draft]`  |
| Drill composer UI design            | `[draft]`  |
| Repo scaffolded                     | `[ ]`      |
| Canvas + drill system (local-only)  | `[ ]`      |
| Auth + cloud + sharing              | `[ ]`      |
| Practices + library polish          | `[ ]`      |
| Launch                              | `[ ]`      |
| AI agents                           | `[ ]`      |

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[draft]` drafted, not finalized

---

## Guiding Principles

These guide every prioritization decision.

1. **The canvas is the product.** Everything else exists to support it. If a feature would compromise the canvas quality bar, the feature loses.
2. **Coaches and AI agents are equal users.** They go through the same data model and the same tool surface. No parallel AI-only path.
3. **Ship vertical slices, not horizontal layers.** End-to-end before complete-on-any-layer.
4. **Web-first in MVP.** Native apps and touch editing come post-MVP.
5. **Defer abstraction.** Two workspaces day one. Extract more only when a second consumer exists.
6. **Defer infrastructure.** Sentry, PostHog, Storybook, Turborepo all come in their relevant phase, not on day one.
7. **Data model is versioned from day one.** Everything else is recoverable; corrupted user data is not.

---

## Phase Index

Each phase has its own file with scope, tasks, acceptance criteria, and definition of done.

| #   | Phase                                                              | Goal                                                          | Status |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------- | ------ |
| 1   | [Canvas + Drill System](./docs/phases/1-canvas.md)                 | Best-in-class drill canvas. Local-only. No login, no backend. | `[ ]`  |
| 2   | [Auth, Cloud, Sharing](./docs/phases/2-auth-cloud-sharing.md)      | Email auth, Supabase persistence, share links, local→cloud migration | `[ ]`  |
| 3   | [Practices and Library Polish](./docs/phases/3-practice-sharing.md) | Minimal practice planner; library search/filter/sort        | `[ ]`  |
| 4   | [Launch](./docs/phases/4-launch.md)                                | Reliability, observability, marketing site, beta to public    | `[ ]`  |
| 5   | [AI Agents](./docs/phases/5-ai-agents.md)                          | MCP server + in-app AI assist; AI as first-class consumer     | `[ ]`  |
| ∞   | [Later (Post-MVP)](./docs/phases/later.md)                         | Animation, simulation, native apps, teams, marketplace        | n/a    |

> **Phase 1 is the whole product.** It ships locally first — visit the URL, the canvas is there, drills save to the browser. Phase 2 adds the cloud layer on top without disturbing the canvas.
>
> **AI-readiness note:** Phase 5 ships AI features, but the foundations (validation, anchors, tool surface, schema export) are built into Phase 1 so AI features can land quickly post-launch. See `docs/specs/ai-interface.md`.

---

## Specifications

| Doc                                              | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| [PROJECT.md](./PROJECT.md)                       | Vision, MVP scope, strategy, success criteria  |
| [docs/specs/drill-system.md](./docs/specs/drill-system.md) | Drill data model, rink coordinates, anchors, sharing model |
| [docs/specs/canvas-ux.md](./docs/specs/canvas-ux.md)       | Canvas UX, shortcuts, performance targets, quality bar |
| [docs/specs/ai-interface.md](./docs/specs/ai-interface.md) | AI / agent tool surface, MCP server, validation, safety |
| [docs/decisions.md](./docs/decisions.md)         | Open decisions and resolved ADR log            |
| [docs/risks.md](./docs/risks.md)                 | Risk register                                  |

---

## Definition of "MVP Done"

The MVP completes at the end of **Phase 4**, when:

- 5 real coaches each create at least one drill without help
- Each coach successfully shares a drill link with at least one other person
- The shared link renders correctly on phone, tablet, and desktop browsers
- The most common feedback is feature requests, not "this doesn't work"

**Phase 1 has its own definition of "done"**: 3 real coaches successfully use the local-only canvas to build multi-frame drills and meet the manual acceptance criteria from `docs/specs/canvas-ux.md`. The canvas must be great before we bolt on the cloud.

See `PROJECT.md` for the canonical version.

---

## Working Agreement

- Always work inside the current phase. Don't pre-pull tasks from later phases.
- New work proposals go through `docs/decisions.md` if they touch architecture, or directly into the relevant phase file if they fit existing scope.
- Anything that doesn't have a clear home goes into `docs/phases/later.md`.
- Each completed phase ends with a short retrospective appended to the phase file.
