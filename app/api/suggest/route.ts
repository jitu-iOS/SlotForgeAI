import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { getProviderKey } from "@/app/lib/keys/providerKey";

const FIELD_META: Record<string, { label: string; hint: string }> = {
  gameName:      { label: "Game Title",       hint: "Name of the slot game" },
  theme:         { label: "Theme",             hint: "Core theme and world of the slot" },
  targetAudience:{ label: "Target Audience",   hint: "Player type, region, spending profile" },
  emotionalTone: { label: "Emotional Tone",    hint: "Mood and emotional quality of visuals" },
  artStyle:      { label: "Art Style",         hint: "Overall visual rendering style" },
  lightingStyle: { label: "Lighting Style",    hint: "Lighting behavior and atmosphere" },
  colorPalette:  { label: "Color Palette",     hint: "Primary and accent colors" },
  resolution:    { label: "Resolution",        hint: "Asset output size in pixels" },
  aspectRatio:   { label: "Aspect Ratio",      hint: "Canvas proportion and target platform" },
  safeArea:      { label: "Safe Area",         hint: "UI-safe margins to keep clear" },
  backgroundType:{ label: "Background Type",   hint: "Static, animated, or layered" },
  environment:   { label: "Environment",       hint: "Scene setting and world details" },
  motionElements:{ label: "Motion Elements",   hint: "Background animated effects" },
  symbolStyle:   { label: "Symbol Style",      hint: "Visual design language for all symbols" },
  highSymbols:   { label: "High Symbols",      hint: "Premium thematic icons on the reels" },
  wildSymbol:    { label: "Wild Symbol",       hint: "Special wild symbol design" },
  scatterSymbol: { label: "Scatter Symbol",    hint: "Bonus-trigger scatter symbol design" },
  animationStyle:{ label: "Animation Style",   hint: "Motion feel and animation character" },
  winEffects:    { label: "Win Effects",       hint: "Visual feedback on winning combinations" },
  particles:     { label: "Particles",         hint: "Particle FX style and behaviour" },
  fileFormat:    { label: "File Format",       hint: "Output format and transparency needs" },
  atlasReady:    { label: "Atlas Ready",       hint: "Game engine sprite atlas compatibility" },
  sharpness:     { label: "Sharpness",         hint: "Detail level and edge crispness" },
  consistency:   { label: "Consistency",       hint: "Visual uniformity across all assets" },
  negativePrompt:{ label: "Negative Prompt",   hint: "Elements to explicitly exclude" },
};

export async function POST(request: NextRequest) {
  const apiKey = await getProviderKey("openai");
  if (!apiKey) {
    return Response.json({ error: "No API key configured" }, { status: 503 });
  }

  let body: { field: string; form: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { field, form } = body;
  const meta = FIELD_META[field];
  if (!meta) {
    return Response.json({ error: "Unknown field" }, { status: 400 });
  }

  const contextLines = Object.entries(form)
    .filter(([k, v]) => k !== field && typeof v === "string" && v.trim())
    .map(([k, v]) => `${FIELD_META[k]?.label ?? k}: ${v}`)
    .join("\n");

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "You are a senior slot game art director and creative consultant. " +
            "Given a partial game brief, suggest a concise, evocative, and industry-accurate value for the requested field. " +
            "Be specific — avoid generic phrases. Keep it under 15 words. " +
            'Return JSON: { "suggestion": "..." }',
        },
        {
          role: "user",
          content:
            `Field: "${meta.label}" — ${meta.hint}\n\n` +
            (contextLines
              ? `Current brief:\n${contextLines}`
              : "(no other fields filled yet — suggest a creative default)"),
        },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    return Response.json({ suggestion: raw.suggestion ?? "" });
  } catch (err) {
    console.error("[suggest]", err);

    // Extract structured info from OpenAI SDK errors so the UI can show why
    const e = err as {
      status?: number;
      code?: string;
      message?: string;
      headers?: Record<string, string> | Headers;
    };
    const status = e.status ?? 500;
    const code = e.code ?? "unknown_error";
    const message = e.message ?? "Suggestion failed";

    // OpenAI sets `retry-after` (seconds) on rate-limit responses
    let retryAfterSec: number | undefined;
    const retryRaw =
      e.headers instanceof Headers ? e.headers.get("retry-after") : e.headers?.["retry-after"];
    if (retryRaw) {
      const n = Number(retryRaw);
      if (!Number.isNaN(n) && n > 0) retryAfterSec = n;
    }
    // Fallback: parse "Please try again in 1.234s" from the message
    if (retryAfterSec === undefined && message) {
      const m = message.match(/try again in ([\d.]+)\s*(ms|s|m)/i);
      if (m) {
        const v = Number(m[1]);
        const unit = m[2].toLowerCase();
        retryAfterSec = unit === "ms" ? v / 1000 : unit === "m" ? v * 60 : v;
      }
    }

    const retryAt =
      retryAfterSec !== undefined
        ? new Date(Date.now() + retryAfterSec * 1000).toISOString()
        : undefined;

    return Response.json(
      { error: message, code, retryAfterSec, retryAt },
      { status }
    );
  }
}
