# SlotForge AI — Task Log

All completed tasks, in order. Each entry records what shipped, what files changed, and any key decisions made.

---

## Phase 1–4 (prior sessions)

Systems shipped before Phase 5:
1. Auth + RBAC (SUPER_ADMIN / ADMIN / USER), JWT cookies, rate-limited login
2. API Keys vault (AES-256-GCM encrypted, panel UI, primary source for every AI call)
3. AI provider integrations: OpenAI (GPT-4o, GPT-4o-mini, GPT-Image-1, DALL-E 3), Replicate (FLUX 1.1 Pro Ultra, FLUX Schnell, SD 3.5), Runway Gen-3, Imagine Art (Vyro), Pollinations free fallback
4. Slot game generation pipeline (form → /api/generate SSE → assets → SlotMachinePreview)
5. Premium animated SlotMachinePreview (continuous-scroll reels, paylines, coin rain, tiered MEGA WIN)
6. 2D Assets wizard (Utility App 24-Q, Board Game 25-Q, /build/[category])
7. AI Roles split (prompt / image / animation / layered / rigging) with swap modal
8. Curated AI catalogue (~30 models with verified billing URLs, integration flags)
9. Search input + add/remove × buttons + compatibility modal + show-hidden toggle
10. Trending AI Models banner (auto-scrolling marquee) on landing page
11. Multi-tier asset persistence: IndexedDB + server cache (data/assets/) + auto-save on every streamed asset
12. Topup-style toast notifications + 2.5s providers/status polling with sync-blink
13. CollapsibleSection sidebar (all sections fold by default)
14. Pro Tip moved to top of form view; banner replaces its old slot

---

## Phase 5 — 30-Second AI Watchdog (2026-04-29)

### #95–97: Usage tracker infrastructure
- **`app/lib/usage/tracker.ts`** — atomic JSON event log at `data/usage.json`, 5000-event LRU cap
- **`app/lib/usage/aggregate.ts`** — per-provider rollups: 1h/24h success+failure counts, last-success/failure timestamps, traffic-light heuristic (green/amber/red/gray)
- **`app/api/usage/route.ts`** — admin-only GET endpoint returning enriched summaries + provider dashboard URLs
- **`app/api/suggest/route.ts`** — tracker wired on success and failure paths (classifyError maps error shapes to outcome buckets)

### #96: Wire tracker into all remaining AI routes
Files changed:
- `app/api/suggest-all/route.ts` — record success/failure around OpenAI completion
- `app/api/generate/route.ts` — record prompt (buildStyleDNA+buildPrompts) and per-image outcomes; added `inferProvider()` helper
- `app/api/regenerate/route.ts` — wrapped in try/catch, record image generation outcome
- `app/api/edit-asset/route.ts` — record GPT-4o-mini prompt rewrite outcome inside buildEditPrompt; record image gen outcome in route
- `app/api/build/[category]/generate/route.ts` — record expandPrompts outcome; record per-asset image gen outcome

### #98: `app/lib/modelHealth.ts` — health classifier
- Computes `{ status, priority, suggestForRemoval, reason }` for each model
- Status taxonomy: `active → healthy → subscribed → needs-key → preview-only → quota-out → stale → not-relevant`
- Priority scores: 0 / 10 / 15 / 30 / 40 / 70 / 85 / 90 (lower = shown first in picker)
- `suggestForRemoval = true` for stale and not-relevant

### #99: `app/components/useModelHealth.ts` — 30-second watchdog hook
- Polls `/api/usage` every 30 seconds (pauses when tab is hidden)
- Runs `computeAllModelHealth()` on every poll + any input change
- Diffs against previous health map; fires `onTransition` callback on status changes
- Triggers toast for quota-out and stale transitions

