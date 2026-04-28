"use client";

import type { StyleDNA } from "@/app/types";

export default function StyleDNACard({ dna }: { dna: StyleDNA }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-sm">
          🧬
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Style DNA</h2>
          <p className="text-xs text-zinc-500">Applied uniformly across all assets</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge label="Theme"  value={dna.theme}    color="indigo" />
        <Badge label="Style"  value={dna.artStyle}  color="violet" />
        <Badge label="Mood"   value={dna.mood}      color="sky" />
      </div>

      {/* Color palette — text chips */}
      {dna.colorPalette.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Color Palette</p>
          <div className="flex flex-wrap gap-2">
            {dna.colorPalette.map((color, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5"
              >
                {/* Swatch — works for single-word CSS color names; falls back gracefully */}
                <span
                  className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20 flex-shrink-0"
                  style={{ backgroundColor: color.split(/\s+/)[0].toLowerCase() }}
                />
                <span className="text-xs text-zinc-300 capitalize">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hints */}
      <div className="grid sm:grid-cols-2 gap-3">
        <HintBlock icon="💡" label="Lighting"  text={dna.lightingHints} />
        <HintBlock icon="🪵" label="Textures"  text={dna.textureHints} />
      </div>
    </div>
  );
}

function Badge({ label, value, color }: { label: string; value: string; color: "indigo" | "violet" | "sky" }) {
  const cls = {
    indigo: "bg-indigo-900/40 border-indigo-700/40 text-indigo-300",
    violet: "bg-violet-900/40 border-violet-700/40 text-violet-300",
    sky:    "bg-sky-900/40    border-sky-700/40    text-sky-300",
  }[color];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      <span className="text-white/40">{label}:</span>
      {value}
    </span>
  );
}

function HintBlock({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
      <p className="text-xs text-zinc-500 mb-1.5">{icon} {label}</p>
      <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>
    </div>
  );
}
