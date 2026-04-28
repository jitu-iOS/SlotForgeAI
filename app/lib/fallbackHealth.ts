import { FALLBACK_REGISTRY } from "./freeFallbacks";

export interface FallbackHealthEntry {
  id: string;
  name: string;
  healthy: boolean;
  lastCheckedAt: string; // ISO
}

const STALE_MS = 5 * 60 * 1000; // re-probe every 5 min
const cache = new Map<string, FallbackHealthEntry>();
let inFlight: Promise<void> | null = null;

async function probeAll(): Promise<void> {
  await Promise.all(
    FALLBACK_REGISTRY.map(async (a) => {
      const healthy = await a.ping().catch(() => false);
      cache.set(a.id, {
        id: a.id,
        name: a.name,
        healthy,
        lastCheckedAt: new Date().toISOString(),
      });
    }),
  );
}

function isStale(entry: FallbackHealthEntry | undefined): boolean {
  if (!entry) return true;
  return Date.now() - new Date(entry.lastCheckedAt).getTime() > STALE_MS;
}

/**
 * Returns the current cached health for all registered fallbacks.
 * Lazily kicks off a fresh probe in the background when entries are stale,
 * so callers never block on the network — they get the last-known state
 * immediately and the next call gets refreshed data.
 */
export async function getFallbackHealth(): Promise<FallbackHealthEntry[]> {
  const anyStale = FALLBACK_REGISTRY.some((a) => isStale(cache.get(a.id)));
  if (anyStale && !inFlight) {
    inFlight = probeAll().finally(() => { inFlight = null; });
  }

  // If we have NOTHING in cache yet (cold start), wait for the first probe.
  // Otherwise return what we have and let the background refresh complete.
  if (cache.size === 0 && inFlight) {
    await inFlight;
  }

  return FALLBACK_REGISTRY.map((a) => cache.get(a.id) ?? {
    id: a.id,
    name: a.name,
    healthy: false,
    lastCheckedAt: new Date(0).toISOString(),
  });
}

export function isAnyFallbackHealthy(): boolean {
  for (const entry of cache.values()) if (entry.healthy) return true;
  return false;
}
