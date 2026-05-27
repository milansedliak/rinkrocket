# RinkRocket – AI Interface Specification

This spec defines how AI agents create, read, and modify drills.

The product has two equal users:

1. **Hockey coaches** clicking on a canvas.
2. **AI agents** producing structured drill data.

Both go through the **same data model** and **same tool surface**. There is no parallel AI-only path.

> **MVP scope:** Build the AI-ready foundations (validation, anchors, tool surface, schema export) in Phase 1 and Phase 2. Ship AI-powered features in Phase 5 (post-launch).

---

## Design Principles

1. **One model, two consumers.** Coaches and AI agents read and write the same JSON. If a feature exists for AI, it exists for coaches too.
2. **Coordinates are the source of truth, anchors are sugar.** AI may compose drills with semantic anchors ("center faceoff dot"), but everything compiles down to rink-feet coordinates before saving. The renderer never sees anchors.
3. **AI changes are previewable.** AI never silently mutates a user's drill. Every change is presented as a diff the user can accept, modify, or reject.
4. **The tool surface is small and total.** A handful of tools that compose, not dozens that overlap. AI can express anything by composing primitives.
5. **Validation rejects bad output instead of corrupting drills.** AI will hallucinate. The validation layer is the airlock.
6. **AI is opt-in per user.** No drill content is sent to a model provider without explicit consent.

---

## Use Cases (in priority order)

### Generation
- "Create a 3-on-2 forecheck drill out of the neutral zone."
- "Make me a goalie warmup with shots from the slot and the high circle."
- "Generate a power play breakout with two forwards and a defenseman."

### Modification
- "Add a defender at the right point."
- "Move the puck to the left faceoff dot."
- "Change the passing path so it goes through center ice."
- "Duplicate this frame and have the forwards exchange positions."

### Explanation
- "Describe this drill in plain English for my players."
- "What's the coaching point in this drill?"
- "Name this drill."

### Variation
- "Give me 3 variations of this drill at different difficulty levels."
- "What's a defensive counter to this?"

### Critique
- "Are there any coverage gaps?"
- "Is the spacing realistic?"

### Future (Stage 2 / animation)
- "Animate this drill — interpolate between frames."
- "Add a backcheck behavior for the defender."

---

## Architecture Overview

```
┌──────────────────────┐      ┌──────────────────────┐
│ External AI agents   │      │ In-app AI assist     │
│ (Cursor, Claude Code,│      │ (web app chat panel) │
│  ChatGPT plugins...) │      │                      │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           │  MCP protocol               │  Direct call
           ▼                             ▼
┌──────────────────────────────────────────────────────┐
│           Drill Tool Surface (typed)                 │
│  createDrill / addElement / addFrame / validate ...  │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│   Validation layer (Zod schemas, anchor resolver,    │
│   semantic checks, RLS enforcement)                  │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│              Supabase / Postgres                     │
└──────────────────────────────────────────────────────┘
```

- **Tool surface** lives in `apps/web/server/tools/` (Server Actions / API routes).
- **MCP server** lives in `apps/mcp/` (added in Phase 5). It is a thin wrapper that exposes the tool surface over the MCP protocol.
- **In-app assist** lives in `apps/web/components/ai-assist/`. It calls the same tools through internal RPC.
- **Validation** lives in `packages/core/src/drill/validation/` and is used by every consumer.

---

## Knowledge Strategy — How the AI Understands Hockey

**We do not train a model.** Frontier LLMs (Claude, GPT-5, Gemini) already know hockey — coaching forums, NHL.com, USA Hockey resources, drill books, and r/hockeycoaching are in their training data. They understand forecheck, breakout, 1-3-1, F1/F2/F3, weak-side support, stretch pass, etc.

What they don't know is **our specific system**:
- The drill data model (`PlayerElement` shape, `DrillPatch` operations)
- Our coordinate system (rink feet, origin top-left)
- Our anchor names
- Our tool surface

Bridging that gap is structured prompting, not training.

### The Context Sandwich

Every AI request is composed of:

1. **System prompt** — explains the tool surface, the data model, hockey conventions, and the requirement to return a `DrillPatch`.
2. **Anchor catalog** — every anchor name with its coordinates for the relevant `rinkView`.
3. **Few-shot examples** — 20–30 curated `(user prompt → expected DrillPatch)` pairs covering common drill archetypes.
4. **Current drill JSON** — only if the user is modifying an existing drill and has consented.
5. **User message** — the actual request.

The model produces a `DrillPatch`. The validation layer checks it. If invalid, we feed the structured errors back and the model self-corrects. This **validate → retry** loop is what makes the system robust.

### Why Anchors Are Critical

LLMs are weak at 2D geometry and strong at semantic reasoning. Asking a model to "place a defender at (132, 18)" produces worse results than "place a defender at `faceoff-offensive-right`." Anchors collapse a 2D placement problem into a multiple-choice problem from a known vocabulary.

