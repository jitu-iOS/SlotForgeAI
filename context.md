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
