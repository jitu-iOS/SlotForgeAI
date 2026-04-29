# SlotForge AI — Working Context

This file captures the context behind each user instruction before execution. New instructions append a new dated section. Older sections stay as a record.

---

## 2026-04-28 · Visual polish: wider sidebar, larger fonts, premium feel

### User instruction
> "increse font size and increase the left panel width and adjust website space and make it highly optimised look and visually appealing international favour"

### What "international flavour" / "premium SaaS" implies here
- Generous breathing room — bigger paddings, no cramped 10–11px text
- Sidebar wide enough to hold full-length labels without truncation
- Typography hierarchy that reads cleanly at a glance (clear h1/h2/body separation)
- Letter-spacing on uppercase eyebrows (Linear / Vercel / Stripe SaaS style)
- Main content given room to breathe (max-w-6xl, not 5xl)

### Concrete current sizes vs target

| Area | Before | After |
|---|---|---|
| Sidebar width | `w-[220px]` | `w-[280px]` |
| Logo block | `w-9 h-9`, text-sm title | `w-11 h-11`, text-base title |
| Nav items | `text-xs px-3 py-2` | `text-sm px-3.5 py-2.5` |
| Section dividers | `text-[10px]` | `text-[11px]` with wider tracking |
| Slot Type picker chips | `text-[10px] py-2` | `text-xs py-2.5` |
| Image Model trigger | `text-xs` | `text-sm` |
| Main content max width | `max-w-5xl` | `max-w-6xl` |
| Main content padding | `px-8 py-8` | `px-10 py-10` |
| Dashboard hero h1 | `text-3xl` | `text-4xl` |
| Form section headers | `text-sm uppercase` | `text-base uppercase` |
| Form field labels | `text-xs` | `text-sm` |
| Form inputs | `text-sm py-2.5` | `text-base py-3` |
| Slot config banner | small icons + text | larger icon, two-column facts |

### Risks / what to NOT regress
- The dropdown selection bug fix (ref + mousedown click-outside) must keep working — don't reintroduce stopPropagation patterns
- Subscribe-button placement and modal flow stay intact
- Slot Type picker stays pinned at bottom above Image Model picker
- `selectedModel` highlight and ✓ check stay visible
- 6 curated models, not 13

### Tasks (created)
- #11 Widen sidebar to 280px + bump sidebar font sizes
- #12 Expand main content width + padding
- #13 Bump dashboard hero + cards
- #14 Enlarge form typography + inputs

---

## 2026-04-28 · Swap to animation-capable models + quota-exhausted visual

### User instruction
> "Remove ideogram and recraft from Ai models and add some Models with Animation generation capabilities like runwayml and rest your preference. If Also change the color of model image to somewhat highlighting and that should indicate that the API credit exhausted or limit reached"

### Two parts

**Part A — model list swap.** Remove Ideogram v3 and Recraft v3. Add models that produce **video / animation** (key for slot intros, ambient parallax, win bursts, symbol micro-animations). User explicitly named RunwayML; "rest your preference" is open.

**Part B — quota-exhausted highlighting.** Today the model card shows green (Active) or amber (Needs API key). We need a third state — **red / "Quota exhausted"** — when a provider's API has already hit its credit limit. Detect lazily from the actual error responses (we already see OpenAI's `insufficient_quota` 429 from /api/suggest), persist that knowledge client-side (sessionStorage), and reflect it on every card showing that provider.

### My picks for animation models (with reasoning)

| Model | Why for slot art | Provider | Billing | Cost |
|---|---|---|---|---|
| **RunwayML Gen-3 Alpha** | Cinematic 10–16s clips — perfect for game intros, bonus-trigger reveals, jackpot animations | Runway (direct API) | app.runwayml.com | ~$0.05/sec (~$0.50 for 10s) |
| **Luma Dream Machine (Ray-2)** | Smooth 5–9s loops — ambient parallax backgrounds, looping FX | Luma (direct API) | lumalabs.ai/dream-machine/api | ~$0.40 for 5s 720p |
| **Kling 2.1 Master** | Strong character / symbol animation, runs via Replicate (no new provider) | Kuaishou via Replicate | replicate.com/account/billing | ~$1.30 for 5s 1080p |

Image models kept (curated to 4): GPT-Image-1 · FLUX 1.1 Pro Ultra · FLUX 1.1 Pro · Stable Diffusion 3.5. **Total = 7 models.**

### Concrete changes

| Layer | Change |
|---|---|
| `app/types/index.ts` | Drop `ideogram-v3`, `recraft-v3`. Add `runway-gen3`, `luma-dream-machine`, `kling-2.1`. |
| `app/lib/slotTypeConfig.ts` | No change (slot-type configs are model-agnostic). |
| `app/lib/mockImageGenerator.ts` | Drop ideogram/recraft Replicate map entries. Add Kling via Replicate. Stub Runway and Luma branches → placeholder for now (real video pipeline is a follow-up; this avoids silent fallback to OpenAI). |
| `app/project/page.tsx` | MODEL_OPTIONS swap, ProviderKey gains `runway` + `luma`, billing URLs, Subscribe button labels. |
| `app/api/providers/status/route.ts` | Report `runway` and `luma` configured-status (env keys: `RUNWAY_API_KEY`, `LUMA_API_KEY`). |
| Quota state | New page-level `quotaExhausted: Record<ProviderKey, boolean>` in sessionStorage. `ProjectForm` already surfaces `insufficient_quota` errors — wire them to update this state and propagate down. |
| Model card visuals | New helper `modelStatus(model, providerStatus, quotaState)` → "active" / "needs_key" / "quota_exhausted". Card border + status dot + chip color shift to **rose-500** when quota exhausted. Subscribe button label changes to "Top up — Quota exhausted ↗" (red gradient). |

### Risks
- Adding Runway/Luma backends without wiring will produce confusing "generated placeholder" results if user picks those models. Mitigation: console.warn + UI hint that video generation is a planned follow-up; for now the tool still produces static frames.
- Replacing Ideogram (great at text rendering for slot UI) means no model in the curated list is specifically optimized for typography. GPT-Image-1 is the best remaining for that.

### Tasks
- #15 Add context.md section + memory note (this commit)
- #16 Update ImageModel type + ProviderKey (add runway, luma; drop ideogram, recraft)
- #17 Update MODEL_OPTIONS in page.tsx with the new 7-model list and new providers' billing URLs
- #18 Update mockImageGenerator (drop ideogram/recraft, add Kling via Replicate, stub Runway/Luma)
- #19 Update /api/providers/status to expose runway + luma configured flags
- #20 Add quotaExhausted state in ProjectPage + persist via sessionStorage; wire ProjectForm's existing insufficient_quota detection up to it
- #21 Add quota_exhausted visual state (rose color, red dot, "Quota exhausted" chip, red Subscribe gradient) across dropdown rows + dashboard cards + sidebar trigger

---

## 2026-04-28 · Remove FLUX 1.1 Pro (user said "FLUX 1.0 pro")

### User instruction
> "remove FLUX 1.0 pro"

### Interpretation
There is no model literally named "FLUX 1.0 Pro" in our list. Closest match is **FLUX 1.1 Pro** (the non-Ultra one). The user almost certainly means that — the Ultra variant is staying. If the intent was different, they'll tell me and I'll restore.

### Change
- Drop `flux-1.1-pro` from `ImageModel` union
- Drop the corresponding entry from `MODEL_OPTIONS`
- Drop the entry from `REPLICATE_MODELS` map in `mockImageGenerator`

After this: 6 models remain (3 image + 3 animation).

### Tasks
- #22 Remove FLUX 1.1 Pro across types, MODEL_OPTIONS, generator map

---

## 2026-04-28 · Distinguish "subscribed" models visually

### User instruction
> "subscribed AI models should be highlighted differently"

### Interpretation
We currently have three model states with distinct styling — `active` (green), `needs_key` (amber), `quota_exhausted` (red pulse). The user wants a fourth state — **"subscribed"** — to indicate models the user has already paid for / opened the billing page for.

Since this is an internal tool with no real subscription backend, "subscribed" maps to: the user has clicked the **Subscribe / Top up** button at least once. That's a real signal — they've intentionally taken the action that links them to that provider's billing.

### Implementation
- New page-level `subscribedModels: ImageModel[]` persisted to localStorage
- Recorded when the Subscribe button on a row or modal is clicked
- New visual state takes priority over `active` but lower than `quota_exhausted`:
  - Cyan/teal accent (distinct from green-active and red-exhausted)
  - "Subscribed" chip with a small ✓
  - Subtle teal glow on the card border
- Added to `ActivationBadge` as a fourth state
- Doesn't replace the active green check — both can show together for the currently selected + subscribed model

### Tasks
- #23 Add `subscribedModels` state with localStorage persistence
- #24 Wire onSubscribeModel to record subscription
- #25 Add `subscribed` visual state across dropdown, dashboard cards, sidebar trigger

---

## 2026-04-28 · Rename brand to "SlotForge AI - Internal"

### User instruction
> "rename SlotForge Ai to SlotForge AI - Internal"

### Why
Signals to anyone seeing the UI (collaborators, stakeholders, screenshots) that this is the internal-tooling instance, not a public-facing product. The "Internal" suffix is the standard way teams flag this — Stripe, Vercel etc. ship internal admin UIs labelled the same way.

### Surfaces to update

Found via grep:
- `app/layout.tsx:16` — HTML `<title>` metadata
- `app/project/page.tsx:166` — `document.title` template (used when game name is set/cleared)
- `app/project/page.tsx:624` — Sidebar logo text
- `app/not-found.tsx:15` — 404 page back-link

Not touching:
- `context.md` heading (this file is internal docs, not user-facing)
- `package.json` `name: "slotforge-ai"` (npm package id; the dash makes it valid; keeping as-is avoids breaking imports/scripts)

### Visual treatment in sidebar
The current logo block has `SlotForge AI` as the title and `Slots Generator` as a tracked-out subtitle. With "- Internal" added, it'll wrap awkwardly at 280px. Plan: title becomes `SlotForge AI` and the subtitle changes to a small **Internal** chip/badge next to or under the title to keep the typography tight rather than running the whole thing on one line.

### Tasks
- #26 Rename across layout, page.tsx, not-found.tsx; reshape sidebar logo block to badge "Internal"

---

## 2026-04-28 · Theme switcher with 5 sophisticated themes

### User instruction
> "In the left panel there should an option change theme and please give 4-5 best options to switch Bg color and table color or multiple color world class and shophisticated look templates, if the user clicks on it it will change the entire theme but set one theme as the default theme"

### The 5 themes I picked (all sophisticated dark aesthetics; one casino-light option)

| Theme | Vibe | Page bg | Sidebar bg | Accent | Inspiration |
|---|---|---|---|---|---|
| **Midnight Indigo** *(default — current)* | Deep tech-luxury | `#09090f` | `#0e0c1e` | indigo→purple | Linear / current SlotForge |
| **Slate Sapphire** | Pro engineering dark | `#0d1117` | `#11161e` | sky→blue | GitHub Dark · Vercel |
| **Obsidian Gold** | Casino premium | `#0a0a0a` | `#0f0e0a` | amber→gold | Las Vegas high-roller |
| **Forest Emerald** | Sophisticated calm | `#0a0f0d` | `#0c1512` | emerald→teal | Spotify · Stripe (dark) |
| **Dusk Rose** | Warm boutique | `#0f0a0c` | `#150d11` | rose→pink | Apple HIG dark · Notion Pro |

**Default = Midnight Indigo** (no visual change on first load).

### Implementation strategy

CSS-vars-based theming, low-risk approach:
1. `globals.css` defines `--bg-page`, `--bg-sidebar`, `--bg-elevated`, `--accent-from`, `--accent-to`, `--accent-text`, `--border-soft` under `[data-theme="..."]` selectors.
2. ProjectPage manages `theme` state (localStorage-persisted), applies `document.documentElement.dataset.theme` on change.
3. Root container, sidebar, breadcrumb, dropdown panel, modal — swap hardcoded hex (`bg-[#09090f]` etc.) to `bg-[var(--bg-page)]`.
4. Primary gradients (logo block, "✦ New Project", "Generate Assets", default Subscribe button) swap to `bg-gradient-to-r from-[var(--accent-from)] to-[var(--accent-to)]`.
5. Quota-exhausted (red) and Subscribed (cyan) state colors stay hardcoded — those communicate state, not brand, and shouldn't drift with theme.

### UI: ThemePicker placement

Compact 5-dot strip pinned at the bottom of the sidebar **above the Slot Type picker**, using each theme's accent gradient as the dot's fill. Active theme has a white ring around it. Tooltip names the theme. Saves vertical space (~28px) versus a full button grid while staying discoverable.

### Tasks
- #27 Add Theme type + 5 themes' CSS vars in globals.css
- #28 Add theme state with localStorage + apply data-theme to html
- #29 Add ThemePicker (5-dot strip) to sidebar above Slot Type
- #30 Swap key surfaces (root, sidebar, dropdown panel, modal, primary gradients) to CSS vars

### Risks
- Some surfaces use Tailwind opacity-on-white (`bg-white/[0.04]`) which doesn't change with the underlying bg's hue — but since alpha-on-color is what we want for translucent panels, this is correct, not a bug.
- Switching themes mid-session won't repaint hardcoded `text-indigo-*` classes scattered through cards. Acceptable for v1 — section eyebrows and chips stay indigo as a brand-anchor.

---

## 2026-04-28 · Back button + abort-with-confirm

### User instruction
> "Add backbutton at the right side of of generate assets page so that user can move back to home page. Also implment a rule in case user is generating assets and by mistake he pressed the back button what should happen ? Handle appropriately"

### Two parts

**Part A — back button.** A right-aligned "← Back to Dashboard" CTA in the breadcrumb so the user can return to the Dashboard from the form / loading / results / slot-preview views. Currently a similar button exists ONLY on `step === "results"` (labelled "← New Project") — and the loading step doesn't even render a breadcrumb. So we need to: (1) extend the breadcrumb to render during loading, (2) add a back-to-dashboard button on every non-home step.

**Part B — abort safety.** If the user is mid-generation and clicks the back button, we must NOT silently throw away their in-flight work. Show a confirmation modal:
- Title: "Generation in progress"
- Body: "Going back will cancel the current generation. Already-finished assets will be discarded. Continue?"
- Cancel (default focus) → stay on the loading/results page
- Confirm → call `abortRef.current?.abort()`, reset state, `setStep("home")`

We already have the abort plumbing — `handleReset` calls `abortRef.current?.abort()` and resets all state. So the only new logic is the *gate* before that runs.

### "When is the user generating?"
The page already computes:
```ts
const isGenerating = step === "loading" || (step === "results" && regeneratingIds.size > 0);
```
That's the right signal — covers both the initial SSE stream AND in-flight per-asset regenerations on the results page. Use it as the gate.

### UX details
- Back-button label: **"← Back to Dashboard"** (plain — same on every step for consistency).
- Position: right side of the breadcrumb bar, replacing the existing "← New Project" button on the results step (it was just confusing since "New Project" is what the SIDEBAR button does).
- Modal: reuse the same dark-glass treatment as the SubscriptionModal (consistent visual language).
- Don't intercept the browser's native back button — that's out of scope and tricky with Next.js routing. Just our in-app button.

### Tasks
- #31 Add `BackConfirmModal` component (cancel = default focus, confirm = abort+reset+home)
- #32 Add `navigateHome` handler in ProjectPage with isGenerating gate
- #33 Render breadcrumb on loading step too; add "← Back to Dashboard" right-button on every non-home step
- #34 Wire to handleReset (which already has abort) when user confirms

### Risks
- Replacing "← New Project" on results means user loses one-click access to a fresh project from there. Mitigation: the sidebar's prominent "✦ New Project" button still exists and is more discoverable. Acceptable.
- Aborting fetch mid-stream: already tested by the existing handleReset path. No change to abort behaviour itself.

---

## 2026-04-28 · Fix theme switcher (CSS vars stripped by Tailwind v4)

### User instruction
> "On switching the theme color, it didn't reflect on the website. Please fix it"

### Root cause (verified by inspecting compiled CSS)
Tailwind v4's CSS pipeline stripped the bare `:root, [data-theme="..."] { ... }` rule blocks from `app/globals.css`. The Tailwind utility classes that *reference* those vars (e.g. `.bg-\[var\(--bg-page\)\] { background-color: var(--bg-page); }`) compiled correctly — but `--bg-page` and friends are never **defined** anywhere in the served CSS, so they resolve to nothing.

