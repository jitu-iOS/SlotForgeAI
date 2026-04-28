"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ProjectForm, AssetType, SlotType } from "@/app/types";
import { getSlotConfig } from "@/app/lib/slotTypeConfig";

// ---------------------------------------------------------------------------
// Field metadata — one entry per PDF field
// ---------------------------------------------------------------------------

type TextFieldKey = keyof Omit<ProjectForm, "assetTypes">;

const FIELD_META: Record<TextFieldKey, { label: string; info: string; example: string; tip: string }> = {
  gameName:      { label: "Game Title",        info: "Name of the slot game",                    example: "Pharaoh's Eternal Gold",
    tip: "The working title used across all assets and the slot machine UI. Choose something evocative that reflects the theme — it appears on the cabinet header and in exported filenames." },
  theme:         { label: "Theme",             info: "Core theme of the slot",                   example: "Egyptian luxury mystical",
    tip: "The central world or concept the game inhabits. This drives every AI prompt — be specific (e.g. 'Egyptian luxury mystical') rather than generic ('old Egypt') for richer, more cohesive results." },
  targetAudience:{ label: "Target Audience",   info: "Player type",                              example: "High spender, US audience",
    tip: "Defines the visual tone and complexity. High-spenders expect premium, detailed art; casual players prefer bold and colourful. Include market region if relevant — it influences cultural motifs." },
  emotionalTone: { label: "Emotional Tone",    info: "Mood of visuals",                          example: "Luxurious, glowing, mysterious",
    tip: "The feeling a player should get at first glance. This steers lighting, colour saturation, and symbol personality. Use 2–3 adjectives for the best result (e.g. 'dark, epic, cinematic')." },
  artStyle:      { label: "Art Style",         info: "Overall visual style",                     example: "Semi-realistic 3D glossy",
    tip: "Determines how every asset is rendered. 'Semi-realistic 3D glossy' suits premium slots; 'flat vector cartoon' suits casual. Be as descriptive as possible — it's applied to all generated images." },
  lightingStyle: { label: "Lighting Style",    info: "Lighting behavior",                        example: "High contrast cinematic lighting",
    tip: "Controls shadows, highlights, and atmosphere. Cinematic high-contrast works for dramatic themes; soft ambient suits fantasy. This is embedded into every asset's image prompt." },
  colorPalette:  { label: "Color Palette",     info: "Primary and accent colors",                example: "Gold, black, deep red accents",
    tip: "List 3–5 colours by name or description (e.g. 'deep purple, gold, ice blue'). These are woven into all asset prompts to ensure visual consistency across symbols, UI, and backgrounds." },
  resolution:    { label: "Resolution",        info: "Asset size",                               example: "4096×4096 ultra HD",
    tip: "The target output resolution for final assets. Higher values like 4096×4096 ensure print and retina quality but increase generation time. Most mobile slots ship at 1024×1024 or 2048×2048." },
  aspectRatio:   { label: "Aspect Ratio",      info: "Canvas proportion",                        example: "1:1 optimized for mobile",
    tip: "Symbol assets are always 1:1. For backgrounds specify your game canvas ratio (e.g. '9:16 portrait mobile' or '16:9 landscape desktop'). This informs composition in the AI prompts." },
  safeArea:      { label: "Safe Area",         info: "UI-safe margins",                          example: "10% padding all sides",
    tip: "The edge region that must stay clear of important visual elements to avoid UI overlap. Specify as a percentage (e.g. '10% all sides') so the AI composes subjects away from edges." },
  backgroundType:{ label: "Background Type",   info: "Static or layered",                        example: "Layered with parallax",
    tip: "Static backgrounds are a single image; layered backgrounds are split into depth planes for parallax scrolling effects in the game engine. Layered gives a richer, more immersive feel." },
  environment:   { label: "Environment",       info: "Scene details",                            example: "Ancient temple with glowing hieroglyphs",
    tip: "Describe the specific setting — architecture, lighting sources, atmospheric props. The more detail you provide here, the more unique and on-theme the background illustration will be." },
  motionElements:{ label: "Motion Elements",   info: "Effects",                                  example: "Fog, light beams, particles",
    tip: "Background elements that will be animated in-engine (fog, floating particles, light shafts). List these so the AI generates them as separable layers or suggests placement." },
  symbolStyle:   { label: "Symbol Style",      info: "Visual design of symbols",                 example: "3D glossy icons",
    tip: "The rendering style shared by all reel symbols. '3D glossy icons' means bevelled edges and reflections; 'flat hand-drawn' means sketchy outlines. Consistent style across symbols is critical." },
  highSymbols:   { label: "High Symbols",      info: "Premium icons",                            example: "Egyptian gods",
    tip: "High-value symbols are the thematic stars of the reels. Specify what characters, objects, or creatures they depict (e.g. 'Egyptian gods — Anubis, Ra, Horus'). Each gets a unique, detailed prompt." },
  wildSymbol:    { label: "Wild Symbol",       info: "Special symbol",                           example: "Golden scarab glowing",
    tip: "The Wild substitutes for other symbols to complete winning lines. It should stand out from all other symbols visually — typically more ornate, glowing, or animated. Describe its unique look." },
  scatterSymbol: { label: "Scatter Symbol",    info: "Bonus trigger",                            example: "Pharaoh mask",
    tip: "The Scatter triggers free spins or bonus rounds — it should feel special and reward the player visually. Often depicted as a distinctive artefact, icon, or character portrait." },
  animationStyle:{ label: "Animation Style",   info: "Motion feel",                              example: "Juicy exaggerated",
    tip: "Describes how animations feel in motion. 'Juicy exaggerated' means snappy, bouncy, over-the-top reactions (popular in casual slots). 'Smooth realistic' means subtle, cinematic movement." },
  winEffects:    { label: "Win Effects",       info: "Winning feedback",                         example: "Coin explosion, glow burst",
    tip: "Visual effects triggered on a winning combination. List 2–3 distinct effects (e.g. 'coin explosion, golden light rays, screen flash'). These are generated as FX sprite assets." },
  particles:     { label: "Particles",         info: "FX style",                                 example: "Golden sparkles",
    tip: "The particle system style used for ambient and win effects. Be specific about size, colour, and behaviour (e.g. 'small golden star sparkles drifting upward'). Drives the FX sprite generation." },
  fileFormat:    { label: "File Format",       info: "Output type",                              example: "PNG with transparency",
    tip: "PNG with transparency (alpha channel) is standard for slot game assets — it allows symbols to be composited over any reel background. JPEG is only suitable for opaque backgrounds." },
  atlasReady:    { label: "Atlas Ready",       info: "Game engine compatibility",                example: "Yes, sprite atlas ready",
    tip: "Sprite atlases pack multiple assets into a single image for performance. If your engine uses TexturePacker, Unity Sprite Atlas, or Phaser, set this to 'Yes' and all assets will be sized for packing." },
  sharpness:     { label: "Sharpness",         info: "Detail level",                             example: "Ultra sharp, no blur",
    tip: "Specifies the crispness requirement for edges and fine detail. 'Ultra sharp' is essential for high-resolution exports. This is added directly to image prompts to avoid AI over-softening." },
  consistency:   { label: "Consistency",       info: "Visual uniformity",                        example: "Strict across all assets",
    tip: "How rigidly the Style DNA must be applied across all assets. 'Strict' means the AI is instructed to enforce identical lighting, palette, and texture rules on every single generated image." },
  negativePrompt:{ label: "Negative Prompt",   info: "What to avoid",                            example: "No blur, no watermark, no distortion",
    tip: "Explicitly tells the AI what NOT to include. Always add 'no watermark, no text overlay, no blur' as a baseline. Add theme-specific exclusions (e.g. 'no modern elements' for ancient themes)." },
};

