"use client";

import { useEffect } from "react";
import type { AIRole, RoleModelOption } from "@/app/lib/aiRoles";
import { MODELS_BY_ROLE, ROLE_META } from "@/app/lib/aiRoles";

export default function RoleSelectorModal({
  role,
  activeApiModel,
  onClose,
  onPick,
}: {
  role: AIRole;
  activeApiModel: string;
  onClose: () => void;
  onPick: (option: RoleModelOption) => void;
}) {
  const meta    = ROLE_META[role];
  const options = MODELS_BY_ROLE[role];

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
        aria-labelledby="role-swap-title"
        className="relative z-10 w-full max-w-xl rounded-3xl border border-white/[0.10] bg-[var(--bg-elevated)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        style={{ animation: "var(--animate-slide-up)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p id="role-swap-title" className="text-lg font-semibold tracking-tight">Switch {meta.label}</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">{meta.description}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-white text-xl leading-none px-1">×</button>
        </div>

        <ul className="space-y-2">
          {options.map((o) => {
            const active  = o.apiModel === activeApiModel;
            const preview = o.status === "preview";
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => { onPick(o); onClose(); }}
                  disabled={active}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition disabled:cursor-default ${
                    active
                      ? "bg-emerald-500/10 border-emerald-400/40"
                      : preview
                      ? "bg-white/[0.02] border-white/[0.06] hover:border-amber-400/40 hover:bg-amber-500/5"
                      : "bg-white/[0.03] border-white/[0.08] hover:border-[var(--accent-text)] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold tracking-tight">{o.label}</span>
                        <span className="text-[10px] text-zinc-500">{o.providerLabel}</span>
                        {o.badge && <span className="text-[9px] uppercase tracking-wider rounded-full bg-indigo-600/20 border border-indigo-500/25 px-1.5 py-0.5 text-indigo-300">{o.badge}</span>}
                        {preview && <span className="text-[9px] uppercase tracking-wider rounded-full bg-amber-600/20 border border-amber-400/40 px-1.5 py-0.5 text-amber-200">Preview</span>}
                        {active && <span className="text-[9px] uppercase tracking-wider rounded-full bg-emerald-600/30 border border-emerald-400/50 px-1.5 py-0.5 text-emerald-100 ml-auto">✓ Active</span>}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{o.note ?? "No description."}</p>
                      <p className="text-[10px] text-emerald-300/70 mt-1 font-mono">{o.pricing}</p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 pt-4 border-t border-white/[0.06] text-[11px] text-zinc-500 leading-relaxed">
          <p>
            <span className="text-zinc-300 font-medium">Preview</span> entries are listed for visibility — they currently route through the default OpenAI model. Phase B will add native Anthropic + Gemini integrations (see context.md).
          </p>
        </div>
      </div>
    </div>
  );
}
