"use client";

import { useMemo, useState } from "react";
import { AI_CATALOGUE, type CatalogueEntry } from "@/app/lib/aiCatalogue";
import type { AIRole } from "@/app/lib/aiRoles";

const ROLE_ORDER: AIRole[] = ["prompt", "image", "animation", "layered", "rigging"];

const ROLE_META: Record<AIRole, { label: string; icon: string; gradient: string }> = {
  prompt:    { label: "Prompt Assistant",    icon: "📝", gradient: "from-violet-600/30  to-fuchsia-600/30" },
  image:     { label: "Image Generator",     icon: "🖼️", gradient: "from-sky-600/30     to-cyan-600/30" },
  animation: { label: "Animation Generator", icon: "🎬", gradient: "from-rose-600/30    to-pink-600/30" },
  layered:   { label: "Layered Assets",      icon: "🧱", gradient: "from-amber-600/30   to-orange-600/30" },
  rigging:   { label: "Rigging & Mocap",     icon: "🦴", gradient: "from-emerald-600/30 to-teal-600/30" },
};

// Pick top-2 popularity per role from the catalogue. If a role has zero
// real entries, synthesise a "Coming soon" placeholder card so the user
// sees we're tracking the space (per user direction: "you can mention
// coming soon" when no relevant model exists).
function pickTrending(): { role: AIRole; entries: TrendingCard[] }[] {
  return ROLE_ORDER.map((role) => {
    const entries = AI_CATALOGUE
      .filter((e) => e.role === role)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 2)
      .map<TrendingCard>((e) => ({ kind: "real", entry: e }));

    if (entries.length === 0) {
      entries.push({ kind: "placeholder", role });
    }
    return { role, entries };
  });
}

type TrendingCard =
  | { kind: "real"; entry: CatalogueEntry }
  | { kind: "placeholder"; role: AIRole };

export default function TrendingAIBanner({ onPick }: { onPick?: (entry: CatalogueEntry) => void }) {
  const [paused, setPaused] = useState(false);

  // Flatten into a single ordered list
  const cards = useMemo<TrendingCard[]>(() => pickTrending().flatMap((g) => g.entries), []);

  // Duplicated for seamless wrap (CSS animation translates exactly -50%)
  const looped = useMemo(() => [...cards, ...cards], [cards]);

  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">What&apos;s trending</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-amber-300 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent">
              Latest AI Models
            </span>
            <span className="text-white"> — across every role</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Auto-scrolling marquee · hover to pause · click any card to check compatibility + add to your platform
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_ORDER.map((r) => (
            <span key={r} className="text-[10px] uppercase tracking-wider rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-zinc-300">
              {ROLE_META[r].icon} {ROLE_META[r].label}
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.02] via-white/[0.03] to-white/[0.02]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* edge fade so cards don't pop in/out hard */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--bg-page)] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--bg-page)] to-transparent z-10" />

        <div
          className="flex gap-3 py-4 px-4"
          style={{
            width: "max-content",
            animation: "trending-scroll 38s linear infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {looped.map((card, i) => (
            card.kind === "real"
              ? <RealCard key={`${card.entry.id}-${i}`} entry={card.entry} onPick={onPick} />
              : <PlaceholderCard key={`placeholder-${card.role}-${i}`} role={card.role} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RealCard({ entry, onPick }: { entry: CatalogueEntry; onPick?: (entry: CatalogueEntry) => void }) {
  const meta = ROLE_META[entry.role];
  const compat = entry.apiAvailable && entry.publiclyAvailable;
  return (
    <button
      type="button"
      onClick={() => onPick?.(entry)}
      className={`group flex-shrink-0 w-[260px] rounded-2xl border bg-gradient-to-br ${meta.gradient} border-white/[0.10] p-4 text-left transition hover:border-white/[0.25] hover:scale-[1.015] active:scale-[0.99]`}
      title={`${entry.label} — ${entry.provider}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{meta.icon}</span>
        {entry.badge && <span className="text-[9px] uppercase tracking-wider rounded-full bg-black/30 border border-white/[0.10] px-1.5 py-0.5 text-zinc-200">{entry.badge}</span>}
      </div>
      <p className="text-sm font-bold text-white mt-2.5 leading-tight">{entry.label}</p>
      <p className="text-[10px] text-zinc-300/85 mt-0.5">{entry.provider}</p>
      <p className="text-[11px] text-zinc-300/70 mt-2 leading-snug line-clamp-2">{entry.description}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-emerald-300/80">{entry.pricing}</span>
        <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
          compat ? "bg-emerald-500/15 border border-emerald-400/30 text-emerald-200" : "bg-rose-500/15 border border-rose-400/30 text-rose-200"
        }`}>
          {compat ? "+ Add" : "Not addable"}
        </span>
      </div>
    </button>
  );
}

function PlaceholderCard({ role }: { role: AIRole }) {
  const meta = ROLE_META[role];
  return (
    <div
      className={`flex-shrink-0 w-[260px] rounded-2xl border border-dashed border-white/[0.10] bg-gradient-to-br ${meta.gradient} p-4 opacity-70`}
      title={`${meta.label} — Coming soon`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{meta.icon}</span>
        <span className="text-[9px] uppercase tracking-wider rounded-full bg-black/30 border border-white/[0.10] px-1.5 py-0.5 text-amber-200">
          Coming soon
        </span>
      </div>
      <p className="text-sm font-bold text-white mt-2.5 leading-tight">{meta.label}</p>
      <p className="text-[11px] text-zinc-300/70 mt-2 leading-snug">
        No leading public-API model in this category yet. We&apos;ll auto-list one the moment it ships.
      </p>
    </div>
  );
}
