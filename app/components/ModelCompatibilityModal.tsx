"use client";

import { useEffect } from "react";
import { isAddable, type CatalogueEntry } from "@/app/lib/aiCatalogue";

export default function ModelCompatibilityModal({
  entry, onClose, onConfirmAdd,
}: {
  entry: CatalogueEntry;
  onClose: () => void;
  onConfirmAdd: (entry: CatalogueEntry) => void;
}) {
  const check = isAddable(entry);

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
        className="relative z-10 w-full max-w-lg rounded-3xl border border-white/[0.10] bg-[var(--bg-elevated)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        style={{ animation: "var(--animate-slide-up)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Compatibility check</p>
            <h2 className="text-lg font-semibold tracking-tight mt-1">{entry.label}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{entry.provider} · {entry.role.charAt(0).toUpperCase() + entry.role.slice(1)} role</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {check.ok ? (
          <CompatibleBody entry={entry} onConfirm={() => { onConfirmAdd(entry); onClose(); }} onClose={onClose} />
        ) : (
          <IncompatibleBody entry={entry} reason={check.reason} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function CompatibleBody({ entry, onConfirm, onClose }: { entry: CatalogueEntry; onConfirm: () => void; onClose: () => void }) {
  const isPreview = entry.integrationStatus === "preview-only" || entry.integrationStatus === "coming-soon";
  return (
    <>
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-4">
        <p className="text-sm font-semibold text-emerald-200">✓ Compatible</p>
        <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
          This model has a public API and can be added to your platform. After adding, you&apos;ll see it in the picker
          alongside the built-in models. {isPreview && (
            <span className="block mt-1.5 text-amber-200/90">
              ⚠ Integration is <span className="font-semibold">{entry.integrationStatus === "coming-soon" ? "not yet wired" : "in preview"}</span> —
              calls today route through the default OpenAI model. The card will switch to native routing when Phase B ships.
            </span>
          )}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-[11px] mb-5">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <dt className="uppercase tracking-wider text-zinc-500 text-[9px]">Pricing</dt>
          <dd className="text-zinc-200 mt-0.5 font-mono leading-tight">{entry.pricing}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <dt className="uppercase tracking-wider text-zinc-500 text-[9px]">Integration</dt>
          <dd className="text-zinc-200 mt-0.5 capitalize leading-tight">{entry.integrationStatus.replace("-", " ")}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <dt className="uppercase tracking-wider text-zinc-500 text-[9px]">Verified</dt>
          <dd className="text-zinc-200 mt-0.5 font-mono leading-tight">{entry.verifiedAt}</dd>
        </div>
      </dl>

      <p className="text-[11px] text-zinc-400 mb-5 leading-relaxed">{entry.description}</p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-4 rounded-xl text-sm text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.22] transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-10 px-5 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
        >
          Add to platform →
        </button>
      </div>
    </>
  );
}

function IncompatibleBody({ entry, reason, onClose }: { entry: CatalogueEntry; reason: string; onClose: () => void }) {
  return (
    <>
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 mb-4">
        <p className="text-sm font-semibold text-rose-200">✗ Cannot add right now</p>
        <p className="text-xs text-rose-100/85 mt-2 leading-relaxed">{reason}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[11px] mb-5">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <dt className="uppercase tracking-wider text-zinc-500 text-[9px]">Public API</dt>
          <dd className={`mt-0.5 font-medium ${entry.apiAvailable ? "text-emerald-300" : "text-rose-300"}`}>{entry.apiAvailable ? "Yes" : "No"}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <dt className="uppercase tracking-wider text-zinc-500 text-[9px]">Publicly available</dt>
          <dd className={`mt-0.5 font-medium ${entry.publiclyAvailable ? "text-emerald-300" : "text-rose-300"}`}>{entry.publiclyAvailable ? "Yes" : "No"}</dd>
        </div>
      </dl>

      <p className="text-[11px] text-zinc-500 mb-5 leading-relaxed">
        Visit the provider&apos;s site to track when public API access opens. We&apos;ll re-enable adding here automatically when the catalogue entry&apos;s flags update.
      </p>

      <div className="flex justify-end gap-2">
        <a
          href={entry.homepageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-4 rounded-xl text-sm text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.22] transition inline-flex items-center"
        >
          Open provider site ↗
        </a>
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-4 rounded-xl text-sm font-medium text-white bg-rose-600/30 border border-rose-500/40 hover:bg-rose-600/45 transition"
        >
          Got it
        </button>
      </div>
    </>
  );
}
