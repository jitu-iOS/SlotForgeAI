"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { computeAllModelHealth, type ModelHealth } from "@/app/lib/modelHealth";
import type { ProviderUsageSummary } from "@/app/lib/usage/aggregate";
import type { CatalogueEntry } from "@/app/lib/aiCatalogue";

type ProviderStatus = Record<string, { configured: boolean }>;

interface ModelEntry {
  value: string;
  providerKey: string;
  kind: "image" | "animation";
}

interface UseModelHealthOptions {
  models: ModelEntry[];
  selectedImageModel: string;
  selectedAnimationModel: string;
  subscribedModels: Set<string>;
  providerStatus: ProviderStatus | null;
  catalogue: CatalogueEntry[];
  enabled?: boolean;
  onTransition?: (modelId: string, from: ModelHealth, to: ModelHealth) => void;
}

interface UseModelHealthResult {
  modelHealthMap: Record<string, ModelHealth>;
  usageSummary: Record<string, ProviderUsageSummary>;
  lastCheckedAt: number | null;
}

const POLL_INTERVAL = 30_000; // 30 seconds

export function useModelHealth({
  models,
  selectedImageModel,
  selectedAnimationModel,
  subscribedModels,
  providerStatus,
  catalogue,
  enabled = true,
  onTransition,
}: UseModelHealthOptions): UseModelHealthResult {
  const [usageSummary, setUsageSummary] = useState<Record<string, ProviderUsageSummary>>({});
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [modelHealthMap, setModelHealthMap] = useState<Record<string, ModelHealth>>({});

  // Keep a stable ref to the previous health map so we can diff on each poll
  const prevHealthRef = useRef<Record<string, ModelHealth>>({});
  const onTransitionRef = useRef(onTransition);
  onTransitionRef.current = onTransition;

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const data = await res.json() as { providers: Record<string, ProviderUsageSummary> };
      setUsageSummary(data.providers ?? {});
      setLastCheckedAt(Date.now());
    } catch {
      // Non-fatal — keep using last known summary
    }
  }, []);

  // Recompute health whenever inputs change (models, status, usage, selections)
  useEffect(() => {
    const next = computeAllModelHealth(models, {
      selectedImageModel,
      selectedAnimationModel,
      subscribedModels,
      providerStatus,
      usageSummary,
      catalogue,
    });

    // Diff against previous — fire transition callbacks for notable changes
    const prev = prevHealthRef.current;
    for (const [id, health] of Object.entries(next)) {
      const old = prev[id];
      if (old && old.status !== health.status) {
        onTransitionRef.current?.(id, old, health);
      }
    }
    prevHealthRef.current = next;
    setModelHealthMap(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, selectedImageModel, selectedAnimationModel, subscribedModels, providerStatus, usageSummary, catalogue]);

  // Poll /api/usage every 30s, paused when tab is hidden
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    const tick = async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try { await fetchUsage(); } finally { inFlight = false; }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, POLL_INTERVAL);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { void fetchUsage(); start(); }
      else stop();
    };

    // Initial fetch immediately
    void fetchUsage();
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, fetchUsage]);

  return { modelHealthMap, usageSummary, lastCheckedAt };
}
