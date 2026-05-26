# Phase 5 — AI Agents

Status: `[ ]` not started
Depends on: [Phase 4](./4-launch.md) (live product with real users)
Target duration: 3–4 weeks

## Goal

Make RinkRocket the most AI-friendly drill builder on the market. Coaches should be able to **generate**, **modify**, **explain**, and **iterate** on drills via AI — and external AI agents (Cursor, Claude Code, ChatGPT) should be able to do the same through a standard MCP server.

This phase delivers the **AI features**, not the foundations. Foundations (validation, anchors, tool surface, schema export) are built into Phases 1–4 per `ai-interface.md`.

---

## Pre-flight Check

Before starting Phase 5, verify the foundations are in place. If any are missing, fix them first:

- [ ] Zod schemas for `Drill`, `Frame`, all `DrillElement` variants
- [ ] Anchor resolver in `packages/core/src/rink/anchors.ts` with all anchors from `drill-system.md`
- [ ] Tool surface implemented as Server Actions in `apps/web/server/tools/`
- [ ] `DrillPatch` type, validator, and applier
- [ ] Schema export endpoints at `/api/ai/schema/*`
- [ ] At least one paying or beta user actively using the product

If pre-flight fails, the AI work blows up against missing primitives. Don't skip.

---

## Scope

### Track A — MCP Server

Stand up a public MCP server so external AI agents can use RinkRocket.

- [ ] Create `apps/mcp/` (Node + TypeScript)
- [ ] Implement MCP protocol handlers (stdio + HTTP transports)
- [ ] Wrap every tool from the tool surface as an MCP tool
- [ ] Tool descriptions are auto-derived from Zod schemas (no duplication)
- [ ] Personal API tokens with scopes (`read`, `write`, `share`)
- [ ] `/settings/api` page for token management
- [ ] Distribution: `npx rinkrocket-mcp` and standalone binary via `pkg`
- [ ] Public docs page with example agent config (Cursor, Claude Code)

### Track B — In-App AI Assist

A chat panel in the web app that uses the same tool surface internally.

- [ ] Right-side AI panel, toggleable from the header
- [ ] Chat history scoped per-drill
- [ ] Suggested prompts above the input
- [ ] Streaming model responses
- [ ] AI returns a `DrillPatch`, never raw drill JSON
- [ ] Patch preview on the canvas (proposed elements rendered in a distinct style)
- [ ] Accept all / accept one / reject controls per operation
- [ ] AI-applied changes are first-class history entries (undo with `Cmd+Z`)
- [ ] Per-drill "Use AI" toggle (default opt-in, can be turned off per drill)
- [ ] Per-account AI consent in settings

### Track C — Privacy and Cost Controls

- [ ] Audit log of every AI request (which drill, which user, redacted prompt size)
- [ ] Per-user daily token soft cap (default 50k) — surface as a friendly limit
- [ ] Per-user monthly token hard cap
- [ ] Response cache for "explain this drill" keyed on drill JSON hash
- [ ] Streaming cancellation: closing the panel cancels the in-flight request
- [ ] Provider abstraction layer (`AIProvider` interface)
- [ ] Account-level "Do not send my drills to AI" master switch

### Track D — Prompt Engineering (Level 2 on the quality ladder)

The biggest determinant of perceived quality. We start at Level 2 (zero-shot + few-shot examples). Promote to Level 3 (retrieval-augmented) only if eval pass rate stalls below 90%. See `../specs/ai-interface.md#quality-ladder`.

- [ ] System prompt that:
  - documents the tool surface
  - includes the anchor catalog (rendered for the active `rinkView`)
  - explains hockey terminology and conventions
  - instructs the model to return only `DrillPatch` operations
  - encourages anchors over raw coordinates
- [ ] Example library: 20+ paired prompts + expected patches in `apps/web/server/ai/examples/`
  - Coverage targets: forecheck, breakout, power play, penalty kill, neutral zone setup, line rush, goalie warmup, faceoff plays, defensive coverage, transition
- [ ] Few-shot prompt construction (static 20–30 examples in MVP of Phase 5)
- [ ] Validate-and-retry loop: send structured errors back to the model, allow up to 2 retries
- [ ] Eval harness: run `(prompt → expected patch)` fixtures in CI; fail on regression > 5%
- [ ] Quality dashboard: success rate, validation-rejection rate, avg latency, avg tokens per request

### Track E — Retrieval-Augmented Examples (Level 3, stretch goal)

Promote to this only if Level 2 cannot hit the eval target.

- [ ] Curated drill corpus (~200 drills with text descriptions and canonical `DrillPatch`)
- [ ] Embedding index (e.g. Supabase `pgvector`)
- [ ] On each request, semantic-search the corpus and inject the top 3–5 examples in place of (or in addition to) the static few-shot library
- [ ] Re-evaluate via the same eval harness

---

## Definition of Done

- [ ] External agent can install `rinkrocket-mcp`, list drills, and create a 5-element drill in a single conversation
- [ ] In-app assist can generate a "3-on-2 forecheck" drill that passes manual review by a coach
- [ ] In-app assist can modify an existing drill ("add a defender at the left point") with previewable diff
- [ ] Validation rejects ≥ 99% of malformed AI output without corrupting drills
- [ ] Eval harness shows ≥ 90% pass rate on the example library
- [ ] Privacy controls demonstrably work: account-disabled = zero outbound model calls
- [ ] Per-user monthly token hard cap demonstrably stops requests when hit

---

## Stretch Goals (move to `later.md` if time runs out)

- [ ] Voice input ("Hey RinkRocket, add a defender at the right point")
- [ ] AI-suggested drill name and tags on save
- [ ] AI-generated thumbnails (cleanup pass over the existing renderer output)
- [ ] "Explain this drill for players" → coach-facing summary
- [ ] Variation generator ("give me 3 versions at different difficulties")

---

## Anti-goals

- **No autonomous AI mutations.** The model never writes to a drill without user review.
- **No image-to-drill in Phase 5.** Whiteboard photo → drill is Stage 2.
- **No agent-runs-the-product mode.** AI is a collaborator, not a replacement for the coach.
- **No vendor lock-in.** The `AIProvider` abstraction stays so we can switch model vendors.

Next: see `later.md` for what comes after AI agents are stable.
