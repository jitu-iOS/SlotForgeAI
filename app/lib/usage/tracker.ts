import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE     = path.join(DATA_DIR, "usage.json");
const CAP      = 5000;

export type UsageOutcome =
  | "success"
  | "rate_limited"
  | "quota_exhausted"
  | "auth_failed"
  | "network_error"
  | "other_failure";

export interface UsageEvent {
  ts: number;          // ms epoch
  provider: string;    // openai / replicate / runway / imagineart / free / etc.
  role: string;        // prompt / image / animation / layered / rigging
  outcome: UsageOutcome;
  modelId?: string;
  reason?: string;     // optional human-readable detail
}

let cache: UsageEvent[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(FILE); }
  catch { await fs.writeFile(FILE, "[]", "utf8"); }
}

async function loadAll(): Promise<UsageEvent[]> {
  if (cache) return cache;
  await ensureFile();
  try {
    const raw = await fs.readFile(FILE, "utf8");
    cache = raw.trim() ? (JSON.parse(raw) as UsageEvent[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(events: UsageEvent[]): Promise<void> {
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(events), "utf8");
  await fs.rename(tmp, FILE);
  cache = events;
}

/**
 * Append one event to the log. Caps at CAP — oldest dropped on overflow.
 * Fire-and-forget from callers; errors are swallowed (usage tracking must
 * never break the actual generation pipeline).
 */
export function record(ev: Omit<UsageEvent, "ts">): void {
  const event: UsageEvent = { ...ev, ts: Date.now() };
  writeQueue = writeQueue.then(async () => {
    try {
      const events = await loadAll();
      events.push(event);
      const trimmed = events.length > CAP ? events.slice(events.length - CAP) : events;
      await persist(trimmed);
    } catch (err) {
      console.warn("[usage/tracker] record failed:", err);
    }
  });
}

export async function readAll(): Promise<UsageEvent[]> {
  const events = await loadAll();
  return [...events];
}

/**
 * Best-effort outcome classifier — pass an Error / Response into this and
 * get back the right UsageOutcome bucket.
 */
export function classifyError(err: unknown, status?: number): UsageOutcome {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.toLowerCase();
  if (m.includes("insufficient_quota") || m.includes("quota") || m.includes("billing")) return "quota_exhausted";
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 429 || m.includes("rate limit")) return "rate_limited";
  if (m.includes("fetch") || m.includes("network") || m.includes("timeout")) return "network_error";
  return "other_failure";
}
