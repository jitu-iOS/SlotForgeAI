import OpenAI from "openai";
import type { ProjectForm, StyleDNA, Asset, AssetType, SlotType } from "@/app/types";
import { nanoid } from "@/app/lib/nanoid";
import { getSlotConfig } from "@/app/lib/slotTypeConfig";
import { getProviderKey } from "@/app/lib/keys/providerKey";
import { resolvePromptModel } from "@/app/lib/aiRoles";

// ---------------------------------------------------------------------------
// Asset catalogue
// ---------------------------------------------------------------------------

const ASSET_CATALOGUE: Record<AssetType, { label: string; slot: string }[]> = {
  symbol_low: [
    { label: "Nine (9)",  slot: "sym_9" },
    { label: "Ten (10)", slot: "sym_10" },
    { label: "Jack (J)", slot: "sym_J" },
    { label: "Queen (Q)",slot: "sym_Q" },
    { label: "King (K)", slot: "sym_K" },
    { label: "Ace (A)",  slot: "sym_A" },
  ],
  symbol_high: [
    { label: "High Symbol 1", slot: "sym_h1" },
    { label: "High Symbol 2", slot: "sym_h2" },
    { label: "High Symbol 3", slot: "sym_h3" },
    { label: "Wild Symbol",   slot: "sym_wild" },
    { label: "Scatter Symbol",slot: "sym_scatter" },
  ],
  background: [
    { label: "Main Background",    slot: "bg_main" },
    { label: "Loading Screen",     slot: "bg_loading" },
  ],
  ui: [
    { label: "Spin Button",               slot: "ui_spin" },
    { label: "Win Frame",                 slot: "ui_win_frame" },
    { label: "Balance Panel",             slot: "ui_balance" },
    { label: "Reels Frame",               slot: "ui_reels_frame" },
    { label: "Full Slot Machine Preview", slot: "ui_slot_machine" },
  ],
  fx: [
    { label: "Win Particle Burst",       slot: "fx_win_particles" },
    { label: "Wild Splash Effect",       slot: "fx_wild_splash" },
    { label: "Scatter Glow",             slot: "fx_scatter_glow" },
    { label: "Reel Spin Animation Frame",slot: "fx_reel_spin" },
    { label: "Coin Rain Animation Frame",slot: "fx_coin_rain" },
    { label: "Symbol Win Glow Frame",    slot: "fx_symbol_win" },
  ],
};

const TYPE_CONTEXT: Record<AssetType, string> = {
  symbol_low:  "low-value card symbol for a slot machine reel",
  symbol_high: "high-value thematic symbol for a slot machine reel",
  background:  "full-scene background illustration for a slot game",
  ui:          "UI element for a slot game interface",
  fx:          "visual effect particle or animation sprite for a slot game",
};

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

let _client: { key: string; client: OpenAI } | null = null;

