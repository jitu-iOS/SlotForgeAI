#!/usr/bin/env node
/**
 * scripts/sync-watch.js — opt-in file watcher that auto-runs `npm run sync`
 * after a debounce window of inactivity.
 *
 * Run:        npm run sync:watch
 * First time: npm i -D chokidar
 *
 * Defaults: 60s debounce, ignores node_modules / .next / .git / data / .env*
 *
 * Trade-offs (read these before using):
 *   - Half-saved files can get committed and shipped.
 *   - Broken builds will be visible on the public URL until the next save fixes
 *     them. Reasonable for solo internal tooling, dangerous for anything else.
 *   - Prefer `npm run sync` (manual, visible) for production-bound work.
 */
"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");

let chokidar;
try {
  chokidar = require("chokidar");
} catch {
  console.error("[sync:watch] chokidar is not installed.");
  console.error("            Run:  npm i -D chokidar  (one-time)");
  process.exit(1);
}

const DEBOUNCE_MS = 60_000;
const ROOT = process.cwd();

const watcher = chokidar.watch(".", {
  ignored: [
    /(^|[/\\])\../,            // dotfiles (.git, .next, .env*, .claude)
    "node_modules/**",
    ".next/**",
    "data/**",
    "backend/**",
    "claude/**",
    "scripts/sync*",           // don't trigger on our own scripts running
  ],
  ignoreInitial: true,
  persistent: true,
  awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
});

let timer = null;
let pending = 0;

function scheduleSync() {
  pending += 1;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runSync, DEBOUNCE_MS);
}

function runSync() {
  const count = pending;
  pending = 0;
  timer = null;
  console.log(`[sync:watch] ${count} change(s) detected — running sync…`);
  const child = spawn("bash", [path.join(ROOT, "scripts/sync.sh")], { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code === 0) console.log("[sync:watch] ✓ done. Watching for next change…");
    else console.warn(`[sync:watch] sync.sh exited with code ${code}; will try again on next change.`);
  });
}

watcher.on("all", (event, file) => {
  if (event === "addDir" || event === "unlinkDir") return;
  console.log(`[sync:watch] ${event} ${file}`);
  scheduleSync();
});

console.log(`[sync:watch] watching ${ROOT}`);
console.log(`[sync:watch] debounce: ${DEBOUNCE_MS / 1000}s of inactivity → auto-sync. Ctrl-C to stop.`);
