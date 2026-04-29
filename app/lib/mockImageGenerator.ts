import OpenAI from "openai";
import Replicate from "replicate";
import type { Asset, AssetType, StyleDNA, ImageModel } from "@/app/types";
import { getProviderKey } from "@/app/lib/keys/providerKey";
import { tryFreeFallback } from "@/app/lib/freeFallbacks";

// ---------------------------------------------------------------------------
// Model → generator mapping
// ---------------------------------------------------------------------------

type InternalGenerator = "gpt-image-1" | "replicate" | "imagineart" | "free-fallback" | "placeholder";

const REPLICATE_MODELS: Partial<Record<ImageModel, string>> = {
  "flux-1.1-pro-ultra":   "black-forest-labs/flux-1.1-pro-ultra",
  "stable-diffusion-3.5": "stability-ai/stable-diffusion-3.5-large",
};

// Animation-only models route through Runway (the single canonical animation
// provider). The video-generation pipeline is a planned follow-up; for now
// animation models route to the placeholder generator with a console.warn so
// the app stays usable.
const NATIVE_VIDEO_MODELS: ImageModel[] = ["runway-gen3"];

async function resolveGenerator(model?: ImageModel): Promise<{ gen: InternalGenerator; replicateModel?: string }> {
  const openaiKey     = await getProviderKey("openai");
  const replicateKey  = await getProviderKey("replicate");
  const imagineartKey = await getProviderKey("imagineart");

  // Explicit model from user
  if (model) {
    if (model === "gpt-image-1") {
      return { gen: openaiKey ? "gpt-image-1" : "placeholder" };
    }
    if (model === "flux-1.1-pro-ultra-imagineart") {
      return { gen: imagineartKey ? "imagineart" : "placeholder" };
    }
    if (model === "pollinations-flux-free") {
      return { gen: "free-fallback" };
    }
    if (NATIVE_VIDEO_MODELS.includes(model)) {
      // Runway video pipeline — not yet wired. Fall back to placeholder so the
      // asset grid still renders something instead of erroring out.
      console.warn(
        `[imageGenerator] ${model} is a video-generation model. The video pipeline is not yet implemented; ` +
        `using placeholder. Wire up RunwayML SDK to enable real generation.`
      );
      return { gen: "placeholder" };
    }
    const replicateModel = REPLICATE_MODELS[model];
    if (replicateModel) {
      return {
        gen: replicateKey ? "replicate" : "placeholder",
        replicateModel,
      };
    }
  }

  // Fallback: env var override, then auto-detect
  const override = process.env.IMAGE_GENERATOR?.toLowerCase();
  if (override === "replicate")   return { gen: replicateKey ? "replicate"   : "placeholder", replicateModel: process.env.REPLICATE_MODEL ?? "black-forest-labs/flux-1.1-pro" };
  if (override === "gpt-image-1") return { gen: openaiKey    ? "gpt-image-1" : "placeholder" };

  if (openaiKey)    return { gen: "gpt-image-1" };
  if (replicateKey) return { gen: "replicate", replicateModel: "black-forest-labs/flux-1.1-pro" };
  return { gen: "placeholder" };
}

// ---------------------------------------------------------------------------
// Per-key cached clients — re-build when the resolved key changes (panel edit).
// ---------------------------------------------------------------------------

let _openai: { key: string; client: OpenAI } | null = null;
let _replicate: { key: string; client: Replicate } | null = null;

async function getOpenAI(): Promise<OpenAI | null> {
  const key = await getProviderKey("openai");
  if (!key) { _openai = null; return null; }
  if (_openai && _openai.key === key) return _openai.client;
  _openai = { key, client: new OpenAI({ apiKey: key }) };
  return _openai.client;
}

