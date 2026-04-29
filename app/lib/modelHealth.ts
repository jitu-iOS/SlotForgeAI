import type { CatalogueEntry } from "./aiCatalogue";
import type { ProviderUsageSummary } from "./usage/aggregate";

// ── Health status taxonomy ────────────────────────────────────────────────────

export type HealthStatus =
  | "active"        // currently selected + healthy
  | "healthy"       // key configured + recent success
  | "subscribed"    // user marked subscribed
  | "needs-key"     // no key but provider API exists
  | "preview-only"  // catalogue entry is preview / coming-soon
  | "quota-out"     // last call returned quota_exhausted / 429
  | "stale"         // preview/no-api AND no recent success in 24h
  | "not-relevant"; // integrationStatus = "no-api"

export interface ModelHealth {
  modelId: string;         // matches ModelOption.value
  status: HealthStatus;
  priority: number;        // lower = shown first
  suggestForRemoval: boolean;
  reason: string;          // short user-facing explanation
}

const PRIORITY: Record<HealthStatus, number> = {
  "active":       0,
  "healthy":      10,
  "subscribed":   15,
  "needs-key":    30,
  "preview-only": 40,
  "quota-out":    70,
  "stale":        85,
  "not-relevant": 90,
};

// ── Per-model classifier ──────────────────────────────────────────────────────

export interface ModelHealthInput {
  modelId: string;
  providerKey: string;           // "openai" | "replicate" | "imagineart" | "runway" | "free"
  integrationStatus?: CatalogueEntry["integrationStatus"]; // undefined = built-in native
  isSelected: boolean;           // is this the currently active model for its role?
  isSubscribed: boolean;
  providerConfigured: boolean;   // does the server have an API key for this provider?
  usage: ProviderUsageSummary | undefined;
}

const HOUR = 60 * 60 * 1000;
const DAY  = 24 * HOUR;

export function computeModelHealth(input: ModelHealthInput): ModelHealth {
  const { modelId, providerKey, integrationStatus, isSelected, isSubscribed, providerConfigured, usage } = input;

  const now = Date.now();
  const recentSuccess = usage ? (usage.lastSuccessAt !== null && now - usage.lastSuccessAt < DAY) : false;
  const recentFailure = usage ? (usage.lastFailureAt !== null && now - usage.lastFailureAt < HOUR) : false;
  const quotaOut = recentFailure && (usage?.lastFailureOutcome === "quota_exhausted" || usage?.lastFailureOutcome === "auth_failed" || usage?.lastFailureOutcome === "rate_limited");

  // not-relevant: no public API at all
  if (integrationStatus === "no-api") {
    return {
      modelId,
      status: "not-relevant",
      priority: PRIORITY["not-relevant"],
      suggestForRemoval: true,
      reason: "No public API — cannot generate assets",
    };
  }

  // stale: preview/coming-soon + no success in 24h
  if ((integrationStatus === "preview-only" || integrationStatus === "coming-soon") && !recentSuccess) {
    return {
      modelId,
      status: "stale",
      priority: PRIORITY["stale"],
      suggestForRemoval: true,
      reason: "Preview model with no recent successful calls",
    };
  }

  // quota-out: recent quota / auth failure
  if (quotaOut) {
    return {
      modelId,
      status: "quota-out",
      priority: PRIORITY["quota-out"],
      suggestForRemoval: false,
      reason: usage?.lastFailureOutcome === "quota_exhausted"
        ? "Quota exhausted — top up to continue"
        : usage?.lastFailureOutcome === "auth_failed"
        ? "Auth failed — check your API key"
        : "Rate limited — will auto-recover",
    };
  }

  // needs-key: API exists but no key configured
  if (!providerConfigured && providerKey !== "free") {
    return {
      modelId,
      status: "needs-key",
      priority: PRIORITY["needs-key"],
      suggestForRemoval: false,
      reason: `Add a ${providerKey} API key to activate`,
    };
  }

  // preview-only: catalogued but integration is preview
  if (integrationStatus === "preview-only" || integrationStatus === "coming-soon") {
    return {
      modelId,
      status: "preview-only",
      priority: PRIORITY["preview-only"],
      suggestForRemoval: false,
      reason: "Preview — routes through fallback today",
    };
  }

  // active: selected + key configured + healthy
  if (isSelected && providerConfigured) {
    return {
      modelId,
      status: "active",
      priority: PRIORITY["active"],
      suggestForRemoval: false,
      reason: "Active — serving this role",
    };
  }

  // subscribed: user explicitly subscribed
  if (isSubscribed) {
    return {
      modelId,
      status: "subscribed",
      priority: PRIORITY["subscribed"],
      suggestForRemoval: false,
      reason: "Subscribed and ready",
    };
  }

  // healthy: key configured + recent success (or free tier)
  if (providerConfigured || providerKey === "free") {
    return {
      modelId,
      status: "healthy",
      priority: PRIORITY["healthy"],
      suggestForRemoval: false,
      reason: recentSuccess ? "Key configured — recently succeeded" : "Key configured",
    };
  }

  // fallback
  return {
    modelId,
    status: "needs-key",
    priority: PRIORITY["needs-key"],
    suggestForRemoval: false,
    reason: `Add a ${providerKey} API key to activate`,
  };
}

// ── Compute health for an entire list of models ───────────────────────────────

export interface ModelHealthOptions {
  selectedImageModel: string;
  selectedAnimationModel: string;
  subscribedModels: Set<string>;
  providerStatus: Record<string, { configured: boolean }> | null;
  usageSummary: Record<string, ProviderUsageSummary>;
  catalogue: CatalogueEntry[];
}

export function computeAllModelHealth(
  models: Array<{ value: string; providerKey: string; kind: "image" | "animation" }>,
  opts: ModelHealthOptions,
): Record<string, ModelHealth> {
  const { selectedImageModel, selectedAnimationModel, subscribedModels, providerStatus, usageSummary, catalogue } = opts;

  const out: Record<string, ModelHealth> = {};
  for (const m of models) {
    const catalogueEntry = catalogue.find((e) => e.id === m.value);
    const isSelected =
      m.kind === "image" ? m.value === selectedImageModel : m.value === selectedAnimationModel;

    out[m.value] = computeModelHealth({
      modelId: m.value,
      providerKey: m.providerKey,
      integrationStatus: catalogueEntry?.integrationStatus,
      isSelected,
      isSubscribed: subscribedModels.has(m.value),
      providerConfigured: providerStatus?.[m.providerKey]?.configured ?? false,
      usage: usageSummary[m.providerKey],
    });
  }
  return out;
}
