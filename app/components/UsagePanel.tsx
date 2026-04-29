"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProviderUsageSummary } from "@/app/lib/usage/aggregate";

interface UsagePanelProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_LABEL: Record<string, string> = {
  openai:     "OpenAI",
  replicate:  "Replicate",
  runway:     "Runway",
  imagineart: "Imagine Art",
  free:       "Pollinations (Free)",
};

const LIGHT_COLORS: Record<string, string> = {
  green: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]",
  amber: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]",
  red:   "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse",
  gray:  "bg-zinc-600",
};

function fmt(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000)   return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function ProviderRow({ provider, s }: { provider: string; s: ProviderUsageSummary & { dashboardUrl?: string } }) {
  const label = PROVIDER_LABEL[provider] ?? provider;
  const lightCls = LIGHT_COLORS[s.light] ?? LIGHT_COLORS.gray;

  return (
    <div className="rounded-xl bg-white/[0.035] border border-white/[0.08] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lightCls}`} />
          <span className="text-sm font-semibold text-white">{label}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 border ${
            s.light === "green" ? "bg-emerald-900/30 border-emerald-500/40 text-emerald-300"
            : s.light === "amber" ? "bg-amber-900/30 border-amber-500/40 text-amber-300"
            : s.light === "red" ? "bg-rose-900/30 border-rose-500/40 text-rose-300"
            : "bg-zinc-800 border-zinc-700 text-zinc-500"
          }`}>
            {s.light === "green" ? "Healthy" : s.light === "amber" ? "Degraded" : s.light === "red" ? "Down" : "No data"}
          </span>
        </div>
        {s.dashboardUrl && (
          <a
            href={s.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Dashboard ↗
          </a>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <StatBox label="Success (1h)" value={s.successesIn1h} accent="emerald" />
        <StatBox label="Failures (1h)" value={s.failuresIn1h} accent={s.failuresIn1h > 0 ? "rose" : "zinc"} />
        <StatBox label="Success (24h)" value={s.successes24h} accent="emerald" />
        <StatBox label="Failures (24h)" value={s.failures24h} accent={s.failures24h > 0 ? "rose" : "zinc"} />
      </div>

      {/* Last events */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between text-zinc-400">
          <span>Last success</span>
          <span className="text-emerald-400">{fmt(s.lastSuccessAt)}</span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>Last failure</span>
          <span className={s.lastFailureAt ? "text-rose-400" : "text-zinc-600"}>{fmt(s.lastFailureAt)}</span>
        </div>
        {s.lastFailureReason && (
          <p className="text-[10px] text-rose-300/70 mt-1 leading-relaxed line-clamp-2">{s.lastFailureReason}</p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  const textCls =
    accent === "emerald" ? "text-emerald-300"
    : accent === "rose" ? "text-rose-300"
    : "text-zinc-500";

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
      <p className="text-zinc-600 text-[10px] mb-0.5">{label}</p>
      <p className={`text-base font-bold leading-none ${textCls}`}>{value}</p>
    </div>
  );
}

export default function UsagePanel({ open, onClose }: UsagePanelProps) {
  const [data, setData] = useState<{ providers: Record<string, ProviderUsageSummary & { dashboardUrl?: string }>; generatedAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load usage data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchData();
  }, [open, fetchData]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Side-sheet */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-[95vw] flex flex-col bg-[var(--bg-sidebar)] border-l border-white/[0.08] shadow-2xl overflow-hidden" style={{ animation: "side-sheet-in 0.22s ease-out both" }}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base font-bold text-white">AI Usage Monitor</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {data ? `Updated ${fmt(new Date(data.generatedAt).getTime())}` : "Per-provider call outcomes"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData()}
              disabled={loading}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1.5 transition disabled:opacity-40"
            >
              {loading ? (
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : "↻"} Refresh
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          {loading && !data && (
            <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              Loading…
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-900/20 border border-rose-700/40 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          {data && Object.keys(data.providers).length === 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-5 py-8 text-center text-zinc-500 text-sm">
              No usage data yet — make a generation to start recording events.
            </div>
          )}

          {data && Object.entries(data.providers).map(([provider, s]) => (
            <ProviderRow key={provider} provider={provider} s={s} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-white/[0.06] text-[10px] text-zinc-600">
          Events tracked per-provider. Capped at 5,000 total. Admin-only view.
        </div>
      </div>
    </>
  );
}
