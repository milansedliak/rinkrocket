# Risk Register

Risks are tracked here, not in `BACKLOG.md`. A risk is not a task — it is a thing that might go wrong. Its associated **mitigation** is the task, and lives in the relevant phase file.

## Legend

- **Likelihood**: Low / Medium / High
- **Impact**: Low / Medium / High / Critical
- **Status**: Open / Mitigated / Accepted

---

## Active Risks

| # | Risk | Likelihood | Impact | Mitigation | Where | Status |
|---|------|-----------|--------|-----------|-------|--------|
| R1 | Canvas does not feel best-in-class; coaches stick with existing tools | Medium | Critical | Quality bar in `canvas-ux.md` is non-negotiable. Coach validation in Phase 0. Manual acceptance tests with real coaches at the end of Phase 2. | Phase 0, Phase 2 | Open |
| R2 | Canvas perf drops below 60fps with realistic drills (50+ elements, 5+ frames) | Medium | High | Phase 0 spike benchmarks. CI-enforced perf budget. SVG vs Konva vs Skia decision based on real numbers. | Phase 0, Phase 2 | Open |
| R3 | Touch / mobile editing is too painful and we ship it broken | High | High | Mobile is **view-only** in MVP. Editor shows a "view-only on mobile" notice. Touch editing is its own post-MVP phase with a real design pass. | Phase 2 (notice), `later.md` (full work) | Mitigated |
| R4 | Supabase RLS is misconfigured and one user reads another user's drill | Medium | Critical | Explicit RLS test suite in Phase 1. Re-audit in Phase 4. Share-link access is the only public path. | Phase 1, Phase 4 | Open |
| R5 | Drill data model needs breaking changes after users have data | High | Medium | `schemaVersion` on every drill from day one. Migrations live in `packages/core/src/drill/migrations/` and run on read. | All phases | Mitigated |
| R6 | Share-link tokens are guessable / enumerable | Low | High | Long opaque tokens (≥21 chars) from a CSPRNG. Never sequential. Rate-limit lookups. Tracked in Phase 4 security audit. | Phase 1, Phase 4 | Mitigated |
| R7 | Save races corrupt a drill (concurrent edits, lost updates) | Medium | High | Single-tab editor in MVP. Debounced save with explicit "saving" indicator. Server uses `updated_at` for last-write-wins; no multi-tab support in MVP. | Phase 2 | Mitigated |
| R8 | Premature architecture (extra packages, Turborepo, native app) eats months before MVP | High | High | ADR-001, ADR-002, ADR-003 explicitly cut scope. Anything new requires ADR justification. | Phase 1 | Mitigated |
| R9 | Solo-dev burnout from too much infra and too few users | High | High | Vertical slice in Phase 1 must reach a real coach before going wide. Observability and marketing site come in Phase 4, not Phase 1. | Phase 0, Phase 1 | Mitigated |
| R10 | Sharing UX is fine on desktop but broken on mobile browsers | Medium | High | Phase 1 acceptance test opens share link on a real phone. Phase 2 includes mobile Lighthouse > 90 on share view. | Phase 1, Phase 2 | Open |
| R11 | We over-invest in features adjacent to the canvas (practice planner, library, etc.) and the canvas itself stays mediocre | Medium | Critical | The canvas owns Phase 2 (4–6 weeks, the longest phase). Practice planner is intentionally minimal in Phase 3. Anything that would compromise the canvas quality bar is rejected. | Phase 2, Phase 3 | Open |
| R12 | Choosing the wrong canvas tech and finding out two months in | Medium | High | Phase 0 spike with real benchmarks before committing. The spike code is thrown away — the decision is what we keep. | Phase 0 | Mitigated |
| R13 | Coaches need PDF for printed practices and PNG isn't enough | Medium | Medium | Listen for it in feedback from Phase 4 launch. If it's the top request, promote PDF export out of `later.md`. | Phase 4+ | Accepted |
| R14 | Free tier costs us money before we have revenue | Low | Medium | Supabase free tier is generous. Vercel hobby is generous. Re-evaluate before public marketing push. | Phase 4 | Accepted |
| R15 | Future Stage 2 (simulation) requires data-model changes we didn't anticipate | Medium | Medium | Model is intentionally extensible (typed primitives, rink-relative coords, versioning). Migration path documented. Accept some refactor work when simulation actually starts. | Stage 2 | Accepted |
| R16 | AI hallucinates malformed drills and corrupts user data | High | Critical | Validation layer rejects any `DrillPatch` that fails Zod or semantic checks. AI mutations are always previewed before apply. No autonomous AI writes. ADR-011. | Phase 2, Phase 5 | Mitigated |
| R17 | AI features leak user drill content to a model provider without consent | Low | Critical | Opt-in per account; per-drill override; audit log of every outbound call; account-level master switch. ADR-009. | Phase 5 | Mitigated |
| R18 | AI token costs spiral as users explore the feature | Medium | High | Per-user daily soft cap + monthly hard cap. Response caching for repeat prompts. Streaming cancellation. Provider abstraction allows model switching if pricing changes. | Phase 5 | Mitigated |
| R19 | AI output quality is poor and undermines product reputation | High | High | Curated prompt library + few-shot examples. Eval harness in CI on example prompts. AI features are framed as "assist" not "autopilot"; user always reviews. | Phase 5 | Open |
| R20 | MCP server becomes attack surface (token theft, drill exfiltration via compromised agents) | Medium | High | Scoped tokens (read/write/share), rotatable from settings. Rate limits per token. Audit log of MCP operations. Tokens never embedded in client builds. | Phase 5 | Open |
| R21 | Building AI features distracts from the core canvas before it's polished | High | High | Phase 5 explicitly comes after Phase 4 (launch). Pre-flight check in `5-ai-agents.md` requires real users on the live product before starting. | Phase 4–5 | Mitigated |
| R22 | We bet on the wrong model provider | Medium | Medium | `AIProvider` interface; one config swap. Eval harness measures regression across providers. | Phase 5 | Mitigated |

---

## How to Add a Risk

1. Append a new row with a fresh `R#`.
2. Set Likelihood and Impact honestly.
3. Write the mitigation as something concrete and assignable, with a phase reference.
4. When mitigated, change Status to **Mitigated**.
5. When the risk is no longer relevant (the world changed), change Status to **Accepted** and add a one-line note.