async function getReplicate(): Promise<Replicate | null> {
  const key = await getProviderKey("replicate");
  if (!key) { _replicate = null; return null; }
  if (_replicate && _replicate.key === key) return _replicate.client;
  _replicate = { key, client: new Replicate({ auth: key }) };
  return _replicate.client;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateSingleImage(
  asset: Asset,
  styleDNA: StyleDNA,
  model?: ImageModel
): Promise<Asset> {
  const { gen, replicateModel } = await resolveGenerator(model);

  // User-selected free fallback path (no quota, no key)
  if (gen === "free-fallback") {
    const r = await tryFreeFallback(asset.prompt);
    if (r) return { ...asset, imageUrl: r.imageUrl, usedFallback: r.fallbackId };
    return { ...asset, imageUrl: buildDataUrl(asset, styleDNA) };
  }

  // Primary path with auto-fallback on failure
  let result: Asset | null = null;
  let primaryFailed = false;
  try {
    if (gen === "gpt-image-1") result = await generateGPTImage((await getOpenAI())!, asset, styleDNA);
    else if (gen === "replicate")  result = await generateReplicate((await getReplicate())!, asset, styleDNA, replicateModel!);
    else if (gen === "imagineart") result = await generateImagineArt(asset, styleDNA);
  } catch (err) {
    console.warn(`[generate] primary "${gen}" threw — trying free fallback:`, err);
    primaryFailed = true;
  }

  // Detect "soft failure": branches above catch their errors and return the
  // SVG placeholder instead of throwing. Spot the placeholder marker so we
  // can still kick into the fallback chain.
  const looksLikePlaceholder = !!result?.imageUrl?.startsWith("data:image/svg+xml");
  if (!result || primaryFailed || looksLikePlaceholder) {
    const r = await tryFreeFallback(asset.prompt);
    if (r) return { ...asset, imageUrl: r.imageUrl, usedFallback: r.fallbackId };
    if (result) return result; // primary's placeholder
    return { ...asset, imageUrl: buildDataUrl(asset, styleDNA) };
  }

  return result;
}

export async function generateMockImages(
  assets: Asset[],
  styleDNA: StyleDNA,
  model?: ImageModel
): Promise<Asset[]> {
  const { gen, replicateModel } = await resolveGenerator(model);
  console.log(`[imageGenerator] model=${model ?? "auto"} → ${gen}${replicateModel ? ` (${replicateModel})` : ""}`);

  if (gen === "gpt-image-1") {
    const client = (await getOpenAI())!;
    return runBatched(assets, (a) => generateGPTImage(client, a, styleDNA));
  }
  if (gen === "replicate") {
    const client = (await getReplicate())!;
    return runBatched(assets, (a) => generateReplicate(client, a, styleDNA, replicateModel!));
  }
  if (gen === "imagineart") {
    return runBatched(assets, (a) => generateImagineArt(a, styleDNA));
  }
  if (gen === "free-fallback") {
    return runBatched(assets, async (a) => {
      const r = await tryFreeFallback(a.prompt);
      return r ? { ...a, imageUrl: r.imageUrl, usedFallback: r.fallbackId } : { ...a, imageUrl: buildDataUrl(a, styleDNA) };
    });
  }
  return generatePlaceholders(assets, styleDNA);
}

// ---------------------------------------------------------------------------
// gpt-image-1
// ---------------------------------------------------------------------------

async function generateGPTImage(client: OpenAI, asset: Asset, styleDNA: StyleDNA): Promise<Asset> {
  try {
    const useTransparent = asset.transparentBg !== false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateFn = client.images.generate as unknown as (opts: Record<string, unknown>) => Promise<{ data?: Array<{ b64_json?: string }> }>;
    const res = await generateFn({
      model: "gpt-image-1",
      prompt: asset.prompt,
      size: "1024x1024",
      quality: "high",
      n: 1,
      // background: "transparent" gives a real RGBA PNG with alpha channel
      background: useTransparent ? "transparent" : "opaque",
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("Empty response from gpt-image-1");
    return { ...asset, imageUrl: `data:image/png;base64,${b64}` };
  } catch (err) {
    console.error(`[gpt-image-1] "${asset.label}":`, err);
    return { ...asset, imageUrl: buildDataUrl(asset, styleDNA) };
  }
}

// ---------------------------------------------------------------------------
// Replicate input shapes — one branch per kept model
// ---------------------------------------------------------------------------

function buildReplicateInput(modelId: string, prompt: string): Record<string, unknown> {
  if (modelId.includes("stable-diffusion-3")) {
    return { prompt, aspect_ratio: "1:1", output_format: "png", num_inference_steps: 28, guidance_scale: 4.5 };
  }
  // FLUX 1.1 Pro / Pro Ultra
  if (modelId.includes("ultra")) {
    return { prompt, aspect_ratio: "1:1", output_format: "jpg", safety_tolerance: 2 };
  }
  return { prompt, aspect_ratio: "1:1", num_outputs: 1, output_format: "png", output_quality: 90, go_fast: true };
}

async function generateReplicate(
  client: Replicate,
  asset: Asset,
  styleDNA: StyleDNA,
  modelId: string
): Promise<Asset> {
  try {
    const output = await client.run(modelId as `${string}/${string}`, {
      input: buildReplicateInput(modelId, asset.prompt),
    });

    const items = Array.isArray(output) ? output : [output];
    const imageUrl = String(items[0]);

    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");

    return { ...asset, imageUrl: `data:image/png;base64,${b64}` };
  } catch (err) {
    console.error(`[replicate:${modelId}] "${asset.label}":`, err);
    return { ...asset, imageUrl: buildDataUrl(asset, styleDNA) };
  }
}

// ---------------------------------------------------------------------------
// Imagine Art — FLUX 1.1 Pro Ultra hosted via api.vyro.ai
// Auth: Authorization: Bearer <key>
// Endpoint: POST https://api.vyro.ai/v2/image/generations
// Body: multipart/form-data with prompt, style, aspect_ratio
// Response: image bytes (or JSON URL — both handled)
// ---------------------------------------------------------------------------

async function generateImagineArt(asset: Asset, styleDNA: StyleDNA): Promise<Asset> {
  try {
    const key = await getProviderKey("imagineart");
    if (!key) throw new Error("IMAGINEART_API_KEY missing (env or vault)");

    const fd = new FormData();
    fd.append("prompt", asset.prompt);
    fd.append("style", "realistic");
    fd.append("aspect_ratio", "1:1");

    const res = await fetch("https://api.vyro.ai/v2/image/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`vyro returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      const mime = contentType.split(";")[0];
      return { ...asset, imageUrl: `data:${mime};base64,${b64}` };
    }

    const json = await res.json().catch(() => null) as { url?: string; image_url?: string; data?: { url?: string }[] } | null;
    const url =
      json?.url ||
      json?.image_url ||
      (Array.isArray(json?.data) ? json!.data![0]?.url : undefined);
    if (!url) throw new Error("vyro response missing image url");

    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`Imagine Art image fetch failed: ${imgRes.status}`);
    const buf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return { ...asset, imageUrl: `data:image/png;base64,${b64}` };
  } catch (err) {
    console.error(`[imagineart] "${asset.label}":`, err);
    return { ...asset, imageUrl: buildDataUrl(asset, styleDNA) };
  }
}

// ---------------------------------------------------------------------------
// Batching
// ---------------------------------------------------------------------------

async function runBatched(
  assets: Asset[],
  fn: (a: Asset) => Promise<Asset>,
  concurrency = 3
): Promise<Asset[]> {
  const results: Asset[] = [];
  for (let i = 0; i < assets.length; i += concurrency) {
    const batch = await Promise.all(assets.slice(i, i + concurrency).map(fn));
    results.push(...batch);
  }
  return results;
}

// ---------------------------------------------------------------------------
// SVG placeholder fallback
// ---------------------------------------------------------------------------

function generatePlaceholders(assets: Asset[], styleDNA: StyleDNA): Asset[] {
  return assets.map((a) => ({ ...a, imageUrl: buildDataUrl(a, styleDNA) }));
}

const TYPE_LABELS: Record<AssetType, string> = {
  symbol_low:  "LOW SYMBOL",
  symbol_high: "HIGH SYMBOL",
  background:  "BACKGROUND",
  ui:          "UI ELEMENT",
  fx:          "FX SPRITE",
};

const TYPE_DEFAULTS: Record<AssetType, [string, string]> = {
  symbol_low:  ["#1e293b", "#334155"],
  symbol_high: ["#1e1b4b", "#3730a3"],
  background:  ["#0f172a", "#1e3a5f"],
  ui:          ["#14532d", "#166534"],
  fx:          ["#4a1d96", "#6d28d9"],
};

function buildDataUrl(asset: Asset, styleDNA: StyleDNA): string {
  const svg = buildSvg(asset, styleDNA);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function buildSvg(asset: Asset, styleDNA: StyleDNA): string {
  const [c1, c2] = gradientColors(asset.type, styleDNA.colorPalette);
  const typeLabel = TYPE_LABELS[asset.type];
  const shape = SHAPES[asset.type]();
  const labelLines = wrapText(asset.label, 28);
  const labelY = 418 - (labelLines.length - 1) * 14;
  const labelSvg = labelLines
    .map(
      (line, i) =>
        `<text x="256" y="${labelY + i * 26}" text-anchor="middle" font-size="20" font-family="system-ui,sans-serif" font-weight="700" fill="white" paint-order="stroke" stroke="rgba(0,0,0,0.6)" stroke-width="4">${escXml(line)}</text>`
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  ${gridOverlay()}
  ${shape}
  <rect x="14" y="14" rx="10" ry="10" width="${typeLabel.length * 7 + 20}" height="24" fill="rgba(0,0,0,0.45)"/>
  <text x="24" y="31" font-size="11" font-family="system-ui,sans-serif" font-weight="600" fill="rgba(255,255,255,0.75)" letter-spacing="1">${typeLabel}</text>
  ${labelSvg}
</svg>`;
}

const SHAPES: Record<AssetType, () => string> = {
  symbol_low: () => `
  <rect x="146" y="96" width="220" height="300" rx="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  <polygon points="256,152 294,216 256,280 218,216" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`,
  symbol_high: () => `
  <polygon points="256,90 360,220 256,380 152,220" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
  <polygon points="256,90 360,220 256,240" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`,
  background: () => `
  <ellipse cx="256" cy="210" rx="72" ry="72" fill="rgba(255,255,255,0.18)" filter="url(#glow)"/>
  <line x1="0" y1="310" x2="512" y2="310" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <ellipse cx="120" cy="310" rx="110" ry="55" fill="rgba(0,0,0,0.2)"/>`,
  ui: () => `
  <rect x="80" y="140" width="352" height="200" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
  <rect x="156" y="252" width="200" height="52" rx="26" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>`,
  fx: () => {
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<line x1="${(256 + Math.cos(a) * 40).toFixed(1)}" y1="${(230 + Math.sin(a) * 40).toFixed(1)}" x2="${(256 + Math.cos(a) * (110 + (i % 3) * 20)).toFixed(1)}" y2="${(230 + Math.sin(a) * (110 + (i % 3) * 20)).toFixed(1)}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>`;
    }).join("\n  ");
    return `${rays}\n  <circle cx="256" cy="230" r="28" fill="rgba(255,255,255,0.35)" filter="url(#glow)"/>`;
  },
};

function gradientColors(type: AssetType, palette: string[]): [string, string] {
  const valid = palette.filter((c) => c && c.trim());
  if (valid.length >= 2) return [toSvgColor(valid[0]), toSvgColor(valid[valid.length - 1])];
  if (valid.length === 1) return [toSvgColor(valid[0]), TYPE_DEFAULTS[type][1]];
  return TYPE_DEFAULTS[type];
}

function toSvgColor(c: string): string {
  if (/^#[0-9A-Fa-f]{3,8}$/.test(c)) return c;
  // Single-word CSS color names work in SVG (gold, black, etc.)
  const word = c.split(/\s+/)[0].toLowerCase();
  return word;
}

function gridOverlay(): string {
  return Array.from({ length: 9 }, (_, i) => i * 64)
    .flatMap((v) => [
      `<line x1="${v}" y1="0" x2="${v}" y2="512" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`,
      `<line x1="0" y1="${v}" x2="512" y2="${v}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`,
    ])
    .join("\n  ");
}

function wrapText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const mid = text.lastIndexOf(" ", max);
  return mid > 0 ? [text.slice(0, mid), text.slice(mid + 1)] : [text.slice(0, max), text.slice(max)];
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