The tool surface accepts both forms — coordinates and anchors — but the system prompt nudges the model to prefer anchors. The result: dramatically fewer "player floating in the bench" hallucinations.

### Quality Ladder

We ride up this ladder only as far as quality requires.

| Level | Approach                                       | Cost     | Expected quality            |
| ----- | ---------------------------------------------- | -------- | --------------------------- |
| 1     | Zero-shot: schemas + anchors + structured JSON | Lowest   | ~70% of simple requests OK  |
| 2     | + 20–30 few-shot examples in system prompt     | Low      | +10–15% quality, fewer weird outputs |
| 3     | + Retrieval-augmented examples (semantic-search a 200+ drill library, inject top 3–5 dynamically) | Medium   | Big improvement on complex / niche drills |
| 4     | Fine-tune a frontier model for **format adherence** only (not hockey knowledge) | High     | Marginal; only if Levels 1–3 stall |
| 5     | Train a custom model from scratch              | Very high | Not justified — pretrained models already know hockey |

**Default plan:** ship Level 2 in Phase 5. Promote to Level 3 only if eval pass rate stalls below 90%. Skip Levels 4–5 unless reality forces it.

### Concrete Example

**User prompt:** "Make a 2-on-1 rush from the defensive zone."

**What we send to the model:**
- System prompt (~2 KB) describing tool surface and conventions
- Anchor catalog (~1 KB)
- 25 few-shot examples (~10 KB)
- No current drill (new drill)
- User message

**What the model returns:**

```json
{
  "operations": [
    { "kind": "setMetadata", "patch": { "name": "2-on-1 rush", "rinkView": "full" } },
    { "kind": "addElement", "frameId": "f1",
      "element": { "type": "player", "team": "team-a",
                   "at": { "anchor": "faceoff-defensive-left" } } },
    { "kind": "addElement", "frameId": "f1",
      "element": { "type": "player", "team": "team-a",
                   "at": { "anchor": "faceoff-defensive-right" } } },
    { "kind": "addElement", "frameId": "f1",
      "element": { "type": "player", "team": "team-b",
                   "at": { "anchor": "blue-line-right", "offset": { "x": 0, "y": -10 } } } },
    { "kind": "addElement", "frameId": "f1",
      "element": { "type": "puck", "at": { "anchor": "faceoff-defensive-left" } } },
    { "kind": "addElement", "frameId": "f1",
      "element": { "type": "path", "kind": "skate", "points": [/* coords or anchors */] } }
  ]
}
```

**What we do with it:**
1. Resolve anchors to coordinates.
2. Run Zod validation.
3. Run coordinate-bound and semantic checks.
4. If valid → render proposed elements on the canvas in a ghost style for user review.
5. If invalid → return structured errors to the model and let it self-correct (max 2 retries).

User clicks Accept → patch applied → undo stack updated → done.

### Failure Modes and Mitigations

| Failure                                  | Mitigation                                              |
| ---------------------------------------- | ------------------------------------------------------- |
| Model returns invalid JSON               | Provider structured-output mode + Zod validation        |
| Model invents fields that don't exist    | Schema-aware structured output rejects them             |
| Model places elements off-ice            | Coordinate bound validation rejects                     |
| Model uses an anchor name we don't have  | Anchor enum validation rejects                          |
| Model produces nonsense hockey           | Few-shot examples + eval harness catch regressions      |
| Model is too generic ("place 3 players") | Better few-shot examples; promote to Level 3 retrieval  |
| Costs spiral                             | Per-user token caps + response cache (see Safety below) |

### What We Don't Need

- A custom-trained hockey model
- A labeled dataset of thousands of drills
- An ML team
- GPU infrastructure
- An evaluation framework beyond standard prompt eval fixtures

All AI work in this product is **integration engineering**, not ML engineering. Our moat is the tool surface, the anchors, the validation loop, and the curated examples — not weights.

---

## Rink Anchors

AI prompts are easier to write with semantic positions than coordinates. The **anchor system** maps names to coordinates.

See `drill-system.md#rink-anchors` for the canonical list. Highlights:

- **Lines**: `goal-line-left`, `goal-line-right`, `blue-line-left`, `blue-line-right`, `red-line`
- **Faceoff dots**: `faceoff-center`, `faceoff-offensive-left`, `faceoff-offensive-right`, `faceoff-defensive-left`, `faceoff-defensive-right`, `faceoff-neutral-{left,right}-{top,bottom}`
- **Nets and creases**: `net-left`, `net-right`, `crease-left`, `crease-right`
- **Zones**: `zone-offensive`, `zone-neutral`, `zone-defensive`

