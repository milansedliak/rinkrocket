# RinkRocket

The best hockey drill builder on the market.

See `PROJECT.md` for vision, `BACKLOG.md` for the phased plan, and `docs/specs/` for the data model and canvas UX specs.

## Quick start

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

## Deploy (DigitalOcean App Platform)

Use a **Web Service** with the **Node.js** runtime (`nodejs:22` or `nodejs:24`), not TypeScript.

| Setting | Value |
|--------|--------|
| Source directory | `/` (repo root) |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Run command | `pnpm start` |
| HTTP port | `3000` |

The repo includes `.do/app.yaml` with `environment_slug: node-js` so App Platform picks the Node buildpack and pnpm (via `pnpm-lock.yaml`).

## Repo layout

- `apps/web` — Next.js app (drill composer + marketing + shared pages)
- `packages/core` — shared types, drill model, rink coordinates, validation
- `packages/design` — Pencil design files
- `docs/` — specs, phase plans, decisions, risks

## Phase

Phase 1: Canvas + Drill System (local-only). See `docs/phases/1-canvas.md`.
