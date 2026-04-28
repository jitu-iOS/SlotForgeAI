"use client";

import { useState, useRef, useEffect } from "react";
import type { Asset, AssetType } from "@/app/types";

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface AssetGridProps {
  assets: Asset[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], value: boolean) => void;
  onRegenerate: (id: string) => void;
  onEditAsset: (id: string, instruction: string) => void;
  regeneratingIds?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type FilterTab = "all" | AssetType;

const TYPE_ORDER: AssetType[] = ["symbol_high", "symbol_low", "background", "ui", "fx"];

const TYPE_META: Record<AssetType, { label: string; icon: string; cols: string }> = {
  symbol_high: { label: "High Symbols", icon: "💎", cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" },
  symbol_low:  { label: "Low Symbols",  icon: "♠",  cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" },
  background:  { label: "Background",   icon: "🌄", cols: "grid-cols-1 sm:grid-cols-2" },
  ui:          { label: "UI Elements",  icon: "🖱",  cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" },
  fx:          { label: "FX Sprites",   icon: "✨", cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" },
};

const QUICK_ACTIONS = [
  { label: "Remove Background",   text: "Remove the background completely and make it fully transparent" },
  { label: "Make More Glowing",   text: "Add a strong glowing light effect, increase luminosity and add radiant light rays" },
  { label: "Remove Text",         text: "Remove all text, typography and writing from the image" },
  { label: "Add Transparency",    text: "Make the background fully transparent, keep only the main subject" },
  { label: "Increase Sharpness",  text: "Increase sharpness, add crisp fine details and clear edges" },
  { label: "Darker & Richer",     text: "Increase contrast, make colours deeper, darker and more saturated" },
  { label: "Add Drop Shadow",     text: "Add a dramatic drop shadow beneath the main subject" },
  { label: "Gold Color Scheme",   text: "Transform the colour scheme to rich gold and shining metallic tones" },
  { label: "Larger Subject",      text: "Make the main subject larger and more prominent, reduce empty space" },
  { label: "More 3D Depth",       text: "Enhance the 3D depth effect, add more dimension, highlights and shading" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AssetGrid({
  assets, onToggleSelect, onSelectAll, onRegenerate, onEditAsset,
  regeneratingIds = [],
}: AssetGridProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [editTarget, setEditTarget] = useState<Asset | null>(null);

  const presentTypes = TYPE_ORDER.filter((t) => assets.some((a) => a.type === t));
  const visible = filter === "all" ? assets : assets.filter((a) => a.type === filter);
  const grouped = presentTypes
    .filter((t) => filter === "all" || t === filter)
    .map((type) => ({ type, items: visible.filter((a) => a.type === type) }))
    .filter((g) => g.items.length > 0);

  const selectedCount = assets.filter((a) => a.selected).length;

  const handleApplyEdit = (instruction: string) => {
    if (!editTarget) return;
    onEditAsset(editTarget.id, instruction);
    setEditTarget(null);
  };

  return (
    <>
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white">Asset Grid</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{assets.length} assets · {selectedCount} selected</p>
          </div>
          {selectedCount > 0 && (
            <button onClick={() => onSelectAll(assets.map((a) => a.id), false)} className="text-xs text-zinc-400 hover:text-white transition-colors">
              Deselect all
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-white/10 overflow-x-auto">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>All ({assets.length})</FilterBtn>
          {presentTypes.map((type) => {
            const count = assets.filter((a) => a.type === type).length;
            const { label, icon } = TYPE_META[type];
            return (
              <FilterBtn key={type} active={filter === type} onClick={() => setFilter(type)}>
                {icon} {label} ({count})
              </FilterBtn>
            );
          })}
        </div>

        {/* Sections */}
        <div className="px-6 py-6 flex flex-col gap-10">
          {grouped.map(({ type, items }) => {
            const { label, icon, cols } = TYPE_META[type];
            const allSelected = items.every((a) => a.selected);
            const ids = items.map((a) => a.id);
            return (
              <section key={type}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <h3 className="text-sm font-semibold text-zinc-300">{label}</h3>
                    <span className="text-xs text-zinc-600 bg-white/5 rounded-full px-2 py-0.5">{items.length}</span>
                  </div>
                  <button onClick={() => onSelectAll(ids, !allSelected)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className={`grid gap-3 ${cols}`}>
                  {items.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      isRegenerating={regeneratingIds.includes(asset.id)}
                      onToggleSelect={onToggleSelect}
                      onRegenerate={onRegenerate}
                      onOpenEdit={(a) => setEditTarget(a)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Edit modal — rendered outside the grid card so it overlays everything */}
      {editTarget && (
        <EditModal
          asset={editTarget}
          isRegenerating={regeneratingIds.includes(editTarget.id)}
          onApply={handleApplyEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Asset card
// ---------------------------------------------------------------------------

function AssetCard({
  asset, isRegenerating, onToggleSelect, onRegenerate, onOpenEdit,
}: {
  asset: Asset;
  isRegenerating: boolean;
  onToggleSelect: (id: string) => void;
  onRegenerate: (id: string) => void;
  onOpenEdit: (asset: Asset) => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(asset.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 flex flex-col ${
        isRegenerating
          ? "cursor-wait border border-white/10 opacity-80"
          : asset.selected
          ? "cursor-pointer ring-2 ring-indigo-500 border border-indigo-500/60"
          : "cursor-pointer border border-white/10 hover:border-white/25"
      }`}
    >
      {/* Image */}
      <div
        className="aspect-square bg-zinc-900 relative overflow-hidden"
        onClick={() => !isRegenerating && onToggleSelect(asset.id)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.imageUrl || undefined}
          alt={asset.label}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {asset.selected && !isRegenerating && (
          <div className="absolute inset-0 bg-indigo-600/15 pointer-events-none" />
        )}

        {/* FX animation overlay — pulsing violet glow to signal this is an animated/FX asset */}
        {asset.type === "fx" && !isRegenerating && asset.imageUrl && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse rounded-xl"
            style={{
              boxShadow: "inset 0 0 18px rgba(139,92,246,0.45), 0 0 12px rgba(99,102,241,0.3)",
            }}
          />
        )}

        {isRegenerating && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <svg className="animate-spin w-7 h-7 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-[10px] text-zinc-400">Processing…</span>
          </div>
        )}

        {showPrompt && !isRegenerating && (
          <div className="absolute inset-0 bg-black/85 p-3 flex flex-col justify-end pointer-events-none">
            <p className="text-[10px] text-zinc-300 leading-relaxed line-clamp-6">{asset.prompt}</p>
          </div>
        )}

        {/* Top-right tiny action buttons */}
        <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopy}
            disabled={isRegenerating}
            className="w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-black/80 transition-all disabled:opacity-40"
            title={copied ? "Copied!" : "Copy prompt"}
          >
            {copied ? <CopiedIcon /> : <CopyIcon />}
          </button>
          <button
            onMouseEnter={() => !isRegenerating && setShowPrompt(true)}
            onMouseLeave={() => setShowPrompt(false)}
            disabled={isRegenerating}
            className="w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-[10px] text-zinc-400 hover:text-white hover:bg-black/80 transition-all disabled:opacity-40"
            title="View prompt"
          >?</button>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(asset.id); }}
            disabled={isRegenerating}
            className="w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-indigo-600/70 transition-all disabled:opacity-40 disabled:cursor-wait"
            title="Regenerate"
          >
            <RegenIcon />
          </button>
        </div>

        {asset.selected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center pointer-events-none">
            <CheckIcon />
          </div>
        )}
      </div>

      {/* Footer: label + AI Edit button */}
      <div className="flex items-center justify-between px-2.5 py-2 bg-[#111118] border-t border-white/[0.06] gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-300 truncate">{asset.label}</p>
          {asset.usedFallback && (
            <p className="text-[10px] text-emerald-300/80 truncate" title={`Generated via ${asset.usedFallback} (free fallback)`}>
              via {asset.usedFallback} · free
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); if (!isRegenerating) onOpenEdit(asset); }}
          disabled={isRegenerating}
          className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 px-2 py-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Edit with AI"
        >
          <SparkleIcon />
          AI Edit
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditModal({
  asset, isRegenerating, onApply, onClose,
}: {
  asset: Asset;
  isRegenerating: boolean;
  onApply: (instruction: string) => void;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const appendQuickAction = (text: string) => {
    setInstruction((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}. ${text}` : text;
    });
    textareaRef.current?.focus();
  };

  const canSubmit = instruction.trim().length > 0 && !isRegenerating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0f0e1e] border border-white/15 shadow-2xl shadow-black/60 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
              <SparkleIcon />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AI Edit</p>
              <p className="text-xs text-zinc-500">{asset.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-5 p-6">
          {/* Left: asset preview */}
          <div className="flex-shrink-0">
            <div className="w-36 h-36 rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.imageUrl || undefined}
                alt={asset.label}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-2 max-w-[144px] truncate">{asset.type}</p>
          </div>

          {/* Right: edit controls */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Quick actions */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-2">Quick Actions — click to add</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    type="button"
                    onClick={() => appendQuickAction(qa.text)}
                    className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-indigo-300 transition-all"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-2">Your Command</p>
              <textarea
                ref={textareaRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Remove the background and make it transparent, add a golden glow around the subject, increase sharpness…"
                rows={4}
                className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-zinc-600 mt-1.5">
                AI will apply your instruction to the current image using the project Style DNA.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onApply(instruction)}
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-900/30"
          >
            <SparkleIcon />
            Apply Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
        active ? "bg-indigo-600 text-white" : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function SparkleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
function CopiedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function RegenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
