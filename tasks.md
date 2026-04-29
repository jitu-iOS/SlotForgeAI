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
