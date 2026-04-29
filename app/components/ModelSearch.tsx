"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchCatalogue, type CatalogueEntry } from "@/app/lib/aiCatalogue";
import type { AIRole } from "@/app/lib/aiRoles";

const ROLE_LABEL: Record<AIRole, string> = {
  prompt:    "Prompt",
  image:     "Image",
  animation: "Animation",
  layered:   "Layered",
  rigging:   "Rigging",
};

export default function ModelSearch({
  addedIds, onPick,
}: {
  addedIds: string[];
  onPick: (entry: CatalogueEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => searchCatalogue(query, { addedIds, limit: 12 }),
    [query, addedIds],
  );

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function pick(entry: CatalogueEntry) {
    onPick(entry);
    setQuery("");
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(results.length - 1, i + 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter")     { e.preventDefault(); if (results[activeIdx]) pick(results[activeIdx]); }
    if (e.key === "Escape")    { setOpen(false); }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search AI models — e.g. claude, flux, video, gemini…"
          className="flex-1 h-9 rounded-lg bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3 text-xs"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-9 px-3 rounded-lg text-xs font-semibold border border-white/[0.08] hover:border-[var(--accent-text)] hover:bg-white/[0.05] transition"
          title="Browse all"
        >
          🔎
        </button>
      </div>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-2xl bg-[var(--bg-elevated)] border border-white/15 shadow-2xl max-h-[60vh] overflow-y-auto z-50"
          style={{ animation: "var(--animate-slide-up)" }}
        >
          <div className="px-3 py-2 border-b border-white/[0.07] sticky top-0 bg-[var(--bg-elevated)] z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {query.trim() ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Trending models"}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Verified billing URLs · click to add to your platform</p>
          </div>
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-500">
              <p>No models match &ldquo;{query}&rdquo;.</p>
              <p className="mt-1 text-[10px]">Try: claude · flux · video · free · cheap · gemini · pixel</p>
            </div>
          ) : (
            <ul>
              {results.map((e, idx) => <ResultRow key={e.id} entry={e} active={idx === activeIdx} onPick={() => pick(e)} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({ entry, active, onPick }: { entry: CatalogueEntry; active: boolean; onPick: () => void }) {
  const status = entry.integrationStatus;
  const compat = entry.apiAvailable && entry.publiclyAvailable;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        onMouseEnter={() => { /* keyboard active state managed in parent */ }}
        className={`w-full text-left px-3 py-2.5 border-l-2 hover:bg-white/[0.04] transition ${active ? "bg-white/[0.05] border-l-[var(--accent-text)]" : "border-l-transparent"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-zinc-100 truncate">{entry.label}</span>
              <RoleChip role={entry.role} />
              {entry.badge && <span className="text-[9px] uppercase rounded-full bg-indigo-600/20 border border-indigo-500/25 px-1.5 py-0.5 text-indigo-300">{entry.badge}</span>}
              {!compat && <span className="text-[9px] uppercase rounded-full bg-rose-600/20 border border-rose-500/30 px-1.5 py-0.5 text-rose-200">Not addable</span>}
              {compat && status === "preview-only" && <span className="text-[9px] uppercase rounded-full bg-amber-600/20 border border-amber-400/40 px-1.5 py-0.5 text-amber-200">Preview</span>}
              {compat && status === "coming-soon" && <span className="text-[9px] uppercase rounded-full bg-amber-600/20 border border-amber-400/40 px-1.5 py-0.5 text-amber-200">Coming soon</span>}
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">{entry.provider} · <span className="text-emerald-400/80">{entry.pricing}</span></p>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight line-clamp-2">{entry.description}</p>
          </div>
        </div>
      </button>
    </li>
  );
}

function RoleChip({ role }: { role: AIRole }) {
  const styles: Record<AIRole, string> = {
    prompt:    "bg-violet-600/20 border-violet-500/30 text-violet-200",
    image:     "bg-sky-600/20 border-sky-500/30 text-sky-200",
    animation: "bg-rose-600/20 border-rose-500/30 text-rose-200",
    layered:   "bg-amber-600/20 border-amber-500/30 text-amber-200",
    rigging:   "bg-emerald-600/20 border-emerald-500/30 text-emerald-200",
  };
  return (
    <span className={`text-[9px] uppercase rounded-full border px-1.5 py-0.5 ${styles[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}
