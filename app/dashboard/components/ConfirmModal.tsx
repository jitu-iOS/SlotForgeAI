"use client";

import { useEffect, useState } from "react";

export default function ConfirmModal({
  title,
  body,
  danger,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  danger?: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[var(--bg-elevated)] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]"
        style={{ animation: "var(--animate-slide-up)" }}
      >
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{body}</p>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
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
              try { await onConfirm(); } finally { setBusy(false); }
            }}
            className={`h-10 px-4 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-transform active:scale-[0.99] ${
              danger
                ? "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500"
                : ""
            }`}
            style={danger ? undefined : { background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