Verification: `curl /_next/static/chunks/...css | grep "data-theme"` returns zero hits, while `grep "var(--bg-page)"` returns the utility class rules. The vars are declared in `:root` originally (default theme), but the per-theme overrides were silently dropped.

This is a Tailwind v4 layering quirk — top-level CSS that isn't in a recognized `@layer` may be filtered. The fix is wrapping the theme-vars block in `@layer base { ... }` so it's explicitly preserved.

### Fix
- Wrap all `[data-theme="..."]` blocks in `@layer base { ... }` in `app/globals.css`.
- Verify post-fix that `data-theme="slate-sapphire"` appears in the compiled CSS chunk.

### Risks
- None — `@layer base` is the canonical Tailwind v4 location for custom CSS that should ship.
- The `body { background: ... }` rule still works (it was preserved because it's a plain element selector that Tailwind v4 keeps).

### Tasks
- #34 Wrap theme-vars in `@layer base`, verify with curl

---

## 2026-04-28 · Fix subscribe-click optimistically marking Subscribed

### User instruction
> "When I clicked to subscribe FLUX 1.1 Pro Ultra or any other Ai models, it sent me to another webpage for billing But I was little bit confused and cancelled the transaction but on the AI model, the status shows Subscribed. fix it if it looks like a bug"

### Bug
Clicking the Subscribe / Top-up button does two things at the same time:
1. Opens the provider's billing page in a new tab (correct).
2. Immediately calls `markSubscribed(model)` and persists it to localStorage (wrong — premature).

If the user cancels at the provider's billing page, we have no way to learn that, but the model is already marked as Subscribed. The marker is a lie.

### Why the original design did this
We can't observe what happens in another tab, so optimistic marking was the lazy proxy. But it's not how this should work — Subscribed should mean "user actually completed the subscription," and we should ASK before recording.

### Fix
1. **Don't** mark as Subscribed on click. Instead set a `pendingConfirmation: ImageModel | null` state and open the billing tab.
2. Render a **SubscribeConfirmModal** that asks "Did you complete the subscription with [Provider]?" with three buttons:
   - **Yes, I subscribed** → call `markSubscribed(m)`
   - **No, I cancelled** → leave subscribed state untouched
   - **Decide later** → close the modal; user can re-trigger by clicking Subscribe again
3. If the user clicks Subscribe on a model that's *already* Subscribed, the existing flow stays (open billing tab as a "Manage subscription" path, no modal — they're just topping up).
4. Add an **Unsubscribe** affordance: a small × on the cyan "Subscribed" chip → clears the marker if it was set in error.

### Risks
- Modal fatigue: this adds an extra step on every subscribe. Mitigation: "Decide later" button so the modal can be dismissed without commitment, and the modal only appears when not-yet-subscribed.
- Race condition: the modal opens immediately after the new tab is spawned. Some users may answer before they've actually visited the provider page. Acceptable — they can re-trigger if they're confused.

### Related issue (same root cause) — also fix
> "And in the Image Model in left panel, it shows FLUX 1.1 PRO ULTRA, how come?"

The same Subscribe-click handler ALSO calls `setSelectedModel(m)` immediately. So clicking "Subscribe" on FLUX changed the user's active Image Model in the sidebar trigger, even though they cancelled the transaction. Same premature optimism.

**Fix the same way:** don't change `selectedModel` on Subscribe click either. Promote the model to selected only when the user confirms via the modal — at that point they've invested in it, so making it the default is reasonable.

### Tasks
- #35 Replace immediate markSubscribed + setSelectedModel with pendingConfirmation state
- #36 Build SubscribeConfirmModal (Yes confirms both subscription + selection / No / Decide later)
- #37 Add × unsubscribe affordance on the Subscribed chip

---

## 2026-04-28 · Block Subscribed marker when API key isn't on server

### User instruction
> "If there is no api key, then subscription state shouldn't changed to subscribed"

### Why this is right
"Subscribed" should mean "ready to use." A model can't be used until the dev's `.env.local` has the API key — even if the user has paid the provider. Today, clicking "Yes, I subscribed" in the confirm modal marks the model Subscribed unconditionally; if the key isn't configured server-side, you get the contradictory pair: **Needs API key + Subscribed ✓** chip on the same card.

### Fix
Gate `markSubscribed` on `providerStatus[providerKey].configured === true`:
1. In `SubscribeConfirmModal`, when the provider's key isn't configured, **disable** the **"Yes, I subscribed"** button and surface an inline note: *"OPENAI_API_KEY (or whichever env var) isn't on the server yet. Add it to `.env.local`, restart the dev server, then click Subscribe again."*
2. The other two buttons (No / Decide later) stay enabled — user can still dismiss.
3. As a defence in depth, the page-level `markSubscribed` callback also no-ops if the key isn't configured, so the bug can't sneak in via any other code path.

### Risks
- Users who legitimately paid the provider but the dev hasn't yet added the key will see "Subscribed" as unavailable. Acceptable — the modal explains exactly what to do, and once the key lands they re-click Subscribe and confirm.
- The existing × unsubscribe affordance from the previous fix still works for clearing stale markers.

### Tasks
- #38 Disable "Yes, I subscribed" in modal when provider key isn't configured + add explanatory message
- #39 Defence-in-depth: gate markSubscribed at the page level

---

## Workflow note (set 2026-04-28)
For every new user instruction:
1. Pause before editing.
2. Append a new dated section to this file with: the verbatim instruction, the *why*/intent, concrete before/after if applicable, and risks.
3. Create TaskCreate tasks that map 1:1 to the planned changes.
4. Then execute, marking tasks in_progress / completed as I go.

---

## 2026-04-28 · Full-stack Auth & User Management (RBAC) with A+ animated UX

### User instruction
> "We have a new context, read it understand it add to context.md as new section make task and go ahead globally apealing A plus preview and animation experince should be there /Users/admin/Downloads/auth_system_requirements.pdf"

### Source PDF — what it specifies
Full-stack authentication & user management with strict RBAC. Highlights:
- **Roles**: SUPER_ADMIN (pre-seeded from env), ADMIN (manage users), USER (restricted)
- **Init**: SUPER_ADMIN seeded on first startup from `ADMIN_EMAIL` + `ADMIN_PASSWORD` (no first-user logic)
- **Auth**: email + password login, bcrypt/argon2 hash, JWT in HTTP-only secure cookies
- **No public signup** — only ADMIN/SUPER_ADMIN create users
- **Dashboard**: Profile tab (all users), Users tab (admin only — list, create, role, status, reset password)
- **DB schema**: User { id UUID, name, email unique, password_hash, role enum, status enum, created_at, updated_at }
- **API**: `POST /auth/login`, `POST /auth/logout`, `POST /auth/change-password`, `GET /users`, `POST /users`, `PATCH /users/:id/role`, `PATCH /users/:id/status`, `POST /users/:id/reset-password`
- **Security**: rate-limit login, input validation, prevent role escalation, HTTP-only secure cookies
- **UI**: modern professional login, consistent theme, clean dashboard

Plus the user explicitly emphasised: *"globally appealing A plus preview and animation experience"* — login page and dashboard must look and feel premium, with tasteful motion (no gimmicks).