The tool surface accepts either `position: { x, y }` or `at: { anchor: 'faceoff-center', offset?: { x, y } }`. Anchors resolve to coordinates inside the tool layer; storage and rendering only ever see coordinates.

```ts
// AI can write this:
addElement(drillId, frameId, {
  type: 'player',
  team: 'team-a',
  at: { anchor: 'faceoff-offensive-left', offset: { x: 0, y: -5 } },
});

// Storage receives this:
{ type: 'player', team: 'team-a', position: { x: 130, y: 17.5 }, ... }
```

Anchors are also useful for human users — the editor exposes them via snap-to-anchor while dragging.

---

## Tool Surface

The tool surface is the single contract between AI agents and the drill system. Each tool has a typed input, a typed output, and a deterministic effect.

> All inputs are validated. Invalid inputs return a structured error, not a corrupted drill.

### Read

```ts
listDrills(): Promise<DrillSummary[]>
getDrill(id: string): Promise<Drill>
listRinkAnchors(rinkView: RinkView): Promise<RinkAnchorEntry[]>
```

### Drill lifecycle

```ts
createDrill(input: {
  name: string;
  description?: string;
  rinkView?: RinkView;       // default 'full'
  tags?: string[];
  frames?: FrameInput[];     // optional initial frames
}): Promise<Drill>

updateDrillMetadata(id: string, patch: {
  name?: string;
  description?: string;
  durationSec?: number;
  tags?: string[];
  rinkView?: RinkView;
}): Promise<Drill>

deleteDrill(id: string): Promise<void>
```

### Frames

```ts
addFrame(drillId: string, options?: {
  after?: string;            // frame id; default: append
  copyFrom?: string;         // duplicate an existing frame
  label?: string;
}): Promise<Frame>

updateFrame(drillId: string, frameId: string, patch: {
  label?: string;
}): Promise<Frame>

moveFrame(drillId: string, frameId: string, position: number): Promise<void>

removeFrame(drillId: string, frameId: string): Promise<void>
```

### Elements

```ts
addElement(drillId: string, frameId: string, element: ElementInput): Promise<DrillElement>

updateElement(drillId: string, frameId: string, elementId: string, patch: ElementPatch): Promise<DrillElement>

removeElement(drillId: string, frameId: string, elementId: string): Promise<void>

moveElement(drillId: string, frameId: string, elementId: string, to: Position | { anchor: string; offset?: Vec }): Promise<DrillElement>
```

`ElementInput` accepts either `position` or `at` (anchor form). Same for paths via `points` (each point can be a coord or an anchor reference).

### Validation and rendering

```ts
validateDrill(drill: unknown): Promise<ValidationResult>
//   ValidationResult: { valid: true } | { valid: false; errors: Issue[] }
//   Issue: { path: string; code: string; message: string }

renderDrill(drillId: string, options?: {
  frameId?: string;          // default: first frame
  format?: 'png';            // 'pdf' / 'svg' post-MVP
  width?: number;            // px
}): Promise<{ url: string }>
```

### Sharing

```ts
createShareLink(drillId: string): Promise<{ url: string; token: string }>
revokeShareLink(token: string): Promise<void>
```

### Bulk / atomic

```ts
applyDrillPatch(drillId: string, patch: DrillPatch): Promise<Drill>
//   DrillPatch is a typed sequence of operations applied atomically.
//   Used by the in-app "AI proposed N changes — accept all?" UX.
```

`DrillPatch` is the canonical way an agent proposes a multi-operation change. It is a typed JSON document the user can preview, edit, and accept as one unit.

```ts
type DrillPatch = {
  operations: Operation[];
};

type Operation =
  | { kind: 'addFrame';     after?: string; copyFrom?: string; label?: string }
  | { kind: 'removeFrame';  frameId: string }
  | { kind: 'addElement';   frameId: string; element: ElementInput }
  | { kind: 'updateElement'; frameId: string; elementId: string; patch: ElementPatch }
  | { kind: 'removeElement'; frameId: string; elementId: string }
  | { kind: 'setMetadata';  patch: DrillMetadataPatch };
```

---

## Schema and Discovery

Agents need to know the schema. The web app exposes machine-readable schemas:

| Endpoint                              | What                                  |
| ------------------------------------- | ------------------------------------- |
| `GET /api/ai/schema/drill`            | JSON Schema for `Drill`               |
| `GET /api/ai/schema/element`          | JSON Schema for each `DrillElement`   |
| `GET /api/ai/schema/anchors`          | List of anchors with coords per view  |
| `GET /api/ai/schema/tools`            | OpenAPI-style description of tools    |
| `GET /api/ai/schema/version`          | Current `schemaVersion` + min supported |

These are derived from the same Zod schemas the runtime uses. No duplication.

---

## MCP Server