// ---------------------------------------------------------------------------
// Sections — maps 1:1 to the PDF structure
// ---------------------------------------------------------------------------

const SECTIONS: { title: string; number: string; fields: TextFieldKey[] }[] = [
  { number: "01", title: "Game Identity",       fields: ["gameName", "theme", "targetAudience", "emotionalTone"] },
  { number: "02", title: "Art Direction",       fields: ["artStyle", "lightingStyle", "colorPalette"] },
  { number: "03", title: "Layout & Resolution", fields: ["resolution", "aspectRatio", "safeArea"] },
  { number: "04", title: "Background",          fields: ["backgroundType", "environment", "motionElements"] },
  { number: "05", title: "Symbols",             fields: ["symbolStyle", "highSymbols", "wildSymbol", "scatterSymbol"] },
  { number: "06", title: "FX & Animation",      fields: ["animationStyle", "winEffects", "particles"] },
  { number: "07", title: "Export Settings",     fields: ["fileFormat", "atlasReady"] },
  { number: "08", title: "Quality Control",     fields: ["sharpness", "consistency", "negativePrompt"] },
];

const ASSET_TYPES: { value: AssetType; label: string; icon: string; desc: string }[] = [
  { value: "symbol_low",  label: "Low Symbols",  icon: "♠",  desc: "Card suits, 9–A" },
  { value: "symbol_high", label: "High Symbols", icon: "💎", desc: "Theme chars & objects" },
  { value: "background",  label: "Background",   icon: "🌄", desc: "Full scene backdrop" },
  { value: "ui",          label: "UI Elements",  icon: "🖱",  desc: "Buttons, frames, meters" },
  { value: "fx",          label: "FX",           icon: "✨", desc: "Particles, glow, win fx" },
];