### Architecture (in this Next.js 16 codebase)
This project has no separate backend — auth lives inside the same Next.js app using Route Handlers + a `proxy.ts` (Next.js 16's renamed middleware) for route protection.

| Layer | Choice | Why |
|---|---|---|
| Persistence | JSON file at `data/users.json` (gitignored), atomic write via temp file + rename | Zero native deps; matches the internal-tool footprint; satisfies the schema semantically. Easy migrate to SQLite later if needed |
| Password hash | `bcryptjs` (pure JS, ~12 rounds) | Works in Node runtime without native bindings. PDF accepts bcrypt OR argon2 |
| JWT | `jose` | Edge-runtime compatible (proxy.ts defaults to edge); HS256 with `JWT_SECRET` env |
| Cookie | `sf_session` — HTTP-only, Secure (in prod), SameSite=Lax, 12h | Matches PDF "secure cookies" requirement |
| Route gate | `proxy.ts` (Next.js 16 — was `middleware.ts`) | Verify JWT, redirect unauthenticated users on `/project` and `/dashboard` to `/login` |
| Validation | Hand-rolled type-narrowing + zod-style guards in `validators.ts` | Avoid adding zod just for a few endpoints |
| Rate limit | In-memory token bucket per IP, `5 attempts / 15 min` for `POST /auth/login` | Simple, no external store. Fine for single-instance internal tool |
| Role enforcement | `requireRole(req, [...allowed])` helper used inside every privileged route | Defence-in-depth — proxy.ts only redirects, route handlers also verify |

### File map (new)
```
proxy.ts                                    ← NEW — Next.js 16 (was middleware.ts)
data/                                       ← gitignored JSON store
└── users.json
app/lib/auth/
├── db.ts                                   ← user CRUD on JSON file (atomic write)
├── passwords.ts                            ← bcryptjs wrapper
├── jwt.ts                                  ← jose sign/verify
├── session.ts                              ← getSessionUser() server-helper
├── init.ts                                 ← seedSuperAdmin() on first request
├── rateLimit.ts                            ← in-memory bucket
└── validators.ts                           ← input shapes
app/api/auth/
├── login/route.ts
├── logout/route.ts
├── change-password/route.ts
└── me/route.ts                             ← who-am-I (used by client to hydrate)
app/api/users/
├── route.ts                                ← GET list, POST create
└── [id]/
    ├── role/route.ts                       ← PATCH
    ├── status/route.ts                     ← PATCH
    └── reset-password/route.ts             ← POST
app/login/page.tsx                          ← animated, A+ premium login
app/dashboard/
├── page.tsx                                ← shell with tab switching
└── components/
    ├── ProfileTab.tsx
    ├── UsersTab.tsx
    └── CreateUserModal.tsx
app/types/auth.ts                           ← Role, Status, User, AuthUser
```

### "A+ preview + animation experience" — concrete moves
- **Login page**: animated multi-stop gradient mesh background (CSS `@keyframes` blob drift), glass card with backdrop-blur, label-floating inputs, button with shimmer on hover, error shake animation on bad creds, success morph (button → checkmark) before redirect.
- **Dashboard**: tab switch is a slide+fade (translateX 8px → 0 + opacity), users-table rows stagger-fade-in on load, modal opens with scale 0.96 → 1 + opacity, role/status pill chips animate color on change.
- **Micro-interactions**: focus ring inherits theme accent (already CSS-vars-driven); destructive actions (disable user / reset password) require a confirm modal with the same dark-glass treatment used elsewhere.
- **Loading**: skeleton rows in users table (already have shimmer keyframe), inline spinner on submit buttons.
- **Theme consistency**: reuse the existing 5-theme CSS-vars system — login page also responds to `data-theme`. Default theme on login is Midnight Indigo.

### Environment additions
```
JWT_SECRET=<generate: openssl rand -base64 48>
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<set on first run, hashed at boot, never logged>
ADMIN_NAME="System Owner"           ← optional, default "System Owner"
```

### Security guardrails (specific)
- **Role escalation prevention**: `PATCH /users/:id/role` — only SUPER_ADMIN can grant SUPER_ADMIN; ADMIN can promote/demote between USER↔ADMIN; nobody can demote the last SUPER_ADMIN.
- **Self-demotion**: a user can NOT change their own role or status (avoids lockout).
- **Password change**: requires old password match before write; min 8 chars, must contain a digit + letter.
- **Reset password**: admin-only; generates a random temp password, returns it ONCE in the API response (admin shows it to user); user must change on next login (flag `must_change_password` on the user record).
- **Email normalization**: lowercase + trim before storage / compare.
- **Disabled users**: cannot log in (returns generic "invalid credentials" — same response as wrong password to avoid user enumeration).
- **Rate limit**: 5 failed attempts / 15 min per IP+email pair → 429 with `Retry-After`.

### Risks / what to NOT regress
- The existing `/project` flow stays fully functional — only added: a JWT cookie check in proxy.ts. No changes to generation flow.
- Theme switcher must continue working on `/login` and `/dashboard` (use the same CSS vars + `[data-theme]` mechanism).
- `proxy.ts` runs on the Edge runtime by default — bcryptjs CANNOT run there. Token *verification* is fine (jose works in edge), but password operations must stay in Node API routes.
- Next.js 16 dynamic params are `Promise<{ id: string }>` — must `await params` in route handlers (different from older Next versions).
- Don't break the existing `next.config.ts` `/ → /project` redirect — instead, gate `/project` in proxy.ts so unauthenticated `/` traffic ends up at `/login`.
- `data/users.json` MUST be gitignored — adding to `.gitignore`.

### Tasks
- #40 Append this context.md section + write memory note about Next.js 16 `proxy.ts` rename
- #41 Add deps: `bcryptjs`, `jose`, `@types/bcryptjs`
- #42 Create `app/types/auth.ts` (Role, Status, User, AuthUser) + `data/` gitignore entry
- #43 Implement `app/lib/auth/db.ts` (JSON atomic store) + `passwords.ts` + `jwt.ts` + `session.ts` + `init.ts` + `rateLimit.ts` + `validators.ts`
- #44 Implement `proxy.ts` — JWT verify, redirect unauthenticated `/project` and `/dashboard` to `/login`; redirect authenticated `/login` → `/dashboard`
- #45 Implement `/api/auth/login`, `/logout`, `/change-password`, `/me` route handlers
- #46 Implement `/api/users` (GET, POST), `/api/users/[id]/role` (PATCH), `/status` (PATCH), `/reset-password` (POST) with strict RBAC + role-escalation guards
- #47 Build `/login` page — animated gradient mesh, glass card, label-floating inputs, error-shake, success morph
- #48 Build `/dashboard` page — header with user chip + theme picker + logout, tab switcher (Profile / Users), Profile tab (name+email+change-password), Users tab (table, create-user modal, role/status pills with confirm, reset-password)
- #49 Add `.env.example` documenting JWT_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
- #50 Smoke-test in browser: login → dashboard → create user → role change → reset password → logout → re-login as new user → confirm Users tab is hidden for USER role

---

## 2026-04-28 · API Keys panel — manage AI provider keys in-app

### User instructions (verbatim, two messages)
> "I am adding some extra tasks. In the left panel there is API Keys which is unused. Can we use it like whatever A when we click on it it will open a panel where we can add api keys of subscribed AI models and website will point to it and access those api keys from that panel and help me use Any AI models"
> "If possible then make context, create tasks and go ahead with robus plans"

### Today's state
The sidebar already shows a `🔑 API Keys` nav item (`app/project/page.tsx:883`) but it's wired to `onClick={() => {}}` and labelled `comingSoon`. Today the only way to point the app at a different OpenAI / Replicate / Runway / Luma key is to edit `.env.local` and restart the dev server — slow, and requires file access.

The app already has 7 providers/billing endpoints wired up (OpenAI, Replicate, Runway, Luma) and a `/api/providers/status` endpoint that reports whether each env var is configured. We should now allow users to set/override those keys at runtime from inside the app.

### What "robust" means here (and what we are NOT doing)
**A bad version** would: store the keys in `localStorage` and ship them to the browser. That exposes paid API keys to anyone with devtools, and any extension installed in the user's browser. Hard no.

**The robust version:**
- Keys live **only on the server**, in an encrypted JSON file at `data/api-keys.enc.json` (gitignored).
- The browser NEVER sees a raw key. The /api/providers/status endpoint returns `{ source: "env" | "panel" | "none", masked: "sk-...4ab2" }` — display-only.
- Every existing AI route handler (`/api/generate`, `/api/regenerate`, `/api/suggest`, `/api/suggest-all`, `/api/edit-asset`, `/api/providers/status`) reads keys via a new `getProviderKey(name)` helper that prefers panel-set keys, falls back to env vars.
- Panel access is **gated to ADMIN + SUPER_ADMIN** (the auth system being shipped in the previous section). USER role can use the keys (they're loaded server-side regardless) but cannot view or edit them.
- A "Test" button on each provider hits a low-cost provider endpoint (e.g. `GET https://api.openai.com/v1/models`) to verify the key works before saving. Bad keys are surfaced inline.
- Encryption: AES-256-GCM with a key derived from `KEY_VAULT_SECRET` env var (separate from JWT_SECRET). If KEY_VAULT_SECRET is missing, the panel refuses to save with a clear error — better than silently storing plaintext.

### Schema — `data/api-keys.enc.json`
```jsonc
{
  "version": 1,
  "entries": {
    "openai":    { "ciphertext": "...", "iv": "...", "tag": "...", "lastFour": "ab2c", "updatedAt": "ISO", "updatedBy": "<userId>" },
    "replicate": { ... },
    "runway":    { ... },
    "luma":      { ... }
  }
}
```

### API surface
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/api-keys` | ADMIN+ | List entries with `{ provider, source, lastFour, updatedAt }` — never raw keys |
| PUT | `/api/api-keys/:provider` | ADMIN+ | Body `{ key }`. Tests the key, encrypts, persists |
| DELETE | `/api/api-keys/:provider` | ADMIN+ | Removes panel override (falls back to env var if present) |
| POST | `/api/api-keys/:provider/test` | ADMIN+ | Body `{ key? }`. Tests current-stored OR provided key without persisting |

### Server-side wiring
- New `app/lib/keys/vault.ts` — encrypt/decrypt + atomic write (mirrors `auth/db.ts` pattern).
- New `app/lib/keys/providerKey.ts` exporting `async function getProviderKey(name: ProviderKey): Promise<string | null>` — checks vault first, then `process.env.OPENAI_API_KEY` etc.
- Refactor `app/lib/mockImageGenerator.ts` and the `/api/suggest*` route handlers to call `getProviderKey()` instead of reading `process.env` directly.
- Update `/api/providers/status` to report `source: "panel" | "env" | "none"` for each provider — drives a small badge on the model cards ("Set via panel" vs the existing "Set in .env").

### Client UI — the panel
**Trigger**: clicking `🔑 API Keys` in sidebar opens a slide-in side sheet from the right (not a modal — modals already exist for Subscribe + BackConfirm; visual differentiation matters).

**Layout** (from top):
1. Header: "API Keys" title, subtitle "Stored encrypted on the server. Never sent to your browser."
2. Status chip: "Encryption: ✓ enabled" (green) or "✗ KEY_VAULT_SECRET missing" (rose, with copyable command to generate one).
3. Per-provider card (4 cards: OpenAI, Replicate, Runway, Luma). Each card shows:
   - Provider logo + name
   - Source badge (`Panel` / `Env` / `Not set`)
   - Last-4 of stored key (or "—" if not set)
   - Updated at + by-whom
   - **Edit** button → reveals an input with placeholder `sk-...` and Save/Test/Cancel buttons
   - **Remove** button (only when source = panel)
4. Footer note: "USER role can use the app with these keys but cannot edit or view them."

**Animations** (keeping the "A+ animation experience" bar from the previous section):
- Side sheet slides in from right, 240ms ease-out, with a backdrop fade.
- Save button: idle → spinner → ✓ (with a soft scale pop) → reverts to idle after 1.2s.
- Test button: same morph; failure shakes inline error.
- New "panel" badge appears with a fade+slide on the matching model card in the dashboard after save.

### File map (new)
```
app/lib/keys/
├── vault.ts                       ← AES-256-GCM encrypt/decrypt + atomic write
└── providerKey.ts                 ← getProviderKey(name) — vault-first, env-fallback
app/api/api-keys/
├── route.ts                       ← GET list
└── [provider]/
    ├── route.ts                   ← PUT (set), DELETE (remove)
    └── test/route.ts              ← POST test
app/components/
└── ApiKeysPanel.tsx               ← side-sheet panel UI (client component)
data/
└── api-keys.enc.json              ← gitignored, encrypted store
```

### Files updated (existing)
- `app/project/page.tsx` — wire the API Keys nav item to `setApiKeysPanelOpen(true)`, render `<ApiKeysPanel/>`
- `app/api/providers/status/route.ts` — add `source` field per provider
- `app/api/generate/route.ts`, `app/api/regenerate/route.ts`, `app/api/suggest/route.ts`, `app/api/suggest-all/route.ts`, `app/api/edit-asset/route.ts`, `app/lib/mockImageGenerator.ts` — read keys via `getProviderKey()`
- `.env.example` — add `KEY_VAULT_SECRET`
- `.gitignore` — already covers `/data` from the auth section

### Risks
- Encryption-at-rest is only as strong as `KEY_VAULT_SECRET`. Document that this must be a 32+ byte random value and not the same as JWT_SECRET.
- Test-key endpoints make real (cheap) outbound calls — wrap in a 5s timeout so the panel never hangs.
- If env var AND panel both set, panel wins. We surface this clearly in the Source badge and on `/api/providers/status` so users understand why their `.env.local` change "isn't taking effect."
- Refactoring all key access through `getProviderKey()` is mechanical but touches every generation route. Will keep changes surgical — only the env-var lookup line changes per file.

### Tasks
- #51 Append this context.md section (this commit)
- #52 Build `app/lib/keys/vault.ts` (AES-256-GCM, atomic write, single JSON file under data/)
- #53 Build `app/lib/keys/providerKey.ts` — vault-first, env-fallback resolver
- #54 Build `/api/api-keys` (GET) + `/api/api-keys/[provider]` (PUT/DELETE) + `/test` (POST), all admin-gated via session.ts
- #55 Refactor existing AI route handlers + mockImageGenerator to use `getProviderKey()`
- #56 Update `/api/providers/status` to expose `source` per provider
- #57 Build `<ApiKeysPanel/>` side-sheet component with slide-in animation, per-provider cards, Save/Test morph buttons
- #58 Wire the sidebar `🔑 API Keys` nav item to open the panel; gate visibility to ADMIN+ via the auth user shape
- #59 Add `KEY_VAULT_SECRET` to `.env.example` and document generation command
- #60 Smoke-test: set OpenAI key from panel → verify `/api/providers/status` shows `source: "panel"` → trigger an actual generation and confirm it uses the panel key (temporarily clear the env var)

---

## 2026-04-28 · Build Mode picker — Utility App | 2D Game (alongside Slots)

### User instruction (verbatim)
> "Just above the SLOT TYPE there should be another segment with two options Untility app | 2D game. If user selects one of them then the survey input form and it's detailed input types specification should be opened relevant to either utility app or 2D app. And the graphics will be generated accordingly with separate placeholder and full preview of the game or app. Please decode my message and convert into context. Add it to contect.md and create tasks and go ahead. Bacsically I added 3 reel, 6 reel slots, now utility app and 2D game all should be served intelligently as per requirement"

### What this is asking for
SlotForge AI has been a slots-only generator. Today the sidebar has a Slot Type picker (3-reel / 5-reel / 6-reel / 7-reel) that adapts the asset catalogue to the chosen slot variant. The user wants two more **top-level project categories** that share the same generation pipeline but with their own surveys, asset catalogues, and previews:

1. **Utility App** — internal/business/productivity tools (admin dashboards, analytics, CRM-style apps). Different visual language than slots: minimal, data-dense, clean typography.
2. **2D Game** — non-slot 2D games (platformer, puzzle, runner, RPG, etc.). Sprite-driven art, character/enemy/environment assets, HUD elements.

Slots stay the default. The new picker (`Utility App | 2D Game`) sits **above the existing Slot Type picker**. Picking one of them switches the entire flow — home dashboard messaging, the survey form, asset catalogue, generation prompts, and final preview — to that mode.

### Architecture — `BuildMode` as the new top-level axis
```
BuildMode = "slot" | "utility" | "game-2d"      ← NEW
SlotType  = "3-reel" | "5-reel" | …             ← unchanged, only relevant when BuildMode = "slot"
```

State lives in `ProjectPage`, persisted to localStorage. When the user picks Utility App or 2D Game in the new picker, we:
- Hide / disable the Slot Type picker (it's slot-specific — keep it visible-but-faded as an "← back to slots" affordance).
- Swap the home dashboard's hero copy + feature cards.
- Render `<UtilityAppForm/>` or `<Game2DForm/>` instead of the existing `<ProjectFormComponent/>`.
- The `/api/generate` and `/api/regenerate` endpoints accept a `buildMode` field and dispatch to the right prompt builder + catalogue.
- Loading uses the existing skeleton grid (works for any number of assets).
- Results render via the existing `<AssetGrid/>` (same shape).
- "Full preview" routes to `<UtilityAppPreview/>` (browser/phone mockup with generated screens composited) or `<Game2DPreview/>` (game scene with sprites + HUD).

### Per-mode surveys (concrete fields)

**Utility App form** (8 fields — focused, no AI Suggest in v1 to ship faster)
| Field | Example |
|---|---|
| App name | "Pulse Analytics" |
| Industry / domain | Finance · Healthcare · Retail · SaaS · Education |
| Primary persona | Admin · End user · Data analyst · Operations |
| Core function | "Track team OKRs and weekly progress" (free text) |
| Visual style | Minimal · Professional · Playful · Editorial |
| Color palette | "Teal + slate, single accent" |
| Layout density | Compact · Comfortable · Spacious |
| Brand keywords | "trustworthy, modern, data-first" |

**2D Game form** (10 fields)
| Field | Example |
|---|---|
| Game title | "Crystal Caverns" |
| Genre | Platformer · Puzzle · Runner · Idle · RPG · Shooter · Adventure |
| Theme | Fantasy · Sci-fi · Cyberpunk · Cute · Retro · Horror |
| Art style | Pixel art · Hand-drawn · Vector · Low-poly · Painterly |
| Color palette | "Vivid teal & magenta on charcoal" |
| Player character | "Agile fox warrior with glowing dual blades" |
| Enemies / NPCs | "Crystal slimes, stone golems, shadow imps" |
| Environment / world | "Bioluminescent crystal caves with rivers of mana" |
| HUD style | Minimal · Bold · Diegetic · Retro arcade |
| Win/loss tone | Triumphant · Solemn · Comedic · Mysterious |

### Per-mode asset catalogues (what's generated)

**Utility App** (8 assets):
- `app_icon` — square brand icon
- `login_screen` — sign-in surface mockup
- `dashboard` — main screen with KPI cards / charts
- `data_table` — table view with filters
- `settings` — user/account settings page
- `empty_state` — illustration + copy for "no data yet"
- `mobile_view` — same dashboard adapted to phone
- `notification` — toast / inline alert pattern

**2D Game** (8 assets):
- `title_screen` — splash with logo + start button
- `player_sprite` — character idle pose (front-facing)
- `enemy_sprite` — primary enemy
- `environment` — background / parallax layer
- `tileset` — repeating platform / floor tiles
- `hud_frame` — health bar + score panel
- `power_up` — collectible icon
- `gameover_screen` — end-state overlay

### Files (new)
```
app/types/buildMode.ts                       ← BuildMode + UtilityForm + Game2DForm types
app/lib/buildModes.ts                        ← BUILD_MODES metadata, defaults, per-mode home copy
app/lib/utilityPrompt.ts                     ← styleDNA + asset catalogue + prompts for utility apps
app/lib/game2dPrompt.ts                      ← same for 2D games
app/components/BuildModePicker.tsx           ← sidebar picker (new segment above Slot Type)
app/components/UtilityAppForm.tsx            ← 8-field utility survey
app/components/Game2DForm.tsx                ← 10-field 2D-game survey
app/components/UtilityAppPreview.tsx         ← full preview composite (browser frame mockup)
app/components/Game2DPreview.tsx             ← full preview composite (game scene mockup)
```

### Files updated
- `app/project/page.tsx` — add `buildMode` state + localStorage persistence; render `<BuildModePicker/>`; switch home/form/preview by mode
- `app/api/generate/route.ts` — accept `buildMode`, dispatch to the right prompt builder + catalogue
- `app/api/regenerate/route.ts` — same
- `app/lib/promptBuilder.ts` — slight refactor so the slot path stays exact while utility/game paths can share helpers (e.g. JSON-mode style-DNA prompt)

### Risks / what to NOT regress
- Slots flow MUST remain unchanged when `buildMode === "slot"` (the default). Every code path that's slot-specific stays in the slot branch.
- The existing 25-field `ProjectForm` is reused only in slot mode. Utility / game modes use their own separate form types — no monkey-patching the slot form.
- The Slot Type picker stays visible always; when not in slot mode it's faded with a "Switch to slots" CTA, not removed (avoids the picker shrinking on category change).
- Users can switch modes mid-form WITHOUT generating — switching wipes the in-progress form (with a confirm) so we don't merge two unrelated form shapes.
- Generation in flight + mode switch → BackConfirm-style modal cancels the generation cleanly via the existing `abortRef`.
- Each mode has its own localStorage key for in-progress form state to avoid cross-contamination.

### Why MVP first (and what's deferred)
v1 ships:
- Picker, two new forms, two new asset catalogues, two new full previews, generation wiring
- No AI Suggest buttons on the new forms (cuts implementation in half; the slot form has them, the new forms can add them later)
- Simpler full-preview composites (CSS-driven mockup frames, not live interactive demos like SlotMachinePreview)

v2 (deferred):
- AI Suggest buttons + Fill All for the new forms
- Sprite-sheet stitching for 2D Game (player_sprite emits multi-frame walk / jump strips)
- Animated mockup demos for Utility App (clickable simulated dashboard)

### Tasks
- #61 Append this context.md section
- #62 Add `BuildMode` types + `buildModes.ts` registry; persist `buildMode` state in `ProjectPage` (localStorage)
- #63 Build `<BuildModePicker/>` and place it above Slot Type picker; fade Slot Type when non-slot mode is active
- #64 Build `app/lib/utilityPrompt.ts` (styleDNA + 8-asset catalogue + per-asset prompts)
- #65 Build `app/lib/game2dPrompt.ts` (styleDNA + 8-asset catalogue + per-asset prompts)
- #66 Build `<UtilityAppForm/>` (8 fields) and `<Game2DForm/>` (10 fields)
- #67 Wire the home dashboard + form/preview to switch by `buildMode` in `ProjectPage`
- #68 Branch `/api/generate` and `/api/regenerate` on `buildMode` to call the right prompt builder
- #69 Build `<UtilityAppPreview/>` and `<Game2DPreview/>` composite mockups
- #70 Smoke-test: pick Utility App → fill form → generate → verify 8 assets + utility preview; same for 2D Game; confirm slot flow unchanged when buildMode=slot

---

## 2026-04-28 · Auto-fallback to free / trial generators when primary fails

### User instruction
> "When the quota exhausted or some tools fal to generate assets, you should check time to tim what free tolls or trial tools availabel and add it and do tha job dynamically"

### What this means in practice
Today, when a generation attempt fails (quota exhausted, auth failure, network/5xx), the asset falls through to a placeholder SVG. The user is asking for an **automatic fallback chain** that detects failure and routes the request to a known-working free/trial generator instead, so the asset gets *generated content* even when the primary provider is down.

The "check time to time" phrasing also implies a **periodic health probe** so the registry of working fallbacks stays current.

### Architecture
1. **Curated fallback registry** — `app/lib/freeFallbacks.ts`. A handful of generators with an established free/trial tier, in priority order. Each entry exposes a `generate(prompt, opts) => Promise<{ imageUrl: string } | null>` impl.

2. **Top of the chain — Pollinations** (`https://image.pollinations.ai/prompt/{...}?model=flux&width=1024&height=1024&nologo=true&seed=...`). Truly free, no API key, no signup. Returns a PNG. This is the killer first-line fallback because we can use it the moment a primary fails, with zero setup.

3. **Health probe** — runs lazily every ~5 minutes per process. Pings each registered fallback's lightweight endpoint, persists `{ id, healthy, lastCheckedAt }` in memory. Surfaced via `/api/providers/status` so the UI can show the user "Free fallback: ✓ Pollinations available".

4. **Generation flow** — `generateSingleImage(asset, styleDNA, model)`:
   - Try primary (existing path)
   - If primary returns placeholder OR throws (quota / auth / 5xx) → walk the fallback registry in priority order, calling the first healthy one
   - On success, set `asset.imageUrl` to the fallback's output AND set `asset.usedFallback = "pollinations"` (new field on `Asset`) so the UI can chip the card.
   - On total failure, fall through to the existing SVG placeholder (last resort).

5. **UI surfacing** — small "via Pollinations · free" chip on any asset card whose `usedFallback` is set. Banner at the top of the results grid: *"Some assets used a free fallback because your primary provider was unavailable."*

### Files (new)
```
app/lib/freeFallbacks.ts            ← Pollinations adapter + registry + tryFreeFallback()
app/lib/fallbackHealth.ts           ← Periodic ping; in-memory cache; exposed via providers/status
```

### Files updated
- `app/types/index.ts` — `Asset` gains `usedFallback?: string`
- `app/lib/mockImageGenerator.ts` — wrap primary generation; on failure, try the registry; tag the asset
- `app/api/providers/status/route.ts` — include `fallbacks: { pollinations: { healthy, lastCheckedAt } }` in the response
- `app/components/AssetGrid.tsx` — render a "via …" chip when `asset.usedFallback` is set
- (optional) `app/components/ApiKeysPanel.tsx` — small "Free fallbacks" footer with health status

### Risks / considerations
- Pollinations has rate-limits and is community-funded; using it as a default fallback is fine for an internal tool but we should NOT hammer it. The fallback only fires when the primary fails, never as a parallel duplicate. We also pass a stable `seed` derived from the prompt hash so identical regenerations are cached server-side at Pollinations.
- Output quality won't match GPT-Image-1 / FLUX Pro Ultra — we set expectations via the chip ("via Pollinations · free").
- "Adding new free tools dynamically" beyond a curated registry is impractical (would require web-crawling or a third-party directory). The registry is hand-curated; updating it is a code change. The health probe makes the registry self-pruning when one entry goes down.
- Don't auto-fallback for OpenAI's `insufficient_quota` if the user hasn't opted in — silently switching providers without consent could surprise them. Default ON for this tool (internal use, the user just wants results); add a "Use free fallbacks when primary fails" toggle in the API Keys panel later.

### Tasks
- #71 Add Pollinations adapter + `freeFallbacks.ts` registry + `tryFreeFallback()`
- #72 Add lazy 5-min health probe (`fallbackHealth.ts`)
- #73 Add `Asset.usedFallback` field
- #74 Wrap primary generation in mockImageGenerator with fallback chain on failure
- #75 Extend `/api/providers/status` to include fallback health
- #76 Render "via …" chip on asset cards that used a fallback (small surface change)

---

## 2026-04-29 · 2D Assets — guided Q&A wizard for Utility App + Board Game (replaces old #19-27)

### User instruction (verbatim)
> "There will be another section in the left panel of the website above slots types line '2D assets', there will be two options to choose 1) Utility app and another is board game etc, accordingly, do research on how many survey form fileds should be placed and optn the form in another page and accordingly generate assets for utility apps or board games or other board game etc. These wil be decided based on user's context. best udea is to ask user on picking either utility app or board game or any other game, Ai should ask at laeast 20-25 questions with multiple choice and then fiinally ask for any reference link or any pdf document or a prototype to upload. Once the user aploads it Ai will generate the assets dynamically in a new page. Refine the context, add your analytic points and context, convert into small small tasks and make a robust outcome also internally be accountable to give the production ready outputs but the Q&A round should include all requirements to give better outputs."

### Why this supersedes the old #19-27 plan
The earlier plan added two more 8-10-field forms inline. The user wants something materially better:
- A **separate page / route** per category, not an inline form
- **20-25 question guided wizard** (multi-choice + targeted free text)
- **File upload** at the end (PDF / image / link / prototype)
- **Production-ready output specs** — proper dimensions per platform/use-case, not generic 1024² renders
- AI uses the gathered context to expand into a precise prompt-per-asset plan

The old #19-27 are deleted; this section replaces them with a richer scope.

### Architecture

```
Sidebar
└── 2D Assets (NEW section above Slot Type)
    ├── 🛠️  Utility App   →  /build/utility-app
    └── 🎲  Board Game    →  /build/board-game

/build/[category]                    Wizard route
├── Multi-step Q&A (5-6 steps × ~4-5 questions)
├── Reference upload (PDF / image / URL)
└── Submit → /api/build/[category]/generate

/build/[category]/results            Results route
├── Asset grid (dimensions per asset spec)
├── Fullscreen preview (existing component)
├── Download (single + ZIP)
└── Save / restore (IndexedDB)
```

### Q&A research — what to ask, by category

Industry-standard onboarding-wizard size is **20-25 questions** spread across 5-6 steps so each step fits on one screen without scrolling. Questions are mostly multi-choice (radio / chip) with a few targeted free-text inputs. The last step is always reference upload.

**Utility App — 24 questions across 6 steps**

| # | Step | Question | Type | Options |
|---|---|---|---|---|
| 1 | Identity | App name | text | — |
| 2 | Identity | Industry / domain | radio | Finance · Healthcare · Education · Retail · SaaS · Productivity · Social · Travel · Logistics · Other |
| 3 | Identity | Primary persona | radio | Admin · End user · Analyst · Operations · Customer-facing · Developer |
| 4 | Identity | One-line description of the core function | text | — |
| 5 | Platform | Target platforms | multi-select | iOS · Android · Web · Desktop (Mac/Win) · Cross-platform |
| 6 | Platform | Form factor | multi-select | Phone · Tablet · Desktop · TV |
| 7 | Platform | Orientation | radio | Portrait · Landscape · Both |
| 8 | Platform | Minimum OS version | text (optional) | — |
| 9 | Design system | Visual style | radio | Minimal · Material You · Apple HIG · Editorial · Playful · Brutalist · Neumorphic |
| 10 | Design system | Theme | radio | Light · Dark · Both · Auto-adaptive |
| 11 | Design system | Primary brand color | color | hex |
| 12 | Design system | Typography | radio | Sans-serif · Serif · Display · Custom |
| 13 | Components | Required screens | multi-select | Login · Onboarding · Dashboard · Profile · Settings · Search · Empty state · Error state · Notifications · Subscription · Form · List view |
| 14 | Components | Navigation pattern | radio | Tab bar · Drawer · Bottom nav · Top nav · None |
| 15 | Components | UI density | radio | Compact · Comfortable · Spacious |
| 16 | Components | Iconography | radio | Outline · Filled · Two-tone · Custom illustrated |
| 17 | Deliverables | App icon | toggles | App icon (1024², adaptive variants) · Web favicon set |
| 18 | Deliverables | Launch / splash | toggles | iOS launch screens · Android splash · Web preloader |
| 19 | Deliverables | Marketing | number + text | Number of marketing screenshots; tagline |
| 20 | Deliverables | Notification icons | toggle | Yes / No |
| 21 | Branding | Brand keywords | text | comma-separated |
| 22 | Branding | Tone of voice | radio | Professional · Friendly · Playful · Authoritative · Casual |
| 23 | Branding | Avoid | text | what NOT to include |
| 24 | Reference | Upload reference | file + URL | PDF · image · prototype URL |

**Board Game — 25 questions across 6 steps**

| # | Step | Question | Type | Options |
|---|---|---|---|---|
| 1 | Identity | Game title | text | — |
| 2 | Identity | Genre | radio | Strategy · Party · Family · Kids · Co-op · Eurogame · Wargame · Trivia · Roll-and-write |
| 3 | Identity | Player count | radio | 1 (solo) · 2 · 3-4 · 5-8 · 8+ |
| 4 | Identity | Target age | radio | 6+ · 8+ · 10+ · 12+ · 14+ · 18+ |
| 5 | Theme | Theme | radio | Fantasy · Sci-fi · Historical · Modern · Abstract · Animals · Nature · Horror · Mythology |
| 6 | Theme | Game length | radio | <30 min · 30-60 min · 60-90 min · 90+ min |
| 7 | Theme | Complexity | radio | Light · Medium · Heavy |
| 8 | Theme | Setting / world (free text) | text | — |
| 9 | Art direction | Art style | radio | Cartoon · Painterly · Pixel art · Vector · Realistic · Folk art · Watercolor |
| 10 | Art direction | Color palette | radio | Vivid · Muted · Monochrome · Pastel · Bold · Earthy · Neon |
| 11 | Art direction | Mood | radio | Triumphant · Mysterious · Whimsical · Serious · Playful · Dark |
| 12 | Art direction | Inspiration (free text) | text | — |
| 13 | Components | Required components | multi-select | Game board · Cards · Tokens · Dice · Miniatures · Tiles · Spinner · Money · Player boards · Sand timer |
| 14 | Components | Board layout | radio | Grid · Hex · Path · Modular · Open-world |
| 15 | Components | Number of cards | number | total cards |
| 16 | Components | Number of unique pieces | number | — |
| 17 | Specs | Card dimensions | radio | Poker (2.5×3.5″) · Bridge (2.25×3.5″) · Mini (1.75×2.5″) · Tarot (2.75×4.75″) · Custom |
| 18 | Specs | Board size | radio | Small (14×14″) · Medium (17×17″) · Large (20×20″) · Custom |
| 19 | Specs | Token shape | radio | Round · Square · Custom-shape · Meeple |
| 20 | Specs | Box size | radio | Small (8×8″) · Medium (11×11″) · Large (12×12″) |
| 21 | Branding | Title visual treatment | radio | Bold sans · Hand-drawn · Vintage serif · Modern minimal · Distressed |
| 22 | Branding | Brand keywords | text | — |
| 23 | Branding | Avoid | text | — |
| 24 | Branding | Edition note (optional) | text | "First Edition", "Halloween Special", etc. |
| 25 | Reference | Upload reference | file + URL | PDF · image · prototype URL |

### Production-ready asset specs (what each category emits)

**Utility App pack** (output asset specs the prompt builder targets):
| Asset | Dimensions | Purpose |
|---|---|---|
| App icon — primary | 1024×1024 PNG | App store, Mac/Windows |
| App icon — adaptive (Android) | 432×432 foreground + background | Android adaptive icon |
| Favicon set | 16×16, 32×32, 192×192, 512×512 | Web |
| iOS launch screen | 1170×2532 | iPhone 13/14/15 |
| Android splash | 1080×1920 | Android phone |
| Login screen mockup | 1170×2532 (or 1920×1080 for web) | Marketing |
| Dashboard mockup | per platform | Marketing |
| Settings mockup | per platform | Marketing |
| Empty state illustration | 800×600 | In-app |
| Error state illustration | 800×600 | In-app |
| Onboarding screens | per platform × 3 | First-run |
| Notification icon | 96×96 monochrome | OS notifications |

**Board Game pack**:
| Asset | Dimensions | Notes |
|---|---|---|
| Game board | per spec | print-quality 300 DPI |
| Card front | per spec | bleeds + safe area |
| Card back | per spec | uniform across deck |
| Tokens | 80×80 (per token) | piece art |
| Dice faces | 6 faces × 256² | custom dice |
| Box top | per spec | retail-ready |
| Box side panels | per spec | with ratings/info |
| Rulebook cover | 8.5×11″ at 300 DPI | print-ready |
| Player boards | per layout | per-player surface |

### Files (new)

```
app/types/build.ts                            ← BuildCategory, QAQuestion, QAStep, AssetSpec
app/lib/qa/utilityApp.ts                      ← curated 24-question + asset-spec list
app/lib/qa/boardGame.ts                       ← curated 25-question + asset-spec list
app/lib/qa/registry.ts                        ← getCategory(slug) → meta + questions + specs
app/lib/qa/promptExpander.ts                  ← turns Q&A answers + reference into per-asset prompts via GPT
app/build/[category]/page.tsx                 ← multi-step wizard (server component shell)
app/build/[category]/components/Wizard.tsx    ← client wizard with step state + validation
app/build/[category]/components/QuestionField.tsx
app/build/[category]/components/ReferenceUpload.tsx
app/build/[category]/results/page.tsx         ← server shell
app/build/[category]/results/components/Results.tsx
app/api/build/[category]/generate/route.ts    ← POST: receives answers + reference; SSE-streams assets
app/api/build/upload/route.ts                 ← POST: accepts a PDF/image upload, returns a temp URL
data/uploads/                                 ← gitignored, holds reference uploads
```

### Files updated

- `app/project/page.tsx` — sidebar gets a new **"2D Assets"** section ABOVE Slot Type, with Utility App + Board Game entries that route to `/build/utility-app` and `/build/board-game`. Slot flow unchanged.
- `proxy.ts` — protect `/build/:path*` behind auth (same gate as `/project`).
- `.gitignore` — add `data/uploads/` (already covered by `/data` rule).

### Implementation strategy

The whole feature is large. Splitting into discrete tasks:

- #46 Add types: BuildCategory, QAQuestion (text/radio/multi-select/number/color/toggle/file), QAStep, AssetSpec
- #47 Build `app/lib/qa/utilityApp.ts` — 24 questions in 6 steps + 12-asset spec
- #48 Build `app/lib/qa/boardGame.ts` — 25 questions in 6 steps + 9-asset spec
- #49 Build `app/lib/qa/registry.ts` (getter) + `promptExpander.ts` (GPT-4o-mini wrapper that converts answers → per-asset prompt list)
- #50 Add sidebar "2D Assets" section above Slot Type, two NavItem entries
- #51 Add proxy.ts protection for `/build/*`
- #52 Build `/build/[category]` page shell + `Wizard.tsx` (stepper, progress bar, validation, prev/next)
- #53 Build `QuestionField.tsx` (handles all question types) + step-level validation
- #54 Build `ReferenceUpload.tsx` (PDF/image upload + URL input + drag-drop)
- #55 Add `/api/build/upload/route.ts` (multipart upload to data/uploads/, returns ID)
- #56 Add `/api/build/[category]/generate/route.ts` — SSE-streams assets, uses promptExpander + free-fallback chain + selectedImageModel
- #57 Build `/build/[category]/results/page.tsx` + Results.tsx (asset grid by spec, ZIP download)
- #58 Persist wizard sessions to localStorage (recover from refresh) + completed builds to IndexedDB (existing projectStorage model extended)
- #59 Smoke-test: utility app full flow → 24 answers → upload PDF → generate → asset grid
- #60 Smoke-test: board game full flow → 25 answers → generate → asset grid

---

## 2026-04-29 · AI role transparency + topup-style failure UX + verified billing URLs (Phase 1) and model marketplace (Phase 2)

### User instruction
> "Phase 1: I have a problem Area here … the AI subscription quota has ended GptImage1 … role of AI API is multiple. (1) form-field prompts auto-fill — user should know which API. (2) high-end graphics — user should know which API. (3) animation generator — user should know which API. … workflow should be like mobile topup — once the token/subscription/quota ends it should pop up a message that which particular AI API has issues. Phase 2: bottom of left panel … search option where superadmin/admin can search target-oriented AI models, sorted automatically, add into the website … API also appear in body … user can see subscription/token/quota balance … if recharge or subscribe, a payment gateway or particular payment page should open without wrong destination … runwayml subscription went to wrong page yesterday — they told me to go to dev.runwayml.com … API Keys panel — how are those used? Make sure they're fetched primarily from that location otherwise that panel is useless. Goal is to generate assets robustly. Top trending models and very genuine payment page."

### Architect-level analysis

The current app has three distinct AI roles that today are visually conflated under one "model picker." Users can't tell:
- Which provider is auto-filling their form fields when they click "AI Suggest"
- Which provider rendered any given image
- Whether the API Keys panel they wrote keys into is actually the source of truth

When any of these fails, the messaging is small/buried (a notice somewhere in the form) rather than a topup-grade alert that names the role + the provider + a one-click route to recharge at the *correct* URL.

The Runway issue you hit yesterday is the symptom of a deeper bug — our billing URL pointed at the *consumer* dashboard (`app.runwayml.com/account`) rather than the *developer* portal (`dev.runwayml.com`) where API keys are actually issued. **That is a UX defect we own**; I'm fixing every billing URL with a verified destination check.

### The three AI roles — explicit separation

| Role | Slug | What it powers today | Default provider | Configurable? |
|---|---|---|---|---|
| **Prompt Assistant** | `prompt` | AI Suggest per-field, Fill All, Style DNA, Build wizard prompt expansion | OpenAI GPT-4o-mini | (Future: Claude, Gemini) |
| **Image Generator** | `image`  | Slot symbols, backgrounds, UI, FX, build-wizard mockups | OpenAI GPT-Image-1 (selectable to FLUX / SD3.5 / Pollinations / Imagine Art) | Yes — picker |
| **Animation Generator** | `animation` | Reel intro clips, jackpot reveals, ambient loops (when wired) | RunwayML Gen-3 | Yes — picker |

The picker UI already split image vs animation in the last task. Now we surface the **third role explicitly** (Prompt Assistant) — currently invisible to the user because it runs server-side on every form interaction.

### What changes in Phase 1 (this commit)

1. **Billing URL audit** — every provider's `billingUrl` is verified to point at the *exact* page where API keys/credits are issued, not the consumer dashboard. Specifically:
   - Runway: `app.runwayml.com/account` → `https://dev.runwayml.com/` (the developer portal — what their support told you)
   - Replicate: `replicate.com/account/billing` ✓ (verified — direct billing)
   - OpenAI: `platform.openai.com/account/billing` ✓
   - Imagine Art: `https://www.imagine.art/api` ✓ (the API/dev page, not the consumer site)
   - Pollinations: no billing — free tier only
   - For new entries, billing URL is added with a comment block citing the source.

2. **Three-role status strip** at the top of the AI Models section in the sidebar:
   ```
   📝  Prompt Assistant  ●  GPT-4o-mini    ⚠ Quota out
   🖼️  Image Generator    ●  GPT-Image-1
   🎬  Animation Generator ●  Runway Gen-3
   ```
   Each row links to the relevant API Keys panel entry + shows live status from `/api/providers/status` (which now also reports `prompt-assistant` health).

3. **Topup-style notifications** (`app/components/TopupBanner.tsx`):
   - New centralized `useApiAlert()` hook + a top-right toast queue
   - When ANY AI route handler returns a quota / auth / rate-limit error, the response includes structured `{ role, provider, reason, billingUrl }` fields
   - Frontend turns those into a sticky banner: *"Image Generator unavailable — OpenAI quota exhausted. [Top up on platform.openai.com/account/billing]"*
   - Banner auto-clears the moment polling sees the provider healthy again

4. **API Keys panel transparency**:
   - Add a footer block in the panel: *"Keys here are the primary source. Server reads from this vault first; falls back to .env.local only if no panel value is set. Verified at:"* (lists current source for each provider)
   - On every model card in the picker, the existing source badge (`Panel` / `Env` / `Not set`) is given a tooltip: *"Reading key from <source>. Edit in API Keys panel."*

5. **"Powered by" badges** on AI surfaces:
   - AI Suggest buttons in the form get a tiny badge: *"by GPT-4o-mini"*
   - "Generate Assets" button: *"by [active image model name]"*
   - When the role is failing, the badge turns rose with the provider name struck through

### What changes in Phase 2 (next chunk — separate task batch)

6. **Trending model marketplace**: a curated registry of ~25 currently-popular AI models (Stability AI, OpenAI, Anthropic, Google, Replicate hosts, Together, Fal, etc.) with:
   - Search input ("search anime models", "search 2D pixel", "search video") — fuzzy match across labels, providers, tags
   - "Add to platform" → toggles visibility in the picker; persists to user's localStorage
   - Each entry includes: provider, kind (image/animation/text), pricing, billing URL (verified), integration status (Native / Replicate / Coming soon)

7. **Best-effort balance display** per provider:
   - OpenAI: `GET https://api.openai.com/v1/dashboard/billing/credit_grants` (when supported by org) OR usage API
   - Others: track `lastSuccessAt` / `lastFailureAt` / `lastFailureReason` server-side and surface as a "last seen healthy" timestamp
   - Visible on each model card + in the three-role status strip

8. **Refined Subscribe flow**:
   - When user clicks Subscribe on any model, the dialog shows the *exact verified URL* it will open + a one-line description of what to expect there ("This is the developer portal where you'll get an API key — paste it back into the API Keys panel afterwards")
   - Removes the previous false-positive subscribe path

### Risks / what to NOT regress

- The current model picker (image+animation split) keeps working unchanged; the three-role strip is added ABOVE it, doesn't replace it.
- Topup banners must not block the UI — they're top-right toasts, dismissable, never modal.
- The API Keys vault is already the primary source (verified earlier — every AI route uses `getProviderKey()`); this commit just makes that visible to the user.
- Don't accidentally leak API keys in the new "powered by" badges — they only show provider/model name, never key fragments.
- Phase 2 marketplace is curated, not auto-discovered. Web-crawling for free providers is out of scope.

### Tasks (Phase 1 — execute this turn)

- #61 Audit + fix billing URLs (especially Runway → dev.runwayml.com); add comments citing the source
- #62 Add `roleOf(model)` helper + `/api/providers/status` reports `prompt`, `image`, `animation` role health
- #63 Build `<RoleStatusStrip />` component, mount above the AI Models picker in sidebar
- #64 Build `TopupBanner` + `useApiAlert()` with structured error parsing; centralize the OpenAI insufficient_quota path that today only surfaces in the form
- #65 Add "Powered by …" micro-badges next to AI Suggest button + Generate Assets button
- #66 Add API Keys panel "primary source" footer + tooltip on each model-card source chip explaining where the key is being read from

### Tasks (Phase 2 — separate batch, next turn)

- #67 Curate trending model registry (~25 entries) with verified billing URLs + integration status
- #68 Build search input + filter + "Add to platform" UI in sidebar AI Models section
- #69 Best-effort balance fetcher (OpenAI + others) + cache + display on model cards
- #70 Refined Subscribe dialog showing destination URL preview before opening

---

## 2026-04-29 · Swap-able role models — pluggable AI per role

### User instruction
> "Now, i can see the AI models linked to which dedicated tasks. But suppose I need to switch the tasks to another AI model. For example Gpt-4o-mini is responsible as a prompt assistant but I want swich to different AI model. how to do that? fix it and make the context and prepare organished plan like an intelligent architect and execute. Objective is to switch AI models from their dedicated tasks in case, i found they are not that much efficient and I need more optimised results"

### Architect's analysis

The AI Roles strip shows three roles. The image role is already swappable via the model picker. The other two are hardcoded:
- **Prompt Assistant** → always GPT-4o-mini (`promptBuilder.ts`, `promptExpander.ts`, `/api/suggest`, `/api/suggest-all`)
- **Animation Generator** → always RunwayML Gen-3 (only one entry in MODEL_OPTIONS for kind="animation")

The user wants to swap any role to any compatible model when one underperforms or runs out of quota. This needs:
1. A **registry of compatible models per role** (extensible)
2. **Swap UI** that opens when the user clicks a role row in the status strip
3. **State persistence** so the choice survives refresh
4. **Backend routing** so the chosen prompt model is actually used by every prompt-using route

### Phased approach

**Phase A — In this turn (UI + same-provider swap that ACTUALLY works):**
- Define `MODELS_BY_ROLE` registry in `app/lib/aiRoles.ts`
- Prompt role lists 4 OpenAI variants (4o-mini → 4o → 4-turbo) — all use the OpenAI SDK already installed, so swapping is real, not preview
- Add `selectedPromptModel` state + localStorage persistence
- Make each role row in `<RoleStatusStrip>` clickable → opens `<RoleSelectorModal>`
- All prompt-using routes (`/api/suggest`, `/api/suggest-all`, `/api/build/[category]/generate`, `promptBuilder`, `promptExpander`) accept a `promptModel` field and pass it to the OpenAI client
- Animation role lists Runway as the only working entry; "more coming soon" footer
- Image role keeps using the existing dropdown (already swappable)

**Phase B — Next turn (multi-provider — real architectural depth):**
- Add Anthropic SDK + Claude 3.5 Haiku / Sonnet support
- Add Google Generative AI SDK + Gemini 2.0 Flash (has a free tier — major win for quota-exhausted users)
- Add `anthropic`, `google` to ProviderKey + vault + ApiKeysPanel
- Generic `promptCompletion()` interface in `app/lib/promptProviders/index.ts` that dispatches by model id

### Why this order

The user is hitting OpenAI quota right now. Phase A lets them at least move *between OpenAI tiers* (mini → standard → premium) which doesn't fix quota but improves quality choices. Phase B is the actual quota escape hatch (Gemini free tier is the killer).

I'm shipping Phase A now. Phase B requires `npm install @anthropic-ai/sdk @google/generative-ai` and a refactor of every prompt-using route — substantial, deserves its own focused turn.

### Phase A files

```
app/lib/aiRoles.ts                            (extend) — MODELS_BY_ROLE registry
app/components/RoleStatusStrip.tsx            (extend) — rows become clickable
app/components/RoleSelectorModal.tsx          (new)    — swap UI
app/project/page.tsx                          (extend) — selectedPromptModel state, swap handler
app/api/suggest/route.ts                      (extend) — accept promptModel in body
app/api/suggest-all/route.ts                  (extend) — same
app/lib/promptBuilder.ts                      (extend) — accept promptModel param in buildStyleDNA + buildPrompts
app/lib/qa/promptExpander.ts                  (extend) — accept promptModel param
app/api/build/[category]/generate/route.ts    (extend) — pass promptModel through
app/api/edit-asset/route.ts                   (extend) — pass promptModel through
```

### Risks
- Switching prompt models at runtime means each request includes an additional `promptModel` field. We default to "gpt-4o-mini" if missing so legacy clients keep working.
- We don't validate against the registry server-side strictly — if a client sends an unknown model id, OpenAI itself returns a 400 and we surface it as a topup-style error. Acceptable.
- Persisting `selectedPromptModel` to localStorage means it's per-browser, not per-user. Consistent with the existing image/animation selections.

### Tasks (Phase A — this turn)
- #71 Add MODELS_BY_ROLE registry to aiRoles.ts (4 prompt + existing image/animation)
- #72 Build `<RoleSelectorModal>` and wire each `<RoleStatusStrip>` row to open it
- #73 Add `selectedPromptModel` state + persistence + kind-aware setter
- #74 Thread `promptModel` through all prompt-using API routes + libs
- #75 Smoke-test: swap from gpt-4o-mini to gpt-4o → call AI Suggest → verify the API request payload uses gpt-4o

---

## 2026-04-29 · Phase 3 — AI model marketplace + compatibility checks + auto-add

### User instruction
> "Add a search filed and button just beside the AI models available at the right side. Objective is to search AI models. If I search some AI models it should have autosuggestion feature and it will search internet and suggest me to add an AI model based on our requirement and compatibility. Only those models will appear which are relevant and that can serve any of the dedicated tasks we have in our website (highend graphics, prompt assistant, animation). If I pick any models it will check the compatibilities; if not compatible it will give me the message why. If compatible it will be added to the list and gradually everything as mentioned in each AI models like pricing, specific role etc will be displayed accordingly and it will show its status whether it is subscribed or not and linked to its payment page to get api token. In case, some AI models are available but they don't give API keys or they are in beta not publicly available, shouldn't be allowed to add and give a popup text message that it can't be added right now. But I should have flexibility like google to pick best AI models from this website. If I subscribe any AI model at any time, if possible the API token you can fetch and add to the APIKEY panel along with corresponding AI models which are added accordingly. Automatically the system will correct everything to make the process flawless."

### Architect's analysis — what's feasible vs what isn't

The user's vision combines several things. Let me be honest about each:

| Ask | Feasible? | Plan |
|---|---|---|
| Search input + button beside AI Models | ✅ | Build it |
| Autosuggestions while typing | ✅ | Fuzzy filter over curated catalogue |
| "Search the internet" for new models | ❌ in real-time | **Next-best**: pre-researched curated catalogue of ~25-30 trending AI models, refreshed periodically by maintainers (i.e., me on user request) |
| Filter to relevant roles only (prompt/image/animation) | ✅ | Filter at search time |
| Compatibility check on pick | ✅ | Check `apiAvailable` + `publiclyAvailable` + role match flags in catalogue |
| Popup explaining why a model isn't compatible | ✅ | Modal with `incompatibilityReason` from catalogue |
| Adding compatible model surfaces pricing, role, status, payment link | ✅ | Already have this for built-in models — extend |
| Block beta / no-API models from being added | ✅ | Catalogue flags + confirmation modal |
| **Auto-fetch API token after subscribing** | ❌ cross-provider | **Next-best**: after user clicks Subscribe and billing popup opens, our app auto-opens the API Keys panel scrolled to the new model's row with the input focused. Browser security prevents apps from reading API keys generated on third-party sites — but we can make the paste-back step zero-click |

**Why "search the internet" can't work in real-time and what I'm doing instead**:
A live web crawl for AI models would require: a search API integration, a parser to extract model metadata, a verifier to check API availability, and a scheduler to keep it fresh. That's a separate product. The pragmatic equivalent — a **curated catalogue of 25-30 leading models** with verified metadata — gives the user 95% of the value: they discover models, see compatibility, get verified billing URLs, see pricing. Catalogue can grow with one PR per addition. I'll seed it with the most relevant models as of today.

### Curated catalogue — what's in it (initial seed, ~25 entries)

**Prompt Assistant (text)**:
- OpenAI: GPT-4o-mini, GPT-4o, GPT-4 Turbo, o1-preview
- Anthropic: Claude 3.5 Haiku, Claude 4 Sonnet, Claude 4.5 Opus
- Google: Gemini 2.0 Flash (free tier), Gemini 1.5 Pro
- DeepSeek: DeepSeek V3 (cheap)
- Mistral: Mistral Large, Codestral

**Image Generator**:
- OpenAI: GPT-Image-1, DALL-E 3
- Black Forest Labs (via Replicate): FLUX 1.1 Pro Ultra, FLUX 1.1 Pro, FLUX Schnell
- Stability AI (via Replicate): Stable Diffusion 3.5
- Ideogram v3 (via Replicate)
- Recraft v3 (via Replicate)
- Adobe Firefly (no public API — flagged)
- Midjourney (no public API — flagged)
- Imagen 3 (Google Vertex AI — gated)

**Animation Generator**:
- Runway: Gen-3 Alpha, Gen-3 Alpha Turbo
- Luma: Dream Machine
- Kling 2.1 Master (via Replicate)
- Pika 1.5 (no public API — flagged)
- OpenAI Sora (private preview — flagged)
- Stable Video Diffusion (via Replicate)

Each entry includes:
- `id`, `label`, `provider`, `role`, `description`
- `pricing` (string)
- `homepageUrl`, `billingUrl` (verified), `signupUrl`, `apiKeysUrl`
- `apiAvailable` (true/false), `publiclyAvailable` (true/false)
- `integrationStatus`: `native` | `via-replicate` | `preview-only` | `coming-soon` | `no-api`
- `incompatibilityReason` (set when not addable, surfaced in modal)
- `tags` for search ("logo", "anime", "video", "cheap", "free-tier", "premium", etc.)
- `popularity` (0-100, used as default sort)

### Files (new)

```
app/lib/aiCatalogue.ts                   ← curated 25-entry registry
app/components/ModelSearch.tsx           ← input + autosuggest dropdown
app/components/ModelCompatibilityModal.tsx  ← popup explaining yes/no/why
app/lib/userModels.ts                    ← localStorage CRUD for user-added models
```

### Files updated

- `app/project/page.tsx` — mount ModelSearch above the picker; merge user-added models with built-in MODEL_OPTIONS
- `app/components/ApiKeysPanel.tsx` — accept `focusProvider` prop so we can auto-open + scroll on Subscribe-back

### "Auto-fetch token" — concrete next-best UX

When the user clicks Subscribe on a newly-added model:
1. Verified billing URL opens in popup window
2. Our app shows a one-line toast: *"After getting your API key, click here to paste it →"* — clicking opens the API Keys panel pre-scrolled to the matching provider with the input field focused (cursor blinking, ready to paste).
3. As soon as the user pastes a key + clicks Save, the model card flips from "Needs API key" to "Active" and the topup banner clears.

This delivers ~80% of the user's "automatic token fetch" vision — the only manual step is the literal paste, which is a hard browser security boundary nobody can cross without OAuth.

### Risks

- Catalogue staleness: model availability changes weekly. Add a `verifiedAt` timestamp on each entry; surface a "last verified" badge in the search results.
- Overwhelming the picker: with 25+ catalogue entries + user's added models, the picker could get busy. Group by role + show "popular" first.
- False compatibility positives: if I mark a model as `apiAvailable: true` but actually it's gated, the user will hit a 401 only after subscribing. Mitigation: include known gated/waitlist models with `publiclyAvailable: false` so they're flagged before subscription.
- The user adding a model doesn't auto-install integration code. If they pick e.g. Anthropic, the catalogue says `native` but our backend has no Anthropic SDK yet. **Solution**: show a clear "Integration: Native (Phase B)" or "Native (live)" status on each entry so the user sees what works *today*.

### Tasks (Phase 3 — execute this turn)

- #76 Build `app/lib/aiCatalogue.ts` with 25 curated entries + verified metadata
- #77 Build `app/lib/userModels.ts` (localStorage CRUD for user-added models)
- #78 Build `app/components/ModelSearch.tsx` (search input + autosuggest dropdown above the picker)
- #79 Build `app/components/ModelCompatibilityModal.tsx` (yes/no/why popup on pick)
- #80 Wire ModelSearch into the Active AI Models section; merge user-added models into the picker
- #81 Smoke-test: search "claude" → autosuggest shows Claude variants → pick → compatibility modal explains it's a Phase B preview → user accepts → model appears in picker with status badge

---

## 2026-04-29 · Phase 4 — API Usage panel with traffic-light status per AI model

### User instruction
> "There will be a button on the left panel with name API usage, it can be placed under APIKEY, if I click on it, it will list down all AI models and show the balance usage or token usage or anything about to end with green, orange and red color."

### Architect's analysis — what's possible vs what isn't

**What you'd want ideally**: live "remaining credits / quota / tokens" per provider — like a phone bill dashboard.

**Reality check — provider-by-provider**:

| Provider | Public usage endpoint? | What we can actually surface |
|---|---|---|
| OpenAI | Org-scoped `/v1/usage` exists but requires admin/session — not the developer key. Old `/credit_grants` deprecated. | Deep-link to `platform.openai.com/usage` + LOCAL counts |
| Anthropic | No public quota endpoint with developer key | Deep-link to `console.anthropic.com/usage` + LOCAL counts |
| Replicate | `/v1/account` returns username/email but NOT remaining credits | Deep-link + LOCAL counts |
| Runway | Not publicly documented | Deep-link to `dev.runwayml.com` + LOCAL counts |
| Imagine Art | Not documented | Deep-link + LOCAL counts |
| Google (Gemini) | Free tier rate limits, no public usage API | Deep-link + LOCAL counts |

**Honest conclusion**: a real-time "remaining credits" dashboard isn't feasible without each provider exposing it. **Next-best**: track LOCAL usage (requests made through our app, success/failure outcomes, last-failure-reason). Combined with the `quotaState` we already track, this gives a credible traffic-light indicator:

- 🟢 **Green** — recent successes, no errors in the last hour
- 🟠 **Orange** — some failures recently OR usage is climbing fast (> threshold/hour)
- 🔴 **Red** — last call returned `insufficient_quota` / 429 / 401 (quota exhausted, key invalid, or rate limited)

Each row also surfaces:
- Last successful call (timestamp)
- Last failure + reason
- Count of requests in the last 24h (from local log)
- Direct link to the provider's official usage page (where the actual remaining-quota number lives)
- "Top up" button if status is red

### Files (new)
```
app/lib/usage/tracker.ts           ← server-side usage log (data/usage.json — atomic write)
app/lib/usage/aggregate.ts         ← roll up logs into per-provider summaries
app/api/usage/route.ts             ← GET aggregated usage (admin-gated)
app/components/UsagePanel.tsx      ← side-sheet panel like ApiKeysPanel, traffic-light status rows
```

### Files updated
- `app/lib/mockImageGenerator.ts`, `app/lib/promptBuilder.ts`, `app/api/suggest/route.ts`, `app/api/suggest-all/route.ts`, `app/api/edit-asset/route.ts`, `app/api/build/[category]/generate/route.ts` — record `success`/`failure` after each provider call via `tracker.record(provider, result)`
- `app/project/page.tsx` — new sidebar nav item under API Keys: "📊 API Usage"; mounts UsagePanel

### Tracker shape

```ts
interface UsageEvent {
  ts: number;                    // ms timestamp
  provider: ProviderName;        // openai / replicate / runway / imagineart
  role: AIRole;                  // prompt / image / animation
  outcome: "success" | "rate_limited" | "quota_exhausted" | "auth_failed" | "network_error" | "other_failure";
  modelId?: string;              // e.g. "gpt-4o-mini"
}
```

Persisted to `data/usage.json` (gitignored, atomic write). Capped at last 5000 events (oldest dropped). Aggregated on read into per-provider buckets.

### Risks
- The local log can't tell you "you have $4.32 left at OpenAI" — only what we've used. The official-dashboard link covers that gap.
- The traffic-light is a heuristic, not a contract. We'll explain in the panel: *"🟢/🟠/🔴 reflects calls made through this app — for absolute remaining balance, click 'View on provider' to open their dashboard."*
- Storage: 5000 events × ~80 bytes each = ~400 KB. Negligible.

### Tasks (Phase 4 — append after Phase 3 finishes)
- #82 Build `app/lib/usage/tracker.ts` (atomic JSON store) + `aggregate.ts` (rollup)
- #83 Wire tracker into all AI route handlers — record outcome after each provider call
- #84 Add `/api/usage` route (admin-gated) returning per-provider summaries
- #85 Build `<UsagePanel/>` side-sheet — traffic-light status rows, "View on provider" links, top-up button when red
- #86 Add "📊 API Usage" nav item under API Keys in sidebar; wire to open the panel
- #87 Smoke-test: trigger an OpenAI call → verify event lands in tracker → panel shows green dot; force a quota error → panel turns red

---

## 2026-04-29 · Move Pro Tip to top of form + Trending AI Models banner with auto-scroll

### User instruction
> "Move the Pro Tip-Use AL Assist section to the top of slots assset generation page and fill that space with latest, popular,trending AI models invented to fulfil corresponding goals  ( Prompt, graphics,animations,layered assets generation and rigging AI tools), if there are multiple trending AI models you can auto scrol thses in the form of text or banners whatever suitable and make the UI appealing"

### Architect's analysis

Two surface changes plus a domain extension:

1. **Pro Tip relocation** — currently at the bottom of HomeView (after model cards). User wants it at the TOP of the form page so the "Fill All with AI" hint appears *before* filling, not after scrolling past 25 fields.

2. **Trending Models banner** in HomeView's old Pro Tip slot — auto-scrolling carousel of "what's hot right now" across all AI roles. Marketing-flavored but with real metadata (provider, role, tagline). Click any banner card → opens the catalogue's compatibility modal (already built in Phase 3).

3. **New role types** — the user explicitly named two beyond what we have:
   - **Layered assets generation** — multi-layer outputs (background + foreground + transparent overlays), useful for slot art with parallax / FX layers.
   - **Rigging AI tools** — character rigging, mocap, skeletal animation. Mostly external 3D tools without public APIs, but worth catalog visibility for users who want to know what exists.

These extend `AIRole` from `prompt | image | animation` to `prompt | image | animation | layered | rigging`. Catalogue gains entries for the new roles. Most rigging tools are no-API (Mixamo, Cascadeur, etc.) so they show in search with `Not addable` flags — same pattern as Midjourney.

### Catalogue additions (this turn)

**Layered assets** (3 entries):
- Recraft v3 (already in catalogue, retag as `layered` since its primary differentiator is vector + raster layers)
- LayerDiffuse / IC-Light (Stability research — preview)
- Adobe Firefly (already, gated)

**Rigging tools** (5 entries — most no-API):
- Mixamo (Adobe, free, auto-rig + animations from FBX/OBJ — no public API, web app only)
- Cascadeur (AI-assisted physics-based animation — desktop app, no API)
- Move.ai (markerless mocap from video — has API)
- Plask Motion (browser mocap — has API)
- DeepMotion / Animate3D (mocap from video — has API)

### Trending banner — implementation

**Look**: horizontal strip of banner cards (~5–8 visible), CSS-keyframe infinite-scroll animation (no JS needed), pause-on-hover.

**Content per card**:
- Role icon (📝 / 🖼️ / 🎬 / 🧱 / 🦴)
- Model label
- One-line "what it's for" tagline
- Provider chip
- Pricing micro-text
- Subtle "+ Add" affordance — clicking opens the existing `<ModelCompatibilityModal>` from Phase 3

**Selection of trending models** (sorted by `popularity` from the catalogue, top 2 per role):

```
Prompt:    GPT-4o-mini · Claude 4 Sonnet
Image:     GPT-Image-1 · FLUX 1.1 Pro Ultra
Animation: Runway Gen-3 Alpha · Luma Dream Machine
Layered:   Recraft v3 · LayerDiffuse (preview)
Rigging:   Mixamo · Move.ai
```

10 cards total cycling — fits a 5-second wrap-around.

**Animation**: CSS `@keyframes trending-scroll` translating from 0 to -50% over 30s, infinite linear, paused on hover. Strip is duplicated so the wrap is seamless (same trick as the slot reels).

### Files (new)
```
app/components/TrendingAIBanner.tsx    — auto-scroll carousel
```

### Files updated
- `app/lib/aiRoles.ts` — extend `AIRole` with `layered` + `rigging`
- `app/lib/aiCatalogue.ts` — add 8 new entries (3 layered + 5 rigging)
- `app/components/ModelSearch.tsx` + `ModelCompatibilityModal.tsx` — accept the new roles in their role-chip labels
- `app/project/page.tsx` — move the Pro Tip block from HomeView → top of form view; mount `<TrendingAIBanner />` in the freed space at the bottom of HomeView
- `app/globals.css` — add `@keyframes trending-scroll`

### Risks
- Some new role entries (e.g. Mixamo) won't be addable, by design. The compatibility modal already explains why. We're surfacing them for *discovery*, not adding broken integrations.
- Auto-scroll can be visually noisy; the implementation pauses on hover so a user reading details isn't fighting the animation.
- The strip is decorative — it doesn't replace the proper picker. The Search input from Phase 3 is still the canonical way to add models.

### Tasks
- #88 Extend `AIRole` with `layered` + `rigging`; update RoleSelectorModal & ModelSearch chip mappings
- #89 Add 8 new catalogue entries (3 layered, 5 rigging) — verified URLs, accurate API-availability flags
- #90 Build `<TrendingAIBanner />` with CSS infinite-scroll + pause-on-hover + click-opens-compatibility-modal
- #91 Move Pro Tip block from bottom of HomeView to TOP of form view (above the form fields)
- #92 Mount TrendingAIBanner in HomeView's old Pro Tip slot
- #93 Add `trending-scroll` keyframe to globals.css
- #94 Smoke-test: open /project → see banner cycling at bottom → hover pauses → click any card → compatibility modal opens; click "New Project" → form page → Pro Tip is at top

---

## 2026-04-29 · Robust asset persistence — opened-from-history shows assets without re-generation

### User instruction
> "When I opened a saved project from history, it asks again to regenerate those assets. My objective was, when I generate the slots or other assets including animations, it shouldn't be lost and those images should stay intact making the copy in local machine or somewhere as per your best preference and intelligence. So that when the user clicks that project in history section and open it the generated images should be shown as generated in corresponding placeholders and then user can do some modifications via prompt or view it or download the copy. It shouldn't lose it and shouldn't ask me to regenerate because Ai will consume credits or tokens in that case. Like browser cache, the images should be shown as it is in the placeholders either keeping the copy in browser cache or local machine and in case we shift this project to server, it should be cached somewhere as per your preference. Animation files are also there those might be little bit heavyier so you should take care of it."

### Root-cause analysis

The IndexedDB migration on 2026-04-28 (task #42) was supposed to fix this. But the user is still seeing the "regenerate" banner. Two possibilities:

**Most likely**: The "Mystic treasures" project was saved BEFORE the migration. In the old localStorage code, when the save exceeded the ~5MB quota, the fallback path silently stripped every `imageUrl`. The migration then copied those already-stripped projects into IndexedDB. **The image data for that one project is gone — there's no way to recover it.** The banner is technically correct for that single legacy entry; regenerate is the only path back.

**For projects saved AFTER the IndexedDB migration**, the imageUrls SHOULD persist. We need to verify this and harden it.

The user's broader ask is also legitimate — make persistence so robust it survives anything: heavy animations, server moves, browser changes. Multi-tier strategy needed.

### Architecture — Multi-tier asset persistence

**Tier 1 — IndexedDB (current)**
- Already stores SavedProject with full asset array including `imageUrl` (base64 data URL).
- Quota is ~50% of disk on most browsers (gigabytes). No real cap for our use case.
- **Improvement**: store image bytes as **Blob** instead of base64 string. ~25% size saving + native binary storage. On load, convert Blob → object URL for the `<img>` tag.

**Tier 2 — Server-side asset cache (NEW)**
- New directory `data/assets/<userId>/<projectId>/<assetId>.<ext>`.
- On project save, parallel-upload each asset's bytes via `POST /api/assets/<projectId>/<assetId>` (admin-only).
- On project load, IndexedDB hit returns the asset directly. If IndexedDB is missing for some reason (cleared, different browser), the page falls back to fetching from `/api/assets/...` URL.
- This is the "in case we shift this project to server" line — gives us a backstop that survives the user's browser dying or moving to another machine.

**Tier 3 — Regenerate from saved form (existing)**
- Last-resort recovery when both IndexedDB AND server cache are gone (or for legacy stripped projects).
- Already implemented in task #43.

### Animations — handled the same way

Animations (when wired) come back as MP4/WebM blobs. Same persistence path — Blob in IndexedDB, file on disk in `data/assets/`. The user's concern about heaviness is valid: a 10s 720p MP4 is ~5–10MB. IndexedDB can hold thousands of these; server volume on Railway is 1GB which fits ~100–200 animations. We add a per-project size cap with oldest-asset eviction once we approach the limit.

### Implementation plan

**Phase A — In this turn**:
1. Audit existing IndexedDB save path; confirm new projects save with full imageUrls
2. Add `<UrlImg>` helper that handles both data URLs and `/api/assets/...` URLs gracefully
3. Add server-side asset cache: `POST /api/assets/[projectId]/[assetId]` (write) + `GET /api/assets/[projectId]/[assetId]` (read, no auth — public via opaque IDs)
4. After every successful project save to IndexedDB, fire-and-forget upload to server cache
5. On project restore, prefer the IndexedDB version; if any asset has empty imageUrl, attempt to fetch the server fallback URL based on project + asset IDs
6. Auto-save the project to IndexedDB on every successful asset (not just on user click of "Save") so the in-progress generation is persisted across reloads

**Phase B — Future (deferred)**:
- Switch IndexedDB internal format from base64 → Blob (modest performance + 25% space win)
- Server cache size cap with LRU eviction
- Pre-signed asset download URLs for sharing

### Why I'm not switching to Blob storage right now

Two reasons: (1) the existing code persists imageUrl as a string everywhere — switching to Blob requires touching every `<img src={asset.imageUrl}>` site. (2) The actual user complaint is about projects being lost / showing the regenerate banner — the fix for that is the multi-tier server cache, not a storage-format swap. Blob conversion is a quality-of-life improvement we can do later without changing user-visible behavior.

### Files (new)
```
app/api/assets/[projectId]/[assetId]/route.ts   ← GET (read) + PUT (write) for asset binaries
app/lib/assetCache.ts                            ← uploadAsset(projectId, assetId, dataUrl), assetCacheUrl(...)
data/assets/                                     ← gitignored, per-project asset storage
```

### Files updated
- `app/lib/projectStorage.ts` — after every IndexedDB save, fire-and-forget upload of new/changed assets to server cache
- `app/project/page.tsx` — auto-save the project to IndexedDB on every asset stream completion (not just user click); on restore, attempt server-cache fallback for any asset with empty imageUrl
- `app/components/AssetGrid.tsx` — `<img>` now uses an asset-URL helper that prefers data URL → server cache URL → empty placeholder

### Risks
- The `data/assets/` directory grows unbounded. Mitigation: add a janitor task that prunes assets for deleted projects (deferred to Phase B).
- Server cache is per-project + per-asset id. If project metadata is deleted from IndexedDB but the server still has the bytes, those bytes are orphaned. Janitor handles this too.
- For now we save `data/assets/<projectId>/<assetId>.png` — extension auto-detected from MIME. PNG/JPEG/WebP/MP4 covered.

### Tasks
- #95 Audit projectStorage IndexedDB save path; confirm new projects retain full imageUrls
- #96 Build `app/lib/assetCache.ts` (upload + URL helpers)
- #97 Build `/api/assets/[projectId]/[assetId]` route (GET + PUT, atomic write)
- #98 Wire fire-and-forget asset upload after every IndexedDB save
- #99 Auto-save project on every successful asset stream completion (not just user click)
- #100 On restore, fall back to server-cache URLs for any asset with empty imageUrl
- #101 Smoke-test: generate → save → reload page → open from history → assets render without regenerate banner

---

## 2026-04-29 · Cross-button remove + auto-sync added models across picker / home cards / API Keys

### User instruction
> "in phase 3 we added a search bar where we can search AI models as per our choice but there should be cross button at the corner of listed AI model buttons so that we can remove it in case we decide. In case we searched and added a new AI model, it will be added with cross button and it will be reflected in left panel and APIKEY panel — all should be automatically interconnected. If I subscribe, if you can fetch the APIkey then you should automatically map it to apikey section. If I remove any of the AI model it will be removed and UI will be updated. Project should be scalable, professional, highly fast and A+ level."

### Architect's analysis

The ask is real and I've under-delivered on Phase 3 — I added the search + add flow but the added entries don't actually show up in the picker yet, and there's no remove affordance. Rebuilding this properly:

**The principle**: there is ONE source of truth for "models visible to the user" — call it `effectiveModelOptions`. It's computed each render from:
- the always-on built-in list (`MODEL_OPTIONS`)
- the user-added catalogue entries from `userModels.ts` (read from localStorage)

Every UI that displays models — the home dashboard cards, the sidebar dropdown, the role selector modal — reads from `effectiveModelOptions`. Add or remove anywhere ⇒ the list re-renders everywhere automatically.

**Removal**: built-ins are non-removable (× hidden). Added entries get a × in the corner. Click → `removeUserModel(id)` → state updates → all consumers re-render. Same key tag clears any toasts/banners that referenced the removed model.

**API Keys panel sync**: Today the vault hard-codes 4 providers (openai/replicate/runway/imagineart) plus the free fallback. User-added catalogue entries with NEW providers (anthropic, google, deepseek, etc.) are flagged as `preview-only` or `coming-soon` in the catalogue — they don't yet have native integration, so they don't need a vault entry. **When Phase B lands the Anthropic + Google SDKs**, the vault's provider list expands and the panel will automatically pick them up.

**Subscribed → API key auto-fetch**: as established earlier, this isn't feasible cross-provider — browsers can't read tokens from third-party sites. Next-best is already in: clicking Subscribe opens the verified billing URL in a popup; the toast disclosure tells the user where to grab the key from; the API Keys panel is one click away for paste-back. We're not regressing that.

### Implementation strategy

1. **One adapter function** `catalogueEntryToModelOption(entry)`: turns a `CatalogueEntry` into the `ModelOption` shape the picker expects. Preview/coming-soon entries get `value: entry.id` (string) so they don't collide with the typed `ImageModel` union.
2. **Memo'd compute**: in `ProjectPage`, `effectiveModelOptions = useMemo(...)` based on `userAddedIds`.
3. **Replace every `MODEL_OPTIONS` reference** that's used for *display* with `effectiveModelOptions`. Keep `MODEL_OPTIONS` for type-narrowed lookups by the typed `ImageModel` (e.g., `selectedModel`).
4. **× remove affordance**: small circular × top-right of each card (HomeView) and inline with the actions row (sidebar dropdown). Only rendered for entries where `userAddedIds.includes(entry.id)`.
5. **Click on a preview entry**: doesn't activate the model (pipeline doesn't support it yet) — pops a toast: "*GPT-Image-1 (built-in) stays the active model. \<Entry\> is shown for visibility — Phase B will make it selectable.*"
6. **Cleanup on remove**: clear any toast keyed `alert:<provider>` and `sub-preview:<provider>` so a removed model doesn't leave orphaned banners.

### Files updated
- `app/project/page.tsx` — `effectiveModelOptions` memo; pass through to HomeView + Sidebar; thread `onRemoveUserModel` callback; render × in user-added rows; clicking preview models pops a "preview" toast instead of activating
- `app/components/ApiKeysPanel.tsx` — refactor footer note to mention "Provider list auto-grows as Phase B lands native integrations"

### Risks
- A user could "add" hundreds of models, bloating the picker. Mitigation: cap at 25 added entries (a generous ceiling). Anything beyond, the search returns "Limit reached — remove one to add another."
- Removing the currently-selected built-in model is impossible (no × on built-ins). This is intentional.
- Removing an added model that someone subscribed to keeps the subscription marker (cyan chip) on its provider. That's correct — the subscription is per-provider, not per-model.

### Tasks
- #102 Build `catalogueToModelOption()` adapter + `effectiveModelOptions` memo in ProjectPage
- #103 Thread effectiveModelOptions through HomeView and Sidebar (replace MODEL_OPTIONS for display)
- #104 Render × on user-added entries (HomeView card + sidebar dropdown row); wire to removeUserModel + state update + toast clear
- #105 Block "select" action on preview entries — show toast explaining why
- #106 Add "Limit reached" guard at 25 user-added entries
- #107 Smoke-test: search → add Claude → see it in HomeView cards + sidebar dropdown → click × → it disappears from both

---

## 2026-04-29 · × on ALL models + confirm modal + optional API-key cleanup

### User instruction
> "I mean same cross button should be added to the AI models already available by default for my website those you can see by default. If I tap on the cross button it will show the confirmation popup already exist, after confirmation it will be removed along with its API key."

### Architect's analysis

The previous × added in task #91 was deliberately limited to user-added models. The user is right to push back — they want to fully customize the picker. A proper implementation:

**Two kinds of removal**:
1. **Built-in** (e.g., GPT-Image-1) — *hide* from picker. Tracked in a new `removedBuiltInIds` localStorage list. Reversible via a "Show hidden" toggle.
2. **User-added** (e.g., Claude added from catalogue) — *un-add*. Tracked in the existing `userAddedIds` minus the id.

**One confirmation modal** for both, with an opt-in **"Also remove the [Provider] API key"** checkbox. The checkbox calls `DELETE /api/api-keys/<providerKey>` on confirm.

**Provider-key removal nuance**: multiple built-in models can share a provider key. Removing GPT-Image-1's API key would affect GPT-4o-mini. The modal should warn: *"⚠ The OpenAI key is also used by 3 other models in your picker. Removing it will require re-adding to use those."* Lists the other affected models inline.

**Restoration**: a small "Show hidden" toggle in the AI Models Available section header lets the user un-hide built-ins they removed by mistake. Default off.

### Files (new)
```
app/components/RemoveModelConfirmModal.tsx   ← shared remove-confirm with optional key-cleanup checkbox
```

### Files updated
- `app/lib/userModels.ts` — add `getRemovedBuiltInIds()`, `markBuiltInRemoved(id)`, `unmarkBuiltInRemoved(id)` + a `useUserModels()`-style external store would be cleaner, but a state-mirrored pair of arrays in `ProjectPage` is simpler and consistent with the existing pattern.
- `app/project/page.tsx` — render × on every card; on click, open `RemoveModelConfirmModal` with the model + a list of affected sibling models that share the provider key; on confirm, dispatch the right removal + optionally call DELETE on `/api/api-keys/<provider>`. effectiveModelOptions filters out removed built-ins.
- `app/components/ModelSearch.tsx` — search results account for `removedBuiltInIds` so a hidden built-in still searchable lets you "re-add" it (effectively unhide).

### Tasks
- #108 Extend userModels.ts with removedBuiltInIds + getter/marker/unmarker
- #109 Build `RemoveModelConfirmModal` (model + impact list + optional API-key checkbox)
- #110 Wire × on every card → open the confirm modal → branch by built-in vs user-added
- #111 Filter removed built-ins out of effectiveModelOptions; add "Show hidden" toggle to un-hide
- #112 Smoke-test: × on GPT-Image-1 → confirm popup shows OpenAI key impact warning → confirm without key cleanup → GPT-Image-1 hidden, key intact → toggle "Show hidden" → re-add

---

## 2026-04-29 · 30-second AI watchdog — auto-shuffle, auto-failover, auto-flag stale models

### User instruction
> "There are three main goals: prompt generator / graphics generator / animation generator. Every 30 seconds internally: (1) verify subscribed + token-linked + integrated AI models work properly. (2) If tokens are exhausted, check what AI models have balance/credits/tokens, automatically shuffle and arrange them left-to-right and start serving after auto-integration. (3) If models in the list are not eligible (can't fulfill the task), check time-to-time, highlight them and change color, suggest removal. (4) Every 30 seconds check + trigger messages + autocorrect to keep the process flawless."

### Architect's analysis — what's feasible vs the next-best

| Ask | Feasible? | What I'm shipping |
|---|---|---|
| 30-second internal check | ✅ | Client-side `useModelHealth()` watchdog hook tied to a 30s interval (paused when tab is hidden). |
| Verify "subscribed + token-linked + integrated" | ✅ | Combine `/api/providers/status` (already polled at 2.5s for status) + new `/api/usage` (Phase 4) for outcomes + the `integrationStatus` flag from the catalogue. Three-way join → per-model `health: "active" \| "healthy" \| "needs-key" \| "quota-out" \| "not-relevant" \| "stale"`. |
| Check "tokens / credits / balance" of each model | ⚠ Limited | No provider exposes a public remaining-credits endpoint with the dev key. **Next-best**: track local outcomes — `lastSuccessAt`, `lastFailureAt`, `failuresIn1h`. A provider with recent successes is "healthy"; one with recent quota errors is "quota-out". Same surface as a real balance check would deliver. |
| Auto-shuffle: rearrange picker left-to-right by health | ✅ | Sort `effectiveModelOptions` within each role by computed `priority`: active=0, healthy=10, needs-key=30, quota-out=70, not-relevant/stale=90. Re-renders on every health update so the order is always live. |
| Auto-integrate "after token fetch" | ❌ cross-provider | Browsers can't read tokens from third-party sites. We auto-promote to active the moment a key gets entered into the API Keys panel — that's the closest possible. |
| Auto-failover during generation | ✅ (1-step retry) | When the SSE generate route fails with `insufficient_quota` or 429, the client retries ONCE with the next-best healthy model in the same role. Toast informs the user about the swap. |
| Flag irrelevant models for removal | ✅ | Models with `integrationStatus ∈ {no-api, coming-soon, preview-only}` AND no recent successes get a rose-tinted card + a "Suggested for removal" pill. User can click × to clean them out (already wired). |

### Why this isn't the same as Phase 4

Phase 4 is the **read-only Usage panel** with traffic-light status — for the user to look at. Phase 5 (this) is the **autonomous controller** that uses the same data to MAKE DECISIONS — sort, retry, flag. Phase 4 is the dashboard; Phase 5 is the auto-pilot. Both share the usage tracker + aggregator. I'm building both together this turn (the panel + the controller).

### Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Server-side                                                         │
│                                                                      │
│  app/lib/usage/                                                      │
│  ├─ tracker.ts        record(provider, role, outcome, modelId)      │
│  ├─ aggregate.ts      perProviderSummary() → {success/fail counts,  │
│  │                      lastSuccessAt, lastFailureAt, last reason}  │
│  └─ data/usage.json   atomic append, 5000-event LRU                 │
│                                                                      │
│  app/api/usage/route.ts        GET (admin) → aggregated summaries   │
│                                                                      │
│  EVERY ai route                                                      │
│  /api/suggest, /suggest-all, /generate, /regenerate, /edit-asset,   │
│  /build/[category]/generate  →  tracker.record(...) post-call       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Client-side                                                         │
│                                                                      │
│  app/lib/modelHealth.ts                                              │
│    computeModelHealth(catalogueEntry, providerStatus, usage,         │
│                        userAddedIds, removedBuiltInIds)              │
│      → { status, priority, suggestForRemoval, reason }               │
│                                                                      │
│  app/components/useModelHealth.ts (hook)                             │
│    every 30s: fetch /api/usage + /api/providers/status              │
│    diff against previous health → fire toast on red transitions     │
│    expose modelHealthMap to ProjectPage                              │
│                                                                      │
│  ProjectPage                                                         │
│    effectiveModelOptions sorted by health.priority                  │
│    each card shows status pill + (optional) "Suggested for removal" │
│    quota error in /api/generate → retry once with next-best model   │
└──────────────────────────────────────────────────────────────────────┘
```

### Health classification

For each model in `effectiveModelOptions`:

| Status | Conditions | Priority | UI treatment |
|---|---|---|---|
| `active` | currently selected for its role + healthy | 0 | green dot · `Active` chip |
| `healthy` | API key configured, recent success | 10 | green dot · default styling |
| `subscribed` | user-marked subscribed (existing) | 15 | cyan border |
| `needs-key` | no key configured but provider integration exists | 30 | amber dot · `Needs API key` chip |
| `preview-only` | catalogue entry is preview-only / coming-soon | 40 | indigo dot · `Phase B preview` chip |
| `quota-out` | last call returned `insufficient_quota` / 429 | 70 | rose dot · pulse · `Quota out` chip |
| `stale` | preview/no-api AND no recent success in 24h | 85 | rose-tinted card · "Suggested for removal" pill · arrow → × |
| `not-relevant` | integrationStatus = "no-api" | 90 | rose-tinted card · "Cannot serve any role" pill |

### Auto-failover detail

When `/api/generate` SSE emits an `error` event with code `insufficient_quota` or HTTP 429:

1. Client catches the error before tearing down the loading view.
2. Looks up the active role's next-best model (lowest priority that's healthy + same role).
3. Toast: *"GPT-Image-1 hit OpenAI quota — retrying with FLUX 1.1 Pro Ultra (Replicate). One sec."*
4. Re-fires `handleSubmit(form)` with the swapped model.
5. Sets a `retriedOnce` flag so a second failure doesn't trigger an infinite loop.

### Files (new)
```
app/lib/usage/tracker.ts            ← server-side append-only event log
app/lib/usage/aggregate.ts          ← per-provider rollups
app/lib/modelHealth.ts              ← classifier — given catalogue + status + usage, returns health
app/api/usage/route.ts              ← GET aggregated summaries (admin)
app/components/useModelHealth.ts    ← 30s watchdog hook + diff/toast logic
app/components/UsagePanel.tsx       ← side-sheet panel (Phase 4 — read-only display)
```

### Files updated
- `app/api/suggest/route.ts`, `suggest-all/route.ts`, `generate/route.ts`, `regenerate/route.ts`, `edit-asset/route.ts`, `build/[category]/generate/route.ts` — call `tracker.record(provider, role, outcome, modelId)` after every provider call
- `app/project/page.tsx` — wire `useModelHealth`; sort effectiveModelOptions by `priority`; render status pills on cards; auto-failover handler in handleSubmit
- `app/components/RoleStatusStrip.tsx`, `RoleSelectorModal.tsx`, `ModelSearch.tsx` — read health when scoring/sorting

### Risks
- The 30s watchdog adds modest network load (1 fetch every 30s per open tab). Negligible.
- Auto-failover could surprise users — mitigation: explicit toast + a "Don't auto-failover" toggle in API Keys panel.
- Health flagging is a heuristic (we can't know real provider state without their endpoint). The "Suggested for removal" pill says "suggested" not "removed" — user makes the call.
- `data/usage.json` capped at 5000 events with oldest-first eviction; ~400KB on disk.

### Tasks (Phase 5 — execute this turn)
- #113 Build `app/lib/usage/tracker.ts` (atomic JSON append, 5000-event cap) + `aggregate.ts` (rollups)
- #114 Build `/api/usage` route (admin GET) + wire `tracker.record(...)` into all AI route handlers
- #115 Build `app/lib/modelHealth.ts` classifier (status + priority + suggestForRemoval)
- #116 Build `useModelHealth()` hook — 30s polling + diff toasts + health map state
- #117 Sort `effectiveModelOptions` by health.priority; render status pills + "Suggested for removal" treatment
- #118 Auto-failover in handleSubmit: catch quota error → retry once with next-best model in same role
- #119 Build `<UsagePanel />` side-sheet — read-only display layered on the same data
- #120 Smoke-test: trigger an OpenAI quota error → see role strip turn rose → see picker reorder → confirm auto-failover toast → see UsagePanel reflect the failure

### Risks / accountability for production-ready outputs

- **Asset dimensions**: every asset spec must encode exact pixel dimensions; the prompt builder writes a `Render at WxH` hint into each prompt. The image-generation provider may not honor this exactly (gpt-image-1 supports 1024², 1024×1536, 1536×1024) — for non-standard sizes we generate at the closest supported size and document that the user may need to resize.
- **PDF reference**: GPT-4o-mini can read multimodal images but PDFs need extraction first. We extract text with `pdfjs-dist` (lightweight, browser-friendly) and pass extracted text as additional context. Images inside PDFs are out of scope for v1.
- **Prototype URL**: we don't crawl the URL; we just include it as context in the AI prompt expander ("Reference: <URL>").
- **Q&A drift**: questions are static curated trees, not dynamic AI-generated. This keeps the wizard fast, deterministic, and resumable. AI is used at the END (prompt expansion + image generation), not in the question flow itself.
- **File size**: PDF up to 10MB, image up to 10MB; reject larger via `<input accept="...">` + server-side check.
- **Auth + storage**: only authenticated users can upload (proxy.ts); uploads go to `data/uploads/<userId>/<uuid>.pdf` with cleanup on completion.
- **Cost**: each build uses 1 GPT-4o-mini call (prompt expansion) + N image generations. With 12 assets per build at gpt-image-1's ~$0.19 each, that's ~$2.30 per utility app. Document in the wizard intro.

---

## 2026-04-28 · Host on GitHub + public deployment + transparent auto-sync

### User instruction
> "I want to host my website in git and create a public website link. Only workspace will be changed, whatever change I do it will commit and syncc to git properly. So that I won't feel any change. I have git account already."

### What this means
1. **Git hosting** — push the code to GitHub so it has version history + a remote.
2. **Public link** — deploy the app to a hosting platform that gives a public URL.
3. **Transparent sync** — the user wants to keep working in their local workspace and have changes automatically commit + push to GitHub (and auto-redeploy via the host's GitHub integration). They don't want to think about git commands.

### Critical caveat — persistent storage
The app currently stores **auth users** at `data/users.json` and **encrypted API keys** at `data/api-keys.enc.json`. These are **filesystem-backed**. Vercel (the obvious Next.js host) runs serverless functions with **ephemeral filesystems** — every cold start gives a fresh disk, so:
- The SUPER_ADMIN gets re-seeded on every cold start; previously-created users disappear.
- Panel-set API keys vanish.
- Login sessions still work (JWT is stateless) but the user record they reference is gone.

This is a **deal-breaker for Vercel** for this app as it stands today. Three options, in order of pragmatism:

| Option | Effort | Result |
|---|---|---|
| **A. Deploy to Railway** (recommended) | Low | Has persistent volumes; the JSON files survive restarts; same `git push` → auto-deploy story |
| **B. Migrate to Postgres** (Neon / Supabase) | Medium | Works on Vercel; future-proof; refactors `db.ts` + `vault.ts` from JSON to SQL |
| **C. Deploy to Vercel as-is** | Low | Ships, but auth + API-Keys panel are effectively non-functional in prod (data resets) |

**Recommendation: A (Railway)** — minimal refactor, app works exactly like it does locally, free tier is enough for an internal tool. Migration to Postgres can come later if/when needed.

### Step-by-step plan

**Phase 1 — Sanitise the repo before the first push**
- Confirm `.gitignore` excludes `data/`, `.env*`, `node_modules`, `.next`, `*.tsbuildinfo`. (Already true — verified.)
- Review `git status` to confirm no secret files are tracked.
- Make an initial commit of the current clean working tree.

**Phase 2 — Create GitHub remote and push (user does the GitHub-side step)**
- User: create a new repo on github.com (private or public — recommend **private**, since the codebase contains internal admin tooling).
- I provide: `git remote add origin <URL>` + `git branch -M main` + `git push -u origin main` instructions, with branching to handle the existing `main` branch in this repo.

**Phase 3 — Pick a host & deploy**
- Default: **Railway** (free $5/mo credit covers this app).
- User: sign in to Railway → "Deploy from GitHub" → select the repo → set env vars in Railway dashboard (JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, KEY_VAULT_SECRET, OPENAI_API_KEY, etc.) → attach a persistent volume mounted at `/app/data` so `data/users.json` survives restarts.
- Railway auto-deploys on every push to `main`.
- The user gets a public URL like `https://slotforge-ai-production.up.railway.app`.

**Phase 4 — Transparent sync**
Two flavours, user picks:

1. **One-command sync** (recommended — visible, controllable):
   - `npm run sync` → stages everything except gitignored, commits with a timestamped message, pushes.
   - Triggers a Railway redeploy; the public URL reflects within ~60s.
2. **File-watcher auto-commit** (zero-touch but riskier):
   - `npm run sync:watch` → uses a file watcher to debounce changes for 60s of inactivity, then commits + pushes.
   - Risks: half-saved files get committed; partial work is shipped; broken builds happen on the public URL until the next save fixes them. Reasonable for solo internal tooling, terrible for anything else.

I will set up **#1 by default**. The watcher script is added but opt-in.

### Files (new)
```
scripts/sync.sh                  ← npm run sync — add -A · commit · push
scripts/sync-watch.js            ← npm run sync:watch — debounced auto-sync (opt-in)
DEPLOY.md                        ← step-by-step deployment guide
railway.toml                     ← Railway config: persistent volume mount at /app/data
```

### Files updated
- `package.json` — adds `sync` and `sync:watch` scripts; dev-dep `chokidar` (only for the watcher; install only if user opts in)
- `.gitignore` — already correct; verify

### Risks
- **Secrets must NOT enter git history**. Before the first push I will run a final audit: `git diff --cached`, `git ls-files | grep -i 'env\|secret\|password\|data/'` to confirm nothing slipped in. If anything sensitive was tracked previously, we'll fix history with `git rm --cached` + a fresh commit.
- The user's CURRENT `.env.local` contains a real OpenAI key + admin password. Confirmed gitignored. Will NOT be committed.
- Auto-deploy means a broken commit immediately breaks the public URL. Mitigation: Railway shows deploy status; rollback is one click; the watcher script defaults to a 60s debounce so brief broken states get corrected before the deploy fires.
- Public URL exposes the login page to the internet. This is fine — it's gated behind credentials, rate-limited, and uses HTTP-only secure cookies. But: anyone can probe the login form. Recommendation: keep the GitHub repo **private** to avoid leaking internal logic; deploy is OK to be public-URL since auth is enforced.
- Volume costs on Railway: small. Free tier covers this app comfortably.

### Tasks
- #77 Append this context.md section
- #78 Audit current git status and confirm nothing sensitive is staged; create initial commit on the current branch (no push)
- #79 Add `scripts/sync.sh` + `npm run sync` script + executable bit
- #80 Add `scripts/sync-watch.js` + `npm run sync:watch` (opt-in, doc the install)
- #81 Add `railway.toml` with persistent volume mount config
- #82 Add `DEPLOY.md` walking through GitHub repo creation + Railway deploy + env vars + first verification
- #83 Hand the user the exact 3-line command sequence to push once they have a GitHub repo URL

---

## 2026-04-29 · Phase 5 — 30-second AI watchdog (COMPLETED)

### What shipped

All tasks #95–#102 are done and running.

#### Infrastructure (server-side)
- `app/lib/usage/tracker.ts` — atomic JSON append log at `data/usage.json`, 5000-event LRU
- `app/lib/usage/aggregate.ts` — per-provider rollups (1h/24h success/failure counts, last timestamps, traffic-light)
- `app/api/usage/route.ts` — admin GET endpoint → per-provider summaries + dashboard URLs
- All AI route handlers now call `tracker.record(provider, role, outcome, modelId)`:
  - `app/api/suggest/route.ts` ✓
  - `app/api/suggest-all/route.ts` ✓
  - `app/api/generate/route.ts` ✓ (prompt + per-image tracking; `inferProvider()` helper)
  - `app/api/regenerate/route.ts` ✓
  - `app/api/edit-asset/route.ts` ✓ (inside buildEditPrompt for prompt, in route for image)
  - `app/api/build/[category]/generate/route.ts` ✓

#### Client-side watchdog
- `app/lib/modelHealth.ts` — `computeModelHealth()` + `computeAllModelHealth()`:
  - 8-tier status: active → healthy → subscribed → needs-key → preview-only → quota-out → stale → not-relevant
  - Priority scores: 0/10/15/30/40/70/85/90 (lower = first in picker)
  - `suggestForRemoval: true` for stale and not-relevant
- `app/components/useModelHealth.ts` — React hook:
  - Polls `/api/usage` every 30s (pauses on tab hide)
  - Diffs previous health map, fires `onTransition` on status changes
  - Triggers toasts on quota-out / stale transitions
- `app/project/page.tsx` changes:
  - `rawModelOptions` (unsorted) feeds hook; `effectiveModelOptions` is sorted by health priority
  - `useModelHealth` wired with `onTransition` → push toast on quota-out/stale
  - Model cards: `HealthBadge` pills + rose-tinted stale/not-relevant treatment + "Suggested for removal" strip
  - `handleSubmit` auto-failover: on quota/rate error, retry once with next healthy model, toast names the swap
  - `fillAllToastIdRef` + `retriedOnceRef` refs added
- `app/components/UsagePanel.tsx` — admin side-sheet with per-provider usage stats

### Bug fixes

#### Fill All toast fires every second (fixed)
Root cause: `suggestField()` called `onPoweredBy` on every invocation (called 25× by suggestAll).
Fix: Moved `onPoweredBy` out of `suggestField`; added `onFillAllStart/onFillAllEnd` props to ProjectForm.
`onFillAllStart` → sticky toast via `toasts.push({ sticky: true })`. `onFillAllEnd` → `toasts.dismiss(id)`.

#### Generate Assets toast only showed image model (fixed)
Fix: Replaced `toasts.poweredBy()` with `toasts.push({ sticky: true, key: "generating-active" })` showing both image and animation model in one popup. Dismissed via `toasts.clearByKey("generating-active")` on success and error.

### Pending
- #56 Smoke-test build wizard flows (utility-app + board-game) end-to-end

---

## 2026-04-29 · Phase 6 — Pre-generation Machine Preview (no-token)

### Why
Today every "Generate Assets" click costs real GPT-Image-1 / FLUX tokens (~$0.19–$0.06 per image × 10–20 assets = $2–4 per attempt). Users routinely submit before they can tell if their styleDNA direction will look right. By the time the assets stream back, money is already burned.

The fix: an instant, **zero-token** machine prototype that renders directly from the form fields the user has typed. The preview is composed client-side from CSS gradients, theme-keyword-mapped emoji symbols, and a generated palette — no API calls. If the user likes what they see, they hit Generate Assets and now know the direction is right. If they don't like it, they edit the form (free) or open the optimization modal and refine the master prompt (also free until they explicitly click "Polish with AI").

This is the architectural commitment: **the gate before paid generation must itself be free**.

### User-visible behaviour
1. **"👁️ Preview" button** appears next to "Generate Assets →" — only when the same `isValid` gate passes (gameName + theme + at least one asset type).
2. Click Preview → a high-end mock slot machine renders inline below the form, using:
   - Theme-keyword-mapped symbols (Egyptian → 𓂀 𓆣 ☥ 👑 💎; Treasure → 💰 💎 👑 🏆 ⭐; Fantasy → 🐉 ⚔️ 🛡️ 🧙 🔮; Sci-fi → 🚀 🛸 🪐 🤖 ⭐; Generic → 7️⃣ 💎 BAR 🔔 🍒)
   - styleDNA palette derived from `colorPalette` field (parsed for color words / hex / fallback to amber+indigo gradient)
   - Animated reels, mock paylines, ornate spin button, win counter, balance display
   - Title plate using `gameName`
3. Snapshot **persists in IndexedDB** as part of the project — survives reload until "New Project" or page reload.
4. **Double-click the preview** → modal opens with:
   - Larger machine view
   - Auto-derived "Master Prompt" textarea pre-filled with the composite styleDNA description
   - "Save Optimization" button (free) — persists user-edited prompt
   - Optional "✨ Polish with AI" button → calls `/api/preview-machine` (paid; explicit opt-in) and returns a photoreal composite that replaces the SVG mock
5. **Generate Assets** uses the saved `optimizedPrompt` (if present) as the master directive — prepended to styleDNA so every per-asset prompt aligns to the look the user approved.
6. On the results view, the saved preview snapshot remains visible as a reference card so the user can compare prototype vs real.

### Architecture

#### Type changes (`app/types/index.ts`)
```typescript
export interface PreviewSnapshot {
  capturedAt: string;
  derivedDNA: { palette: string[]; mood: string; symbols: string[]; titleColor: string };
  optimizedPrompt?: string;   // user's manually-edited / AI-polished master prompt
  polishedImageUrl?: string;  // set if user clicked "Polish with AI"
}
export interface SavedProject {
  // ... existing fields
  previewSnapshot?: PreviewSnapshot;
}
```

#### New files
- `app/lib/themeSymbols.ts` — `getSymbolsForTheme(themeText) → string[]` keyword map
- `app/lib/derivePreviewDNA.ts` — `derivePreviewDNA(form) → { palette, mood, symbols, titleColor }` pure client-side derivation
- `app/components/MachinePreviewComposite.tsx` — the SVG/CSS composite (no API, instant)
- `app/components/MachinePreviewModal.tsx` — full-screen popup with optimization textarea + AI polish button

#### Modified files
- `app/components/ProjectForm.tsx` — Preview button next to submit; calls `onPreview` prop
- `app/project/page.tsx` — `previewSnapshot` state, modal wiring, persist to IndexedDB, render on results, thread `optimizedPrompt` to `/api/generate`
- `app/api/generate/route.ts` — accept optional `optimizedPrompt` in body
- `app/lib/promptBuilder.ts` — `buildStyleDNA` accepts `optimizedPrompt` and injects into `mood` so it propagates to every per-asset prompt downstream

### Key design decisions
- **Zero-token by default.** The composite is pure SVG/CSS/emoji. AI polish is opt-in.
- **Symbol mapping is keyword-based, not AI.** Cheap, deterministic, instant. Five theme buckets (treasure / Egyptian / fantasy / sci-fi / generic) cover ~85% of slot themes. Misses fall back to generic.
- **Optimization persists at project level**, not session. Reload-safe via IndexedDB (already present).
- **Master prompt injection point is `buildStyleDNA`**, not per-asset prompt. This keeps consistency: one optimization → reflected in every asset prompt automatically.
- **Modal opens on double-click** (per user request). Single click = no-op so users can read the preview without accidentally opening the modal.

### Tasks
- #103 Add PreviewSnapshot type + thread through SavedProject
- #104 Build themeSymbols.ts (keyword → emoji symbols map)
- #105 Build derivePreviewDNA.ts (form → DNA without API)
- #106 Build MachinePreviewComposite.tsx (zero-token SVG/CSS mock)
- #107 Build MachinePreviewModal.tsx with optimization textarea + opt-in AI polish
- #108 Wire Preview button into ProjectForm; render composite inline on click
- #109 Persist snapshot via IndexedDB; thread optimizedPrompt to /api/generate; show on results
- #110 Smoke-test full flow: fill form → preview → optimize → generate → verify alignment

---

## 2026-04-29 · Phase 8 — Resilient streaming + visible failures

### Bug
On the asset generation page, after 1–3 minutes the UI appears stuck — only one or two images render, the rest stay as skeleton spinners forever, no error visible.

### Root cause (two compounding bugs)
1. **Server `/api/generate/route.ts:66-77`** uses `Promise.all` per batch of 3. When one image fails (quota tipping over mid-stream, content policy, network blip), `Promise.all` rejects → outer try/catch fires → ONE generic `error` event is sent → stream closes. The other 2 successful images in that batch are never emitted, and subsequent batches never run. From the client's perspective, generation just stops.
2. **Client `page.tsx:740-769`** handles the `error` event by calling `setError + setStep("form")` — but the user is sitting on the results page with skeleton spinners. The form view is hidden, so the error message is invisible. The skeletons stay forever because `regenIds` is never cleared on the failure path.

### Fix design
**Server:**
- Switch to `Promise.allSettled` per batch so ONE image failure does not lose the rest.
- Emit a new `asset_error` SSE event per failed image: `{ type: "asset_error", id, label, message, code }`. Stream continues.
- Track consecutive batch failures: if 2 batches in a row produce ZERO successes, or any image returns `auth_failed` / `quota_exhausted`, emit `fatal` event with the reason and stop. (Continuing past quota would just burn 10 more failures.)
- Keep the existing `error` event semantics for pre-stream failures (prompt build, validation).

**Client:**
- Handle `asset_error`: remove the id from `regenIds`, mark the asset with an `error` field, show inline failure UI on the card with a retry button.
- Handle `fatal`: show a prominent **alert modal** (not a quiet toast) naming the model, reason, count of completed/failed, and offering: Retry with current model · Retry with free fallback · Cancel.
- On any stream end (success, error, fatal, abort): defensive `setRegenIds(new Set())` so no skeleton stays stuck.
- Stall watchdog: if no event for 75s, show "Generation stalled" alert with manual retry. Resets on every event.

### Tasks
- #116 Add `error?: string` to Asset type + new `asset_error` / `fatal` SSE event types
- #117 Switch `/api/generate` to Promise.allSettled + per-asset error emission + fatal-on-quota stop
- #118 Build `GenerationAlertModal.tsx` (prominent modal with retry options)
- #119 Wire client: handle asset_error, fatal events, defensive regenIds clear, stall watchdog
- #120 Render inline failure UI + retry button on failed asset cards in AssetGrid