### #100: Sorted model list + health pills in HomeView
Changes to `app/project/page.tsx`:
- Raw model list (`rawModelOptions`) feeds the health hook; sorted list (`effectiveModelOptions`) is derived after
- Models auto-sort left-to-right by health priority (healthy first, not-relevant last)
- `HealthBadge` component renders Healthy / Quota out / Stale / No API / Preview pills on each model card
- Rose-tinted card background + "Suggested for removal" strip for stale/not-relevant models

### #101: Auto-failover in handleSubmit
- On quota/rate-limit error, finds next healthy image model (lowest priority, same role, not free-only)
- Retries once using `failoverModel` parameter (bypasses stale closure on selectedModel)
- Shows a toast naming both the failed model and the failover model
- `retriedOnceRef` flag prevents infinite retry loops

### #102: `app/components/UsagePanel.tsx` — AI Usage Monitor side-sheet
- Admin-only side-sheet accessible via sidebar "📊 AI Usage Monitor" nav item
- Shows per-provider cards: traffic-light pill, success/fail counts (1h + 24h), last success/failure timestamps, last failure reason
- Refresh button; links to each provider's dashboard
- Wired via `usageOpen` state + `onOpenUsage` prop in page.tsx / Sidebar

---

## Bug fixes (2026-04-29)

### Toast fix — Fill All fires every second
**Root cause**: `suggestField()` called `onPoweredBy` on every invocation; `suggestAll` calls `suggestField` for each of 25 empty fields → toast re-created 25 times with 4.5s timer reset each time → visual flash every ~0.3s.

**Fix** (`app/components/ProjectForm.tsx`):
- Removed `onPoweredBy` from inside `suggestField`
- Added `onPoweredBy` call to `handleSuggestSingle` (single-field ✦ button) — fires once per click
- Added `onFillAllStart?: () => void` and `onFillAllEnd?: () => void` props
- `suggestAll` calls `onFillAllStart()` once before the loop and `onFillAllEnd()` in `finally`

**Fix** (`app/project/page.tsx`):
- `onFillAllStart`: pushes a sticky toast via `toasts.push({ sticky: true, ... })`, stores toast id in `fillAllToastIdRef`
- `onFillAllEnd`: calls `toasts.dismiss(fillAllToastIdRef.current)` to clear it immediately when filling completes

### Toast fix — Generate Assets shows only image model
**Fix** (`app/project/page.tsx`):
- Replaced `toasts.poweredBy("Image generation", ...)` with a custom `toasts.push({ sticky: true, key: "generating-active", ... })` that includes both image model and animation model in the body
- Format: `Graphics: GPT-Image-1 (OpenAI)  ·  Animation: RunwayML Gen-3 Alpha (Runway)`
- Toast is dismissed via `toasts.clearByKey("generating-active")` on both success and error paths

---

## Pending

- #56 Smoke-test build wizard flows (utility-app + board-game) end-to-end

---

## Phase 6 — Pre-generation Machine Preview (2026-04-29)

### Goal
Stop one step before paid asset generation. Render a zero-token, themed slot machine mock so the user can validate styleDNA direction before burning tokens. Adds a "Preview" button next to "Generate Assets", an inline mock composite, and a double-click modal with embedded prompt-optimization textarea (free) + opt-in AI polish (paid).

### Tasks
- #103 Add PreviewSnapshot type + thread through SavedProject
- #104 Build themeSymbols.ts (keyword → emoji symbols map)
- #105 Build derivePreviewDNA.ts (form → DNA without API)
- #106 Build MachinePreviewComposite.tsx (zero-token SVG/CSS mock)
- #107 Build MachinePreviewModal.tsx with optimization textarea + opt-in AI polish
- #108 Wire Preview button into ProjectForm; render composite inline on click
- #109 Persist snapshot via IndexedDB; thread optimizedPrompt to /api/generate; show on results
- #110 Smoke-test full flow: fill form → preview → optimize → generate → verify alignment

### Mid-task addition (#111)
- #111 Build PreviewBuildingLoader.tsx — cinematic loader for both the brief mock-render moment (~900ms) and the AI Polish wait (~10s). Assembling reels animation, sparkle particles, rotating sub-messages, theme-tinted accent colors, shimmer-text headline, fill-bar progress.