const EMPTY_FORM: ProjectForm = {
  gameName: "", theme: "", targetAudience: "", emotionalTone: "",
  artStyle: "", lightingStyle: "", colorPalette: "",
  resolution: "", aspectRatio: "", safeArea: "",
  backgroundType: "", environment: "", motionElements: "",
  symbolStyle: "", highSymbols: "", wildSymbol: "", scatterSymbol: "",
  animationStyle: "", winEffects: "", particles: "",
  fileFormat: "", atlasReady: "",
  sharpness: "", consistency: "", negativePrompt: "",
  // Pre-select all asset types so everything generates by default
  assetTypes: ["symbol_low", "symbol_high", "background", "ui", "fx"],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  onSubmit: (form: ProjectForm) => void;
  isLoading: boolean;
  slotType: SlotType;
  onQuotaExhausted?: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type SuggestError = {
  title: string;
  detail: string;
  retryAt?: string;
  fixUrl?: string;
  fixLabel?: string;
};

export default function ProjectFormComponent({ onSubmit, isLoading, slotType, onQuotaExhausted }: Props) {
  const slotConfig = getSlotConfig(slotType);
  // Merge slot-type overrides into FIELD_META so example placeholders + tips
  // shift to match what's typical for that reel layout.
  const effectiveMeta = (key: TextFieldKey) => {
    const base = FIELD_META[key];
    const override = slotConfig.fieldOverrides[key as keyof typeof slotConfig.fieldOverrides];
    if (!override) return base;
    return {
      ...base,
      example: override.example ?? base.example,
      tip: override.tip ?? base.tip,
    };
  };
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<SuggestError | null>(null);

  const setField = useCallback((key: TextFieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAssetType = useCallback((type: AssetType) => {
    setForm((prev) => ({
      ...prev,
      assetTypes: prev.assetTypes.includes(type)
        ? prev.assetTypes.filter((t) => t !== type)
        : [...prev.assetTypes, type],
    }));
  }, []);

  const suggestField = useCallback(
    async (field: TextFieldKey): Promise<{ ok: true } | { ok: false; error: SuggestError }> => {
      setSuggestingField(field);
      try {
        const { assetTypes: _at, ...textFields } = form;
        void _at;
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, form: textFields }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          suggestion?: string;
          error?: string;
          code?: string;
          retryAt?: string;
        };
        if (res.ok) {
          if (data.suggestion) setField(field, data.suggestion);
          return { ok: true };
        }
        // Bubble quota exhaustion up to the page so it can flag the provider.
        if (data.code === "insufficient_quota" || /quota/i.test(data.error ?? "")) {
          onQuotaExhausted?.();
        }
        return { ok: false, error: explainSuggestError(res.status, data) };
      } catch (err) {
        return {
          ok: false,
          error: {
            title: "Network error",
            detail:
              err instanceof Error ? err.message : "Could not reach the suggestion API.",
          },
        };
      } finally {
        setSuggestingField(null);
      }
    },
    [form, setField, onQuotaExhausted]
  );

  const suggestAll = useCallback(async () => {
    setSuggestError(null);
    const keys = Object.keys(EMPTY_FORM).filter(
      (k) => k !== "assetTypes" && !(form as Record<string, unknown>)[k]
    ) as TextFieldKey[];
    for (const key of keys) {
      const result = await suggestField(key);
      if (!result.ok) {
        setSuggestError(result.error);
        return; // stop the loop — don't burn through 25 failing requests
      }
    }
  }, [form, suggestField]);

  const handleSuggestSingle = useCallback(
    async (field: TextFieldKey) => {
      setSuggestError(null);
      const result = await suggestField(field);
      if (!result.ok) setSuggestError(result.error);
    },
    [suggestField]
  );

  const isValid =
    form.gameName.trim() !== "" &&
    form.theme.trim() !== "" &&
    form.assetTypes.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) onSubmit(form);
  };

  const filledCount = Object.entries(form).filter(
    ([k, v]) => k !== "assetTypes" && typeof v === "string" && (v as string).trim()
  ).length;
  const totalFields = Object.keys(EMPTY_FORM).length - 1; // minus assetTypes

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {/* Slot type context banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/25 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-2xl flex-shrink-0">
            🎰
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300/80">Slot Format</p>
              <span className="text-[10px] rounded-full bg-emerald-600/20 border border-emerald-500/30 px-2 py-0.5 text-emerald-300 font-semibold tracking-wider">
                ACTIVE
              </span>
            </div>
            <p className="text-lg font-extrabold text-white mt-1">{slotConfig.label}</p>
            <p className="text-sm text-zinc-400 mt-1">{slotConfig.tagline}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 mt-4 text-xs">
              <SlotConfigItem icon="🎯" label="Paylines"        value={slotConfig.paylines} />
              <SlotConfigItem icon="💎" label="High symbols"    value={slotConfig.highSymbolCount} />
              <SlotConfigItem icon="🃏" label="Low symbols"     value={slotConfig.lowSymbolStyle} />
              <SlotConfigItem icon="📐" label="Aspect"          value={slotConfig.aspectRatioHint} />
              <SlotConfigItem icon="✨" label="Animation"       value={slotConfig.animationFeel} />
              <SlotConfigItem icon="🎨" label="Theme fit"       value={slotConfig.themeFit} />
            </div>
            <p className="text-xs text-indigo-200/70 mt-4 leading-relaxed italic">
              Form examples and AI prompts have been tuned for this slot type. Switch via the sidebar 🎰 picker if you want a different format.
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-400/80 uppercase tracking-[0.18em] flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Fast Assets Generation
          </span>
          <button
            type="button"
            onClick={suggestAll}
            disabled={!!suggestingField || isLoading}
            title="AI-fill all empty fields"
            className="flex items-center gap-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 px-4 py-2 text-sm font-semibold text-indigo-300 transition-all disabled:opacity-40"
          >
            <SparkleIcon />
            Fill All
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.round((filledCount / totalFields) * 100)}%` }}
            />
          </div>
          <span className="text-sm text-zinc-400 tabular-nums whitespace-nowrap font-medium">
            {filledCount}/{totalFields} fields
          </span>
        </div>
        {suggestError && (
          <SuggestErrorBanner error={suggestError} onDismiss={() => setSuggestError(null)} />
        )}
      </div>

      {/* 8 sections */}
      {SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-indigo-500/60">{section.number}</span>
            <h2 className="text-base font-bold uppercase tracking-[0.18em] text-indigo-400">
              {section.title}
            </h2>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {section.fields.map((fieldKey) => (
              <AIPromptField
                key={fieldKey}
                fieldKey={fieldKey}
                meta={effectiveMeta(fieldKey)}
                value={form[fieldKey] as string}
                onChange={(v) => setField(fieldKey, v)}
                onSuggest={() => handleSuggestSingle(fieldKey)}
                isSuggesting={suggestingField === fieldKey}
                isAnyLoading={!!suggestingField}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Asset types */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-indigo-500/60">09</span>
          <h2 className="text-base font-bold uppercase tracking-[0.18em] text-indigo-400">
            Asset Types to Generate
          </h2>
          <div className="flex-1 h-px bg-white/8" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {ASSET_TYPES.map((a) => {
            const active = form.assetTypes.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleAssetType(a.value)}
                className={`rounded-xl border p-5 text-left transition-all ${
                  active
                    ? "border-indigo-500 bg-indigo-600/20 text-white shadow-sm shadow-indigo-500/20"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:bg-white/[0.08]"
                }`}
              >
                <div className="text-3xl mb-2.5">{a.icon}</div>
                <div className="text-sm font-bold mb-1">{a.label}</div>
                <div className="text-xs opacity-70 leading-snug">{a.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit footer */}
      <div className="flex items-center justify-between pt-5 border-t border-white/10">
        <p className="text-sm text-zinc-400">
          {!form.gameName.trim()
            ? "Enter a Game Title to continue."
            : !form.theme.trim()
            ? "Enter a Theme to continue."
            : form.assetTypes.length === 0
            ? "Select at least one asset type."
            : "Ready to generate assets."}
        </p>
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all px-10 py-3.5 text-base font-bold shadow-lg shadow-black/30"
        >
          {isLoading ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            "Generate Assets →"
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// AI Prompt Field
// ---------------------------------------------------------------------------

function AIPromptField({
  fieldKey,
  meta,
  value,
  onChange,
  onSuggest,
  isSuggesting,
  isAnyLoading,
}: {
  fieldKey: TextFieldKey;
  meta: { label: string; info: string; example: string; tip: string };
  value: string;
  onChange: (v: string) => void;
  onSuggest: () => void;
  isSuggesting: boolean;
  isAnyLoading: boolean;
}) {
  void fieldKey;
  const isFilled = value.trim() !== "";
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        {isFilled && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
        <label className="text-sm font-semibold text-zinc-200">{meta.label}</label>

        {/* Info button + tooltip */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onFocus={() => setShowTip(true)}
            onBlur={() => setShowTip(false)}
            className="w-4 h-4 rounded-full bg-white/10 hover:bg-indigo-600/30 border border-white/15 hover:border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-zinc-500 hover:text-indigo-300 transition-all"
            aria-label={`Info about ${meta.label}`}
          >
            i
          </button>
          {showTip && (
            <div
              className="absolute left-0 top-6 z-50 w-72 rounded-xl bg-[#13131f] border border-white/15 shadow-2xl shadow-black/60 p-3 pointer-events-none"
              style={{ animation: "fade-in 0.15s ease-out both" }}
            >
              <p className="text-[11px] font-bold text-indigo-300 mb-1.5">{meta.label}</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{meta.tip}</p>
              <p className="text-[10px] text-zinc-600 mt-2 italic">e.g. {meta.example}</p>
            </div>
          )}
        </div>

        <span className="text-[11px] text-zinc-600 ml-auto truncate max-w-[140px]">{meta.info}</span>
      </div>

      {/* Input + AI button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta.example}
          className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-colors"
        />
        <button
          type="button"
          onClick={onSuggest}
          disabled={isSuggesting || isAnyLoading}
          title={`AI suggest ${meta.label}`}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-600/10 hover:bg-indigo-600/25 px-4 py-3 text-sm font-semibold text-indigo-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSuggesting ? <Spinner size={3} /> : <SparkleIcon />}
          <span className="hidden sm:inline">AI</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot-type banner helper
// ---------------------------------------------------------------------------

function SlotConfigItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-zinc-500">{label}: </span>
        <span className="text-zinc-200">{value}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggest-error helpers
// ---------------------------------------------------------------------------

function explainSuggestError(
  status: number,
  data: { error?: string; code?: string; retryAt?: string }
): SuggestError {
  const { error, code, retryAt } = data;

  if (code === "insufficient_quota" || /quota/i.test(error ?? "")) {
    return {
      title: "OpenAI quota exhausted",
      detail:
        "Your OpenAI account has no remaining credit. Top up to resume — there is no automatic retry for quota errors.",
      fixUrl: "https://platform.openai.com/account/billing",
      fixLabel: "Open OpenAI billing",
    };
  }
  if (code === "rate_limit_exceeded" || status === 429) {
    return {
      title: "OpenAI rate limit hit",
      detail:
        "Too many requests. The endpoint will accept new requests after the cooldown below.",
      retryAt,
    };
  }
  if (status === 503) {
    return {
      title: "OpenAI key not configured",
      detail: "OPENAI_API_KEY is missing on the server. Add it to .env.local and restart the dev server.",
    };
  }
  if (code === "invalid_api_key" || status === 401) {
    return {
      title: "Invalid OpenAI API key",
      detail: "The configured OPENAI_API_KEY was rejected. Generate a new key and update .env.local.",
      fixUrl: "https://platform.openai.com/api-keys",
      fixLabel: "Open API keys",
    };
  }
  return {
    title: `Suggestion failed (HTTP ${status})`,
    detail: error ?? "Unknown error from the suggestion API.",
    retryAt,
  };
}

function useCountdown(retryAt: string | undefined): { remainingSec: number; localTime: string } | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!retryAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [retryAt]);
  if (!retryAt) return null;
  const target = new Date(retryAt).getTime();
  if (Number.isNaN(target)) return null;
  const remainingSec = Math.max(0, Math.round((target - now) / 1000));
  const localTime = new Date(target).toLocaleTimeString();
  return { remainingSec, localTime };
}

function SuggestErrorBanner({
  error,
  onDismiss,
}: {
  error: SuggestError;
  onDismiss: () => void;
}) {
  const countdown = useCountdown(error.retryAt);

  return (
    <div className="mt-2 rounded-xl bg-red-900/25 border border-red-500/30 px-4 py-3 flex items-start gap-3 animate-fade-in">
      <span className="text-red-400 mt-px">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-300">{error.title}</p>
        <p className="text-xs text-red-200/80 mt-1 leading-relaxed">{error.detail}</p>
        {countdown && (
          <p className="text-xs text-amber-300 mt-2 font-mono">
            {countdown.remainingSec > 0
              ? `Next activation in ${countdown.remainingSec}s (≈ ${countdown.localTime})`
              : `Cooldown elapsed at ${countdown.localTime} — try again now.`}
          </p>
        )}
        {error.fixUrl && (
          <a
            href={error.fixUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-indigo-300 hover:text-indigo-200 underline mt-2"
          >
            {error.fixLabel ?? "Open"} →
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-red-400 hover:text-red-200 flex-shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons / helpers
// ---------------------------------------------------------------------------

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg
      className={`animate-spin w-${size} h-${size}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
