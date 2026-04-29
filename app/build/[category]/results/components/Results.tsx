"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import type { BuildCategoryDef } from "@/app/types/build";

type Theme = "midnight-indigo" | "slate-sapphire" | "obsidian-gold" | "forest-emerald" | "dusk-rose";
const THEME_STORAGE_KEY = "slotforge.theme";

interface BuildAsset {
  id: string;
  specId: string;
  label: string;
  group: string;
  width: number;
  height: number;
  imageUrl: string;
  prompt: string;
  usedFallback?: string;
}

interface Handoff {
  category: string;
  label: string;
  assets: BuildAsset[];
  generatedAt: string;
}

export default function Results({ categoryDef }: { categoryDef: BuildCategoryDef }) {
  const [data, setData] = useState<Handoff | null>(null);
  const [preview, setPreview] = useState<BuildAsset | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "midnight-indigo";
    document.documentElement.dataset.theme = t;
    try {
      const raw = sessionStorage.getItem("slotforge.lastBuild");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Handoff;
      if (parsed.category !== categoryDef.slug) return;
      setData(parsed);
    } catch { /* ignore */ }
  }, [categoryDef.slug]);

  const grouped = useMemo(() => {
    if (!data) return [] as { group: string; items: BuildAsset[] }[];
    const map = new Map<string, BuildAsset[]>();
    for (const a of data.assets) {
      const arr = map.get(a.group) ?? [];
      arr.push(a);
      map.set(a.group, arr);
    }
    // Preserve the asset-spec order
    const order = [...new Set(categoryDef.assets.map((s) => s.group))];
    return order.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
  }, [data, categoryDef.assets]);

  async function downloadZip() {
    if (!data || downloadingZip) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (const a of data.assets) {
        if (!a.imageUrl) continue;
        const filename = `${a.specId}.png`;
        if (a.imageUrl.startsWith("data:")) {
          const b64 = a.imageUrl.split(",")[1] ?? "";
          zip.file(filename, b64, { base64: true });
        } else {
          const res = await fetch(a.imageUrl);
          const blob = await res.blob();
          zip.file(filename, blob);
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${categoryDef.slug}-pack.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingZip(false);
    }
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)] text-zinc-100 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-2xl mb-2">{categoryDef.icon}</p>
          <h1 className="text-xl font-semibold tracking-tight">No build to show</h1>
          <p className="text-sm text-zinc-400 mt-2">Run the wizard to generate an asset pack first.</p>
          <a
            href={`/build/${categoryDef.slug}`}
            className="inline-flex items-center gap-2 mt-6 h-11 px-5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
          >
            Open the {categoryDef.label} wizard →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-page)] text-zinc-100">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg-page)]/70 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              {categoryDef.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">2D Assets · Results</p>
              <p className="text-sm font-semibold tracking-tight truncate">{categoryDef.label} pack</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/build/${categoryDef.slug}`}
              className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18] transition-colors"
            >
              ↻ New build
            </a>
            <button
              type="button"
              onClick={downloadZip}
              disabled={downloadingZip}
              className="text-xs font-semibold text-white h-9 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              {downloadingZip ? "Zipping…" : "⬇ Download ZIP"}
            </button>
            <a
              href="/project"
              className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18] transition-colors hidden sm:inline-flex"
            >
              Studio →
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8" style={{ animation: "var(--animate-slide-up)" }}>
          <h1 className="text-3xl font-semibold tracking-tight">{categoryDef.label} asset pack</h1>
          <p className="text-sm text-zinc-400 mt-2">{data.assets.length} assets generated · {new Date(data.generatedAt).toLocaleString()}</p>
          {data.assets.some((a) => a.usedFallback) && (
            <p className="text-[12px] text-emerald-300/80 mt-2">
              Some assets were rendered via the free Pollinations fallback because the primary provider was unavailable.
            </p>
          )}
        </div>

        {grouped.map((g) => (
          <section key={g.group} className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400 mb-4">{g.group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map((a) => (
                <BuildAssetCard key={a.id} asset={a} onPreview={() => setPreview(a)} />
              ))}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center text-sm text-zinc-400">
            No assets returned. Check the OpenAI API key in the API Keys panel and try again.
          </div>
        )}
      </div>

      {preview && <FullscreenPreview asset={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}

function BuildAssetCard({ asset, onPreview }: { asset: BuildAsset; onPreview: () => void }) {
  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = asset.imageUrl;
    a.download = `${asset.specId}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/[0.22] transition-colors flex flex-col">
      <div
        className="aspect-square bg-zinc-900 relative overflow-hidden cursor-zoom-in"
        onClick={onPreview}
        title="Click to preview · double-click also opens"
        onDoubleClick={onPreview}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.imageUrl || undefined} alt={asset.label} className="w-full h-full object-contain" draggable={false} />
        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-zinc-300">
          {asset.width}×{asset.height}
        </span>
      </div>
      <div className="px-3 py-2.5 border-t border-white/[0.06]">
        <p className="text-xs font-semibold text-zinc-200 truncate">{asset.label}</p>
        {asset.usedFallback && (
          <p className="text-[10px] text-emerald-300/80 truncate">via {asset.usedFallback} · free</p>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 hover:text-indigo-100 transition-colors"
        >
          ⬇ Download PNG
        </button>
      </div>
    </div>
  );
}

function FullscreenPreview({ asset, onClose }: { asset: BuildAsset; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  function handleDownload() {
    const a = document.createElement("a");
    a.href = asset.imageUrl;
    a.download = `${asset.specId}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 max-w-[92vw] max-h-[92vh] flex flex-col items-center gap-4">
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] bg-black/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.imageUrl} alt={asset.label} className="block max-w-[88vw] max-h-[78vh] object-contain" draggable={false} />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center bg-black/55 backdrop-blur-md border border-white/[0.08] rounded-2xl px-3 py-2">
          <div className="text-left pr-3 border-r border-white/10 mr-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 leading-tight">{asset.group} · {asset.width}×{asset.height}</p>
            <p className="text-sm font-medium text-zinc-100 leading-tight">{asset.label}</p>
          </div>
          <button onClick={handleDownload} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 px-4 py-2 text-sm font-semibold text-white shadow-md">
            ⬇ Download
          </button>
          <button onClick={onClose} className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white transition">
            Close · Esc
          </button>
        </div>
      </div>
      <button onClick={onClose} aria-label="Close preview" className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.12] flex items-center justify-center text-zinc-200 hover:text-white text-xl">×</button>
    </div>
  );
}