async function getClient(): Promise<OpenAI | null> {
  const key = await getProviderKey("openai");
  if (!key) { _client = null; return null; }
  if (_client && _client.key === key) return _client.client;
  _client = { key, client: new OpenAI({ apiKey: key }) };
  return _client.client;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function buildStyleDNA(form: ProjectForm, slotType?: SlotType, promptModel?: string): Promise<StyleDNA> {
  const client = await getClient();
  if (!client) return buildStyleDNAFallback(form);

  try {
    const completion = await client.chat.completions.create({
      model: resolvePromptModel(promptModel),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: STYLE_DNA_SYSTEM },
        { role: "user",   content: styleDNAUserMsg(form, slotType) },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    return {
      artStyle:      form.artStyle || "stylised 2D",
      colorPalette:  parseColorPalette(form.colorPalette),
      mood:          form.emotionalTone || form.theme,
      theme:         form.theme,
      lightingHints: raw.lightingHints ?? fallbackLighting(form),
      textureHints:  raw.textureHints  ?? fallbackTexture(form),
    };
  } catch (err) {
    console.error("[promptBuilder] buildStyleDNA error:", err);
    return buildStyleDNAFallback(form);
  }
}

export async function buildPrompts(
  form: ProjectForm,
  styleDNA: StyleDNA,
  slotType?: SlotType,
  promptModel?: string,
): Promise<Asset[]> {
  const client = await getClient();
  const stubs = buildAssetStubs(form.assetTypes);
  if (!client) return buildPromptsFallback(stubs, form, styleDNA);

  try {
    const completion = await client.chat.completions.create({
      model: resolvePromptModel(promptModel),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPTS_SYSTEM },
        { role: "user",   content: promptsUserMsg(stubs, styleDNA, form, slotType) },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    const results: Record<string, { label: string; prompt: string }> = raw.assets ?? {};

    return stubs.map((stub) => ({
      ...stub,
      label:  results[stub.id]?.label  ?? stub.label,
      prompt: results[stub.id]?.prompt ?? fallbackPrompt(stub.label, stub.type, form, styleDNA),
    }));
  } catch (err) {
    console.error("[promptBuilder] buildPrompts error:", err);
    return buildPromptsFallback(stubs, form, styleDNA);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseColorPalette(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildAssetStubs(types: AssetType[]): Asset[] {
  const stubs: Asset[] = [];
  for (const type of types) {
    for (const entry of ASSET_CATALOGUE[type]) {
      stubs.push({
        id: `${entry.slot}_${nanoid()}`,
        type,
        label: entry.label,
        prompt: "",
        imageUrl: "",
        selected: false,
        transparentBg: true,
      });
    }
  }
  return stubs;
}

function buildStyleDNAFallback(form: ProjectForm): StyleDNA {
  return {
    artStyle:      form.artStyle || "stylised 2D",
    colorPalette:  parseColorPalette(form.colorPalette),
    mood:          form.emotionalTone || form.theme,
    theme:         form.theme,
    lightingHints: fallbackLighting(form),
    textureHints:  fallbackTexture(form),
  };
}

function buildPromptsFallback(stubs: Asset[], form: ProjectForm, styleDNA: StyleDNA): Asset[] {
  return stubs.map((stub) => ({ ...stub, prompt: fallbackPrompt(stub.label, stub.type, form, styleDNA) }));
}

function fallbackLighting(form: ProjectForm): string {
  const tone = form.lightingStyle || form.emotionalTone || "dramatic";
  return `${tone} lighting with well-defined shadows, ${form.artStyle || "stylised"} rendering style`;
}

function fallbackTexture(form: ProjectForm): string {
  const style = form.artStyle || "stylised";
  return `${style} surface textures, polished finish consistent with ${form.theme} theme`;
}

function fallbackPrompt(label: string, type: AssetType, form: ProjectForm, styleDNA: StyleDNA): string {
  const paletteStr = styleDNA.colorPalette.join(", ") || form.colorPalette;
  return (
    `${styleDNA.artStyle} style ${label}, ${TYPE_CONTEXT[type]}, ` +
    `theme: ${form.theme}, mood: ${styleDNA.mood}, ` +
    `colors: ${paletteStr}, ` +
    `${styleDNA.lightingHints}, ${styleDNA.textureHints}, ` +
    `2D game asset, PNG, isolated on transparent background`
  );
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const STYLE_DNA_SYSTEM = `\
You are a senior slot game art director. Write concise visual direction for a 2D slot game asset set.

Respond with exactly two keys:
- "lightingHints": one sentence on lighting direction, quality, and atmosphere for every asset
- "textureHints": one sentence on surface texture, material finish, and detail level for every asset

Be specific and visual. No generic phrases like "high quality" or "detailed".`;

function styleDNAUserMsg(form: ProjectForm, slotType?: SlotType): string {
  const lines: string[] = [];
  if (slotType) {
    const cfg = getSlotConfig(slotType);
    lines.push(`Slot Format: ${cfg.label} — ${cfg.tagline}`);
    lines.push(`Slot Context: ${cfg.promptContext}`);
  }
  lines.push(`Game: ${form.gameName}`);
  lines.push(`Theme: ${form.theme}`);
  if (form.targetAudience) lines.push(`Audience: ${form.targetAudience}`);
  if (form.emotionalTone)  lines.push(`Emotional Tone: ${form.emotionalTone}`);
  if (form.artStyle)       lines.push(`Art Style: ${form.artStyle}`);
  if (form.lightingStyle)  lines.push(`Lighting Style: ${form.lightingStyle}`);
  if (form.colorPalette)   lines.push(`Color Palette: ${form.colorPalette}`);
  if (form.environment)    lines.push(`Environment: ${form.environment}`);
  if (form.backgroundType) lines.push(`Background: ${form.backgroundType}`);
  if (form.motionElements) lines.push(`Motion: ${form.motionElements}`);
  if (form.symbolStyle)    lines.push(`Symbol Style: ${form.symbolStyle}`);
  if (form.animationStyle) lines.push(`Animation: ${form.animationStyle}`);
  if (form.sharpness)      lines.push(`Sharpness: ${form.sharpness}`);
  if (form.negativePrompt) lines.push(`Avoid: ${form.negativePrompt}`);
  return lines.join("\n");
}

const PROMPTS_SYSTEM = `\
You are an expert slot game concept artist writing prompts for an AI image generator.

For each asset produce:
1. A theme-specific "label" (rename generic names like "High Symbol 1" to a specific thematic name — e.g. "Pharaoh"; keep card names like "Ace (A)" unchanged)
2. A "prompt" of 40–70 words including: subject, art style, lighting, dominant colors, mood, composition — ending with "2D game asset, PNG, isolated on transparent background"

Return JSON: { "assets": { "<asset_id>": { "label": "...", "prompt": "..." }, ... } }`;

function promptsUserMsg(stubs: Asset[], styleDNA: StyleDNA, form: ProjectForm, slotType?: SlotType): string {
  const assetList = stubs
    .map((s) => {
      let ctx = TYPE_CONTEXT[s.type];
      // Override context for special assets
      if (s.label === "Full Slot Machine Preview") {
        ctx = "complete slot machine UI mockup — all 5 reels, themed pay frame, spin button, win display, decorative cabinet surround, full game screen composition";
      } else if (s.label === "Reel Spin Animation Frame") {
        ctx = "single motion-blurred reel strip sprite frame for spin animation";
      } else if (s.label === "Coin Rain Animation Frame") {
        ctx = "coin cascade sprite frame, coins raining from top with trails";
      } else if (s.label === "Symbol Win Glow Frame") {
        ctx = "winning symbol highlight frame with radiant glow and pulse effect";
      } else if (s.label === "Loading Screen") {
        ctx = "game loading screen full illustration, pre-loader background";
      } else {
        // Inject form-specific hints
        if (s.label === "Wild Symbol"    && form.wildSymbol)    ctx += ` — design: ${form.wildSymbol}`;
        if (s.label === "Scatter Symbol" && form.scatterSymbol) ctx += ` — design: ${form.scatterSymbol}`;
        if (s.type === "symbol_high"     && form.highSymbols)   ctx += ` — theme: ${form.highSymbols}`;
        if (s.type === "background"      && form.environment)   ctx += ` — scene: ${form.environment}`;
        if (s.type === "fx"              && form.winEffects)    ctx += ` — effect: ${form.winEffects}`;
        if (s.type === "fx"              && form.particles)     ctx += `, particles: ${form.particles}`;
      }
      return `- ${s.id}: ${s.label} (${ctx})`;
    })
    .join("\n");

  const slotPreamble = slotType
    ? `Slot Format: ${getSlotConfig(slotType).label}
Slot Context: ${getSlotConfig(slotType).promptContext}

`
    : "";

  return `${slotPreamble}Style DNA:
Art Style: ${styleDNA.artStyle}
Theme: ${styleDNA.theme}
Mood: ${styleDNA.mood}
Colors: ${styleDNA.colorPalette.join(", ") || form.colorPalette}
Lighting: ${styleDNA.lightingHints}
Textures: ${styleDNA.textureHints}
${form.negativePrompt ? `Avoid: ${form.negativePrompt}` : ""}

Assets:
${assetList}`;
}

// ---------------------------------------------------------------------------
// Single-asset regeneration
// ---------------------------------------------------------------------------

export async function rebuildSingleAsset(
  styleDNA: StyleDNA,
  type: AssetType,
  label: string,
  id: string
): Promise<Asset> {
  const stub: Asset = { id, type, label, prompt: "", imageUrl: "", selected: false, transparentBg: true };
  const client = await getClient();

  if (!client) {
    return { ...stub, prompt: fallbackPromptFromDNA(label, type, styleDNA) };
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: REGEN_SYSTEM },
        { role: "user",   content: regenUserMsg(label, type, styleDNA) },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    return { ...stub, prompt: raw.prompt ?? fallbackPromptFromDNA(label, type, styleDNA) };
  } catch (err) {
    console.error("[promptBuilder] rebuildSingleAsset error:", err);
    return { ...stub, prompt: fallbackPromptFromDNA(label, type, styleDNA) };
  }
}

function fallbackPromptFromDNA(label: string, type: AssetType, styleDNA: StyleDNA): string {
  return (
    `${styleDNA.artStyle} style ${label}, ${TYPE_CONTEXT[type]}, ` +
    `theme: ${styleDNA.theme}, mood: ${styleDNA.mood}, ` +
    `colors: ${styleDNA.colorPalette.join(", ")}, ` +
    `${styleDNA.lightingHints}, ${styleDNA.textureHints}, ` +
    `2D game asset, PNG, isolated on transparent background`
  );
}

const REGEN_SYSTEM = `\
You are a slot game concept artist generating a fresh visual variation of an existing asset.
Keep the Style DNA strictly — same art style, colors, lighting, and textures.
Write a NEW prompt (40–70 words) exploring a different angle, composition, or detail treatment.
End with "2D game asset, PNG, isolated on transparent background".
Output JSON: { "prompt": "..." }`;

function regenUserMsg(label: string, type: AssetType, styleDNA: StyleDNA): string {
  return `Asset: ${label} (${TYPE_CONTEXT[type]})
Style DNA:
Art Style: ${styleDNA.artStyle}
Theme: ${styleDNA.theme}
Mood: ${styleDNA.mood}
Colors: ${styleDNA.colorPalette.join(", ")}
Lighting: ${styleDNA.lightingHints}
Textures: ${styleDNA.textureHints}`;
}
