# SlotForge AI — Deployment & Sync Guide

Get this app live on a public URL with `git push`-driven auto-deploy. Uses **Railway** (recommended — persistent storage works) instead of Vercel (ephemeral filesystem would break our auth + API-keys vault).

---

## TL;DR

```bash
# 1. Make a private repo on github.com  (web UI — name it slotforge-ai)
# 2. Wire up the remote and push
git remote add origin git@github.com:<your-username>/slotforge-ai.git
git branch -M main
git push -u origin main

# 3. Sign in to Railway → "Deploy from GitHub repo" → pick slotforge-ai
# 4. In Railway → Settings → Variables: paste env vars (see below)
# 5. In Railway → Settings → Volumes: add a volume mounted at /app/data
# 6. Done — every `npm run sync` from now on triggers a redeploy.
```

---

## 1. GitHub repo

Create a **private** repo on github.com (recommend private — this codebase contains internal admin tooling). Name it `slotforge-ai`. Don't initialise it with a README — we already have a working tree.

Then locally:
```bash
git remote add origin git@github.com:<your-username>/slotforge-ai.git
git branch -M main
git push -u origin main
```

(Use the HTTPS URL `https://github.com/<user>/slotforge-ai.git` instead if you don't have SSH set up.)

---

## 2. Railway deploy

1. Go to https://railway.com → **New Project** → **Deploy from GitHub repo** → pick `slotforge-ai`.
2. Railway auto-detects Next.js (via `package.json`) and starts a build.
3. While that runs, configure the rest:

### 2a. Environment variables

In the Railway project → **Variables** tab → paste these. Pick fresh values for the secrets — **do not reuse your local dev secrets**.

```
JWT_SECRET=<openssl rand -base64 48>
KEY_VAULT_SECRET=<openssl rand -base64 32>
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<a strong password — used once on first boot to seed the SUPER_ADMIN>
ADMIN_NAME=System Owner
OPENAI_API_KEY=<your live OpenAI key>
# Optional providers:
# REPLICATE_API_TOKEN=...
# RUNWAY_API_KEY=...
# IMAGINEART_API_KEY=...
```

### 2b. Persistent volume (CRITICAL)

The auth users + vault are JSON files at `data/`. Without a volume, every restart wipes them.

1. Railway → project → **Settings** → **Volumes** → **New Volume**.
2. Mount path: `/app/data`.
3. Size: 1 GB (smallest option — way more than needed).
4. Save. Railway redeploys with the volume attached.

`railway.toml` in the repo already declares this volume; the dashboard step above is just to confirm Railway provisions it on the first deploy.

### 2c. Public URL

Railway → project → **Settings** → **Networking** → **Generate Domain**. You'll get a URL like:
```
https://slotforge-ai-production.up.railway.app
```

Open it, sign in with the SUPER_ADMIN credentials you set in 2a.

---

## 3. Daily workflow — transparent sync

Two flavours, pick the one that matches your style:

### Manual (recommended)
```bash
npm run sync                       # auto-timestamped commit + push
npm run sync -- "fix dashboard bug"  # custom message
```
That's it. Railway picks up the push and redeploys (~60s).

### Auto file-watcher (opt-in, riskier)
```bash
npm i -D chokidar              # one-time
npm run sync:watch             # then leave running in a terminal
```
Watches the working tree; 60s after the last edit, auto-commits + pushes.

**Trade-offs**: half-saved files get committed; broken intermediate states ship to the public URL. Fine for solo internal tooling, terrible for anything else. Use `npm run sync` instead unless you really want zero-touch.

---

## 4. Verifying it works

After the first deploy:

```bash
# Login should respond
curl -i https://<your-url>/api/auth/me
# → HTTP 200, {"user":null}

# Login as SUPER_ADMIN should set a cookie
curl -i -c /tmp/cookies -X POST https://<your-url>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@yourdomain.com","password":"<the password you set>"}'
# → HTTP 200, sets sf_session cookie

# Subsequent requests with the cookie should hydrate the user
curl -b /tmp/cookies https://<your-url>/api/auth/me
# → HTTP 200, {"user":{...,"role":"SUPER_ADMIN"}}
```

If `/api/auth/me` returns the user **and survives a redeploy** (Railway redeploys you can trigger from the dashboard), the volume is wired up correctly. If the user "disappears" after redeploy, the volume isn't mounted — re-check step 2b.

---

## 5. Common gotchas

- **OpenAI key in Railway env vars**: paste your real key, not the dev one. It works the same.
- **Image generation 502s**: Railway's default request timeout is 60s. Long generations may need a higher `maxDuration`. We already set `export const maxDuration = 300;` on the SSE generate route — should be fine.
- **Cold starts**: free Railway containers can scale to zero on inactivity. First request after idle adds ~3-5s. Upgrade plan if that's not OK.
- **Custom domain**: Railway → Settings → Networking → Custom Domain. Point a CNAME at the Railway-provided domain.
- **Rolling back a bad deploy**: Railway → Deployments → click an older successful deploy → **Redeploy**.

---

## 6. What stays LOCAL only (never committed)

`.gitignore` already excludes:
- `.env*` — your dev secrets
- `data/` — your local users.json + api-keys.enc.json
- `node_modules/` + `.next/` — build artifacts
- `backend/` + `claude/` + `.claude/` — scratch / local tooling

Verified before the first commit. To re-audit any time:
```bash
git ls-files | grep -iE 'env|secret|password|users\.json|api-keys'
```
Should return only the route handler filenames, never any data.
