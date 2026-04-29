import OpenAI from "openai";
import type { BuildAnswers, BuildCategoryDef, ExpandedAssetPrompt, AssetSpec } from "@/app/types/build";
import { getProviderKey } from "@/app/lib/keys/providerKey";

const SYSTEM_PROMPT = `You are an expert visual designer and prompt engineer. You are given:
1. A build category definition with a list of asset specifications (each with id, label, group, width × height, format, optional dpi/notes).
2. A set of user-provided answers from a guided survey (key/value).
3. Optionally a reference URL or extracted text from a reference PDF.

Your job: produce ONE generation-ready prompt for EACH asset specification. The prompts must:
- Honor the user's stated visual style, color palette, theme, persona, brand keywords, and tone.
- Mention the exact dimensions in a "Render at WIDTH×HEIGHT" hint.
- Be self-contained — assume the image model has no other context about the project.
- Reflect production-ready intent (clean composition, brand-consistent, output-ready).
- Avoid anything in the user's "avoid" list.

Output STRICT JSON: { "prompts": [ { "specId": "<id>", "prompt": "<one-paragraph prompt>" }, ... ] }
One entry per spec, in the same order. No extra commentary outside the JSON.`;

let _client: { key: string; client: OpenAI } | null = null;

async function getClient(): Promise<OpenAI | null> {
  const key = await getProviderKey("openai");
  if (!key) { _client = null; return null; }
  if (_client && _client.key === key) return _client.client;
  _client = { key, client: new OpenAI({ apiKey: key }) };
  return _client.client;
}

interface ExpanderInput {
  category: BuildCategoryDef;
  answers: BuildAnswers;
  referenceUrl?: string;
  referenceText?: string;
}

function userMessage(input: ExpanderInput): string {
  const { category, answers, referenceUrl, referenceText } = input;

  const specsBlock = category.assets.map((s) => `- ${s.id} | ${s.label} | ${s.group} | ${s.width}×${s.height} ${s.format}${s.dpi ? ` @${s.dpi}dpi` : ""}${s.notes ? ` | notes: ${s.notes}` : ""}`).join("\n");

  const answersBlock = Object.entries(answers).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `- ${k}: ${formatAnswer(v)}`)
    .join("\n");

  return [
    `Category: ${category.label}`,
    `Tagline: ${category.tagline}`,
    "",
    "Asset specifications (one prompt per entry, in this order):",
    specsBlock,
    "",
    "User answers:",
    answersBlock,
    referenceUrl ? `\nReference URL: ${referenceUrl}` : "",
    referenceText ? `\nReference text (extracted from upload):\n${referenceText.slice(0, 4000)}` : "",
    "",
    "Return STRICT JSON as specified. One prompt per spec, in order.",
  ].filter(Boolean).join("\n");
}

function formatAnswer(v: unknown): string {
  if (Array.isArray(v))    return v.join(", ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (v && typeof v === "object" && "filename" in (v as object)) {
    const f = v as { filename: string; bytes: number };
    return `[uploaded ${f.filename}, ${f.bytes} bytes]`;
  }
  return String(v ?? "");
}

// Fallback: a deterministic per-asset prompt builder used when the AI client
// is unavailable. Less rich but always works (so the wizard never dead-ends).
function fallbackPrompts(input: ExpanderInput): ExpandedAssetPrompt[] {
  const { category, answers } = input;
  const style = (answers.visualStyle ?? answers.artStyle ?? "modern minimal") as string;
  const palette = (answers.palette ?? answers.colorTheme ?? "balanced palette") as string;
  const subject = (answers.coreFunction ?? answers.setting ?? answers.title ?? answers.appName ?? category.label) as string;

  return category.assets.map((s) => ({
    specId: s.id,
    label: s.label,
    group: s.group,
    width: s.width,
    height: s.height,
    prompt: `${s.label} for "${subject}". Visual style: ${style}. Color treatment: ${palette}. ${s.notes ?? ""} Render at ${s.width}×${s.height} ${s.format.toUpperCase()}${s.dpi ? ` at ${s.dpi}dpi` : ""}. Production-ready, clean composition, brand-consistent.`,
  }));
}

export async function expandPrompts(input: ExpanderInput): Promise<ExpandedAssetPrompt[]> {
  const client = await getClient();
  if (!client) {
    console.warn("[promptExpander] OpenAI key missing — using fallback per-asset prompts");
    return fallbackPrompts(input);
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage(input) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { prompts?: { specId: string; prompt: string }[] };
    const promptMap = new Map<string, string>((parsed.prompts ?? []).map((p) => [p.specId, p.prompt]));

    return input.category.assets.map((s: AssetSpec) => ({
      specId: s.id,
      label: s.label,
      group: s.group,
      width: s.width,
      height: s.height,
      prompt: promptMap.get(s.id) ?? fallbackPrompts(input).find((p) => p.specId === s.id)!.prompt,
    }));
  } catch (err) {
    console.error("[promptExpander] OpenAI call failed:", err);
    return fallbackPrompts(input);
  }
}