A Model Context Protocol server in `apps/mcp/` exposes the tool surface to external agents (Cursor, Claude Code, ChatGPT plugins, etc.).

- Distributed as a single binary (or `npx rinkrocket-mcp`).
- Authenticates via personal API token (issued from user settings).
- Each tool is exposed as an MCP tool with description and schema auto-derived from the Zod definitions.
- Read-only by default; write tools require explicit scope on the token.

External agent flow:

1. User issues a personal API token from `/settings/api`.
2. Installs `rinkrocket-mcp` and configures their agent.
3. Agent calls e.g. `createDrill` with anchor-based positions.
4. MCP server validates, resolves anchors, writes to Supabase, returns the drill.

---

## In-App AI Assist

The web app ships an AI assist panel (Phase 5) that calls the same tool surface internally.

### UX

- A right-side panel toggleable from the header.
- Chat history scoped to the current drill.
- Suggested prompts: "Generate a drill", "Add a defender", "Explain this drill".
- Output is always a **proposed `DrillPatch`** the user can preview on the canvas before accepting.
- Accept / Reject / Edit-then-Accept for each proposed change.
- "Undo AI change" works via the normal undo stack — AI-applied operations are first-class history entries.

### Conversation context

The assist sends to the model:
- The current drill JSON (if the user has consented per drill)
- The anchor catalog (precomputed string, cheap)
- A condensed system prompt that documents the tool surface
- The conversation so far

It does **not** send:
- The user's other drills
- Account/email/personal info
- Anything from drills marked "private" or "no-AI" by the user

### Provider abstraction

Model providers (OpenAI, Anthropic, etc.) sit behind a thin `AIProvider` interface. We start with one provider; switching providers should be one config change.

---

## Validation Layer

The validation layer is the airlock between AI output and stored drills.

Three levels:

1. **Schema validation** (Zod): shape, types, enums, ranges.
2. **Coordinate validation**: positions inside `rinkView` bounds; paths have ≥ 2 points; zones have positive size.
3. **Semantic warnings** (advisory, not blocking):
   - Players overlapping within 2 ft
   - Path crossing through a player
   - Element off-ice
   - No puck on the ice when a `shot` path exists

Schema errors are **blocking**. Semantic warnings are **surfaced to the user** but do not block save.

Validation errors are structured so the AI can repair them and retry:

```json
{
  "valid": false,
  "errors": [
    { "path": "/frames/0/elements/3/position/x", "code": "out_of_bounds", "message": "x=210 exceeds rink width 200 for view=full" }
  ]
}
```

---

## Safety, Privacy, Cost

### Privacy
- AI features are **opt-in per user** via account settings.
- Drill-level "no AI" flag overrides the account default.
- No drill content is sent to model providers without consent.
- Consent state is logged in an audit table.

### Cost control
- Per-user soft cap on AI tokens per day; hard cap per month.
- Caching layer for "explain this drill" requests keyed on drill JSON hash.
- Streaming responses to avoid wasted tokens on cancelled requests.

### Safety
- The model is told to produce a `DrillPatch`, not raw JSON. The patch is then validated.
- All AI-proposed operations are pre-screened by validation **before** they reach the user as a preview.
- Tool calls from MCP are authenticated; tokens can be revoked at any time.

---

## Non-goals (MVP and Phase 5)

- Autonomous AI that edits drills without user review
- Image-to-drill (scan a whiteboard photo) — Stage 2
- AI-driven simulation behaviors — Stage 2
- Multi-user collaborative AI sessions — post-MVP
- Local on-device models — post-MVP
- Voice input — post-MVP

---

## Foundations to Build in MVP

So Phase 5 can ship quickly, build these earlier:

| Foundation                                          | Phase | Why                                                          |
| --------------------------------------------------- | ----- | ------------------------------------------------------------ |
| Zod schemas for `Drill` and `DrillElement`          | 1     | Validation + schema export                                   |
| Rink anchor catalog and resolver                    | 1     | Anchor positions also power editor snap-to-anchor            |
| Tool surface as typed client functions              | 1     | AI and editor call the same functions (client-side, local)   |
| `DrillPatch` type and applier                       | 1     | Undo/redo is implemented on top of this shape                |
| Schema export endpoints `/api/ai/schema/*`          | 1     | AI discoverability; cheap to expose from the Next.js app     |
| Tool surface as Server Actions (server-side mirror) | 2     | Cloud-backed product needs the same tools on the server      |
| Public schema docs page                             | 4     | Marketing surface for agent builders                         |

If those exist by end of Phase 4, Phase 5 is mostly UX and provider plumbing — not new architecture.

---

## Related

- Data model: `drill-system.md`
- Canvas UX: `canvas-ux.md`
- Phase 5 plan: `../phases/5-ai-agents.md`
- AI-related decisions: `../decisions.md`
- AI-related risks: `../risks.md`
