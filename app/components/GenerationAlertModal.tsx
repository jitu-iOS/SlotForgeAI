"use client";

import { useEffect } from "react";

export type GenerationAlertCode =
  | "quota_exhausted"
  | "auth_failed"
  | "rate_limited"
  | "network_error"
  | "stalled"
  | "other_failure";

interface Props {
  open: boolean;
  modelLabel: string;
  providerLabel: string;
  code: GenerationAlertCode;
  reason: string;
  completed: number;
  failed: number;
  total: number;
  /** Free-tier fallback model that's available; if null, the option is hidden. */
  failoverLabel?: string;
  billingUrl?: string;
  onClose: () => void;
  onRetrySame: () => void;
  onRetryFailover?: () => void;
}

const TITLE_BY_CODE: Record<GenerationAlertCode, string> = {
  quota_exhausted: "Out of credits",
  auth_failed:     "API key rejected",
  rate_limited:    "Rate limit hit",
  network_error:   "Network problem",
  stalled:         "Generation stalled",
  other_failure:   "Generation failed",
};

const ICON_BY_CODE: Record<GenerationAlertCode, string> = {
  quota_exhausted: "💳",
  auth_failed:     "🔑",
  rate_limited:    "⏱️",
  network_error:   "📡",
  stalled:         "⏳",
  other_failure:   "⚠️",
};

const ADVICE_BY_CODE: Record<GenerationAlertCode, string> = {
  quota_exhausted: "Top up the provider's billing page, then retry. Or switch to a free fallback now to keep going.",
  auth_failed:     "The API key was rejected (rotated, revoked, or wrong project). Open the API Keys panel to paste a new one.",
  rate_limited:    "Too many requests in a short window. Wait a minute and retry, or switch to a different provider.",
  network_error:   "We couldn't reach the provider. Check your connection and retry.",
  stalled:         "No progress for over a minute. The provider may be queuing requests or hung — retry or switch model.",
  other_failure:   "The provider returned an error. Retry, or switch to a different model.",
};

export default function GenerationAlertModal({
  open, modelLabel, providerLabel, code, reason, completed, failed, total,
  failoverLabel, billingUrl, onClose, onRetrySame, onRetryFailover,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const remaining = Math.max(0, total - completed - failed);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1f0a0e 0%, #2a0a14 100%)",
          border: "2px solid rgba(244,63,94,0.45)",
          boxShadow: "0 30px 80px rgba(244,63,94,0.25), 0 0 0 1px rgba(244,63,94,0.3) inset",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Dismiss alert"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-zinc-400 hover:text-white transition flex items-center justify-center text-base"
        >×</button>

        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex items-start gap-4 border-b border-white/[0.08]">
          <div className="text-4xl flex-shrink-0">{ICON_BY_CODE[code]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-rose-400/80">Generation interrupted</p>
            <h2 className="text-xl font-extrabold text-white mt-1">{TITLE_BY_CODE[code]}</h2>
            <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed">
              <span className="font-semibold text-rose-300">{modelLabel}</span>
              <span className="text-zinc-500"> · {providerLabel}</span>
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="px-7 py-4 grid grid-cols-3 gap-2 border-b border-white/[0.06]">
          <Stat label="Completed" value={completed} accent="emerald" />
          <Stat label="Failed"    value={failed}    accent={failed > 0 ? "rose" : "zinc"} />
          <Stat label="Remaining" value={remaining} accent="amber" />
        </div>

        {/* Reason + advice */}
        <div className="px-7 py-5 space-y-3">
          <div className="rounded-xl bg-black/40 border border-white/[0.06] px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-1.5">Provider said</p>
            <p className="text-sm text-zinc-200 font-mono leading-relaxed break-words">{reason || "(no detail)"}</p>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{ADVICE_BY_CODE[code]}</p>
        </div>

        {/* Actions */}
        <div className="px-7 pb-7 flex flex-col gap-2">
          {onRetryFailover && failoverLabel && (
            <button
              onClick={onRetryFailover}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition"
            >
              ⚡ Retry with {failoverLabel}
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onRetrySame}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/[0.06] px-5 py-3 text-sm font-bold text-zinc-200 transition"
            >
              ↻ Retry with {modelLabel}
            </button>
            {billingUrl && (
              <a
                href={billingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300 transition whitespace-nowrap"
              >
                Top up ↗
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2 transition"
          >
            Close — keep partial assets
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "emerald" | "rose" | "zinc" | "amber" }) {
  const cls =
    accent === "emerald" ? "text-emerald-400" :
    accent === "rose"    ? "text-rose-400"    :
    accent === "amber"   ? "text-amber-400"   :
                           "text-zinc-500";
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
      <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-600">{label}</p>
      <p className={`text-2xl font-black tabular-nums leading-none mt-0.5 ${cls}`}>{value}</p>
    </div>
  );
}
