import { readAll, type UsageEvent, type UsageOutcome } from "./tracker";

export interface ProviderUsageSummary {
  provider: string;
  totalEvents: number;
  successes24h: number;
  failures24h: number;
  successesIn1h: number;
  failuresIn1h: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastFailureReason: string | null;
  lastFailureOutcome: UsageOutcome | null;
  /** "green" | "amber" | "red" — the traffic-light state for the panel */
  light: "green" | "amber" | "red" | "gray";
}

const HOUR = 60 * 60 * 1000;
const DAY  = 24 * HOUR;

export async function perProviderSummary(): Promise<Record<string, ProviderUsageSummary>> {
  const events = await readAll();
  const byProvider = new Map<string, UsageEvent[]>();
  for (const e of events) {
    const arr = byProvider.get(e.provider) ?? [];
    arr.push(e);
    byProvider.set(e.provider, arr);
  }

  const now = Date.now();
  const out: Record<string, ProviderUsageSummary> = {};

  for (const [provider, list] of byProvider) {
    const success24 = list.filter((e) => e.outcome === "success" && now - e.ts < DAY).length;
    const fail24    = list.filter((e) => e.outcome !== "success" && now - e.ts < DAY).length;
    const success1h = list.filter((e) => e.outcome === "success" && now - e.ts < HOUR).length;
    const fail1h    = list.filter((e) => e.outcome !== "success" && now - e.ts < HOUR).length;

    const lastSuccess = list.filter((e) => e.outcome === "success").sort((a, b) => b.ts - a.ts)[0];
    const lastFailure = list.filter((e) => e.outcome !== "success").sort((a, b) => b.ts - a.ts)[0];

    out[provider] = {
      provider,
      totalEvents: list.length,
      successes24h: success24,
      failures24h: fail24,
      successesIn1h: success1h,
      failuresIn1h: fail1h,
      lastSuccessAt: lastSuccess?.ts ?? null,
      lastFailureAt: lastFailure?.ts ?? null,
      lastFailureReason: lastFailure?.reason ?? null,
      lastFailureOutcome: (lastFailure?.outcome as UsageOutcome | undefined) ?? null,
      light: trafficLight(lastSuccess?.ts ?? null, lastFailure?.ts ?? null, lastFailure?.outcome),
    };
  }

  return out;
}

function trafficLight(
  lastSuccessAt: number | null,
  lastFailureAt: number | null,
  lastFailureOutcome: UsageOutcome | undefined,
): "green" | "amber" | "red" | "gray" {
  if (lastSuccessAt === null && lastFailureAt === null) return "gray";

  const now = Date.now();
  const failureFresh = lastFailureAt !== null && now - lastFailureAt < HOUR;
  const successFresh = lastSuccessAt !== null && now - lastSuccessAt < HOUR;

  // Hard red: recent quota / auth failure with no recent success since.
  if (failureFresh && (lastFailureOutcome === "quota_exhausted" || lastFailureOutcome === "auth_failed")) {
    if (lastSuccessAt === null || lastSuccessAt < (lastFailureAt ?? 0)) return "red";
  }

  // Amber: any recent failure but mostly working.
  if (failureFresh) return "amber";

  // Green: recent success.
  if (successFresh) return "green";

  // Gray: no recent activity.
  return "gray";
}
