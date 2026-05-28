# RinkRocket

The best hockey drill builder on the market.

See `PROJECT.md` for vision, `BACKLOG.md` for the phased plan, and `docs/specs/` for the data model and canvas UX specs.

## Quick start

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

## Repo layout

- `apps/web` — Next.js app (drill composer + marketing + shared pages)
- `packages/core` — shared types, drill model, rink coordinates, validation
- `packages/design` — Pencil design files
- `docs/` — specs, phase plans, decisions, risks

## Phase

Phase 1: Canvas + Drill System (local-only). See `docs/phases/1-canvas.md`.
