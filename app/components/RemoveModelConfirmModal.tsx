"use client";

import { useEffect, useState } from "react";

export default function RemoveModelConfirmModal({
  modelLabel,
  providerKey,
  providerLabel,
  isBuiltIn,
  affectedSiblings,
  canCleanupKey,
  onClose,
  onConfirm,
}: {
  modelLabel: string;
  providerKey: string;
  providerLabel: string;
  isBuiltIn: boolean;
  // Other models in the picker that share this providerKey — surfaced as a warning.
  affectedSiblings: string[];
  // True only when the providerKey is one we manage in the vault (openai/replicate/runway/imagineart).
  // For preview-only catalogue providers (anthropic, google, etc.) the checkbox is hidden.
  canCleanupKey: boolean;
  onClose: () => void;
  onConfirm: (alsoRemoveKey: boolean) => void | Promise<void>;
}) {
  const [alsoKey, setAlsoKey] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl border border-rose-500/30 bg-[var(--bg-elevated)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        style={{ animation: "var(--animate-slide-up)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-rose-300/80">Remove from picker</p>
            <h2 className="text-lg font-semibold tracking-tight mt-1">{modelLabel}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{providerLabel}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          {isBuiltIn
            ? "Hide this built-in model from your picker. You can un-hide it later via the \"Show hidden\" toggle."
            : "Remove this model from your platform. You can re-add it via the search bar anytime."}
        </p>

        {affectedSiblings.length > 0 && canCleanupKey && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-[11px] text-amber-100/85 leading-relaxed">
            ⚠ The <span className="font-semibold">{providerLabel}</span> API key is also used by {affectedSiblings.length} other model{affectedSiblings.length === 1 ? "" : "s"}: {affectedSiblings.join(", ")}.
            {" "}If you remove the key too, those models will need it re-added.
          </div>
        )}

        {canCleanupKey && (
          <label className="mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] cursor-pointer hover:border-white/[0.18] transition">
            <input
              type="checkbox"
              checked={alsoKey}
              onChange={(e) => setAlsoKey(e.target.checked)}
              className="w-4 h-4 accent-rose-500 cursor-pointer"
            />
            <span className="text-xs text-zinc-200">
              Also remove the <span className="font-semibold">{providerLabel}</span> API key from the vault
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 px-4 rounded-xl text-sm text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.22] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(alsoKey); } finally { setBusy(false); }
            }}
            className="h-10 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
          >
            {busy ? "Removing…" : isBuiltIn ? "Hide" : "Remove"}
          </button>
        </div>
        <span className="sr-only">{providerKey}</span>
      </div>
    </div>
  );
}
