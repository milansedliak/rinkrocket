# Phase 0 — Validate and De-risk

Status: `[ ]` not started
Owner: TBD
Target duration: 1–2 weeks (parallel tracks)

## Goal

Before writing the real codebase, prove two things:

1. **We are building something coaches want** (user research track).
2. **Our chosen canvas tech can hit the quality bar in `canvas-ux.md`** (tech spike track).

These two tracks run in parallel. The phase ends when both produce a written decision.

---

## Track A — Coach Discovery

### Why
The drill builder is a niche tool for a niche audience. We need to know how coaches actually plan and share practices today, what frustrates them, and what would make them switch.

### Tasks
- [ ] Identify 5–10 hockey coaches across levels (youth, high school, junior, adult rec)
- [ ] Conduct 3–5 30-minute conversations
- [ ] For each conversation, capture:
  - How they plan practices today (tool, paper, whiteboard)
  - How they share with players and parents today
  - What they hate about their current workflow
  - Their reaction to a 1-page mock of the drill composer
- [ ] Write a 1-page synthesis: must-haves, nice-to-haves, "if you build this I'll use it" features

### Acceptance Criteria
- Synthesis document committed under `docs/research/coach-interviews.md`
- At least 3 coaches express interest in being beta users
- No surprise finding contradicts the MVP scope (if one does, update `PROJECT.md` before continuing)

---

## Track B — Canvas Tech Spike

### Why
The canvas is the product. We must not commit to an architecture without proving it can hit the quality bar.

### Tasks
- [ ] Stand up a throwaway Next.js app under `experiments/canvas-spike/`
- [ ] Render a rink background SVG
- [ ] Implement pan and zoom
- [ ] Implement place / select / drag / delete for a single primitive (player)
- [ ] Implement multi-frame switching with 4 frames
- [ ] Implement drag perf test with 50 players in one frame
- [ ] Benchmark against the targets in `canvas-ux.md`:
  - drag frame time < 16 ms
  - pan/zoom frame time < 16 ms
  - input-to-paint < 50 ms

### Decision to produce
Document under `docs/decisions.md` (ADR section): **canvas tech**.

Options:
- **Plain SVG + React** — simplest, may not hit perf with many elements
- **`react-konva` (Canvas2D)** — good perf, decent ergonomics
- **`@shopify/react-native-skia` via Web** — best perf, more complex

### Acceptance Criteria
- Benchmark numbers recorded in `experiments/canvas-spike/RESULTS.md`
- A written decision in `docs/decisions.md` with rationale
- The spike code is thrown away — real implementation starts from scratch in Phase 1

---

## Exit Criteria for Phase 0

- Coach synthesis exists and confirms the MVP scope
- Canvas tech decision is written down with benchmarks
- `docs/decisions.md` shows web-first ordering confirmed (or contested with new evidence)

Next: [Phase 1 — Vertical Slice](./1-vertical-slice.md)