### What shipped (Phase 6)
- `app/types/index.ts` — `PreviewSnapshot` interface + optional field on `SavedProject`
- `app/lib/themeSymbols.ts` — 8 theme buckets (egyptian/treasure/fantasy/scifi/ocean/asian/horror/generic) → emoji symbol sets + bucket-default palette
- `app/lib/derivePreviewDNA.ts` — `derivePreviewDNA(form)` + `buildMasterPromptFromForm(form)`. Pure client-side, no API
- `app/components/MachinePreviewComposite.tsx` — zero-token slot machine mock (frame, 3×5 reels, paylines, spin button, balance/bet/win UI). Compact + full sizes
- `app/components/MachinePreviewModal.tsx` — fullscreen modal with composite + master prompt textarea + Save Optimisation (free) + Polish with AI (paid, opt-in)
- `app/components/PreviewBuildingLoader.tsx` — cinematic loader with assembling reels, sparkle particles, shimmer text, rotating sub-messages
- `app/globals.css` — 5 new keyframes (sparkle-float, shimmer-text, loader-fill-fast/slow, reel-assemble, line-fade)
- `app/components/ProjectForm.tsx` — Preview button (visible only when isValid) calling `onPreview`
- `app/project/page.tsx` — `previewSnapshot` + `previewModalOpen` + `previewBuilding` state, handlers (handlePreview/handleSaveOptimization/handlePolished), inline composite below form, modal mount, snapshot card on results, persists in IndexedDB via SavedProject, restores on project load, clears on handleReset
- `app/api/generate/route.ts` — accepts `optimizedPrompt` in body, threads to buildStyleDNA + buildPrompts
- `app/lib/promptBuilder.ts` — `buildStyleDNA` accepts `optimizedPrompt`, injects via `injectOptimization()` into the `mood` field so every per-asset prompt downstream picks it up automatically

---

## Phase 7 — Diversity & fresh-project hygiene (2026-04-29)

### Why
Two tightly-related complaints:
1. AI Fill All produced the same Egyptian/treasure brief on every empty form because GPT-4o-mini at default temperature collapses to its most-likely output.
2. Sidebar "New Project" / "Asset Generator" / "AI Prompt Assist" only changed `step`, leaving stale `result`, `assets`, `submittedForm`, `previewSnapshot` behind — so navigation didn't feel like starting over.

### Tasks
- #112 Build innovativeSlotSeeds.ts — 50+ trending 2026 slot directions
- #113 Inject diversity + temperature into /api/suggest-all
- #114 Apply diversity logic to single-field /api/suggest
- #115 Wire all "New Project" entrypoints to handleReset() (full clear)

### What shipped
- `app/lib/innovativeSlotSeeds.ts` — 50+ curated seeds (cosmic yakuza, bio-neon coral reef, quantum mariachi, afrofuturist pharaoh, cottagecore necromancer, …) + `pickInnovativeSeed()` + `ANTI_CLICHE_GUARD` constant
- `app/api/suggest-all/route.ts`:
  - Detects sparseness (≤1 of theme/gameName/targetAudience/artStyle filled)
  - Sparse: temperature 1.05, inject one creative seed, anti-cliché guard, request_nonce
  - Rich: temperature 0.7, no seed, "align tightly to user's choices"
- `app/api/suggest/route.ts` — same dual-mode logic for single-field ✦
- `app/project/page.tsx` — `onNewProject` and `onCreateProject` now call `handleReset()` before `setStep("form")`, clearing result/assets/submittedForm/previewSnapshot/etc.

### Behaviour
- Empty Fill All on visit 1 → Cosmic Yakuza brief
- Empty Fill All on visit 2 → Cottagecore Necromancer brief
- Empty Fill All on visit 3 → Brazilian Carnaval Ascension brief
- Partially filled (e.g. user typed "Norse mythology"): AI extends Norse coherently, no random seed
