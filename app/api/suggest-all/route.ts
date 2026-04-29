import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { getProviderKey } from "@/app/lib/keys/providerKey";
import { resolvePromptModel } from "@/app/lib/aiRoles";
import { record, classifyError } from "@/app/lib/usage/tracker";
import { pickInnovativeSeed, ANTI_CLICHE_GUARD } from "@/app/lib/innovativeSlotSeeds";

const FIELD_HINTS: Record<string, string> = {
  theme:          "Core theme and world of the slot (e.g. Egyptian luxury mystical)",
  targetAudience: "Player type and region (e.g. high-spender, US audience)",
  emotionalTone:  "Mood and emotional quality of visuals (e.g. luxurious, glowing, mysterious)",
  artStyle:       "Overall visual rendering style (e.g. semi-realistic 3D glossy)",
  lightingStyle:  "Lighting behavior and atmosphere (e.g. high contrast cinematic)",
  colorPalette:   "Primary and accent colours — list 3-5 (e.g. gold, black, deep red)",
  resolution:     "Asset output size (e.g. 4096×4096 ultra HD)",
  aspectRatio:    "Canvas proportion (e.g. 1:1 optimized for mobile)",
  safeArea:       "UI-safe margins (e.g. 10% padding all sides)",
  backgroundType: "Static or layered (e.g. layered with parallax)",
  environment:    "Scene setting and details (e.g. ancient temple with glowing hieroglyphs)",
  motionElements: "Animated background effects (e.g. fog, light beams, particles)",
  symbolStyle:    "Visual design of reel symbols (e.g. 3D glossy icons)",
  highSymbols:    "Premium thematic icons on reels (e.g. Egyptian gods — Anubis, Ra, Horus)",
  wildSymbol:     "Wild symbol design (e.g. golden scarab glowing with energy)",
  scatterSymbol:  "Scatter bonus-trigger symbol (e.g. ornate Pharaoh mask)",
  animationStyle: "Motion feel (e.g. juicy exaggerated, snappy)",
  winEffects:     "Win feedback visuals (e.g. coin explosion, golden glow burst)",
  particles:      "Particle FX style (e.g. golden sparkles drifting upward)",
  fileFormat:     "Output type (e.g. PNG with transparency)",
  atlasReady:     "Game engine sprite atlas compatibility (e.g. yes, sprite atlas ready)",
  sharpness:      "Detail level requirement (e.g. ultra sharp, no blur)",
  consistency:    "Visual uniformity across assets (e.g. strict)",
  negativePrompt: "What to explicitly avoid (e.g. no blur, no watermark, no distortion)",
};

export async function POST(request: NextRequest) {
  const apiKey = await getProviderKey("openai");
  if (!apiKey) {
    return Response.json({ error: "No API key configured" }, { status: 503 });
  }

  let body: { form: Record<string, string>; promptModel?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { form } = body;
  const model = resolvePromptModel(body.promptModel);

  // Determine which fields need to be filled (empty in the current form)
  const emptyFields = Object.keys(FIELD_HINTS).filter(
    (k) => !form[k]?.trim()
  );

  // If nothing is empty, return empty suggestions
  if (emptyFields.length === 0) {
    return Response.json({ suggestions: {} });
  }

  // Build context from already-filled fields
  const filledContext = Object.entries(form)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${FIELD_HINTS[k] ? k : k}: ${v}`)
    .join("\n");

  // Build a JSON schema spec listing every field that needs filling
  const fieldSpec = emptyFields
    .map((k) => `  "${k}": "..." // ${FIELD_HINTS[k]}`)
    .join("\n");

  const client = new OpenAI({ apiKey });

  // Diversity controls — when the user has given little/no context, GPT-4o-mini
  // collapses to the same Egyptian/treasure default brief every time. Inject a
  // randomly-chosen creative seed and raise temperature so each empty Fill All
  // produces something fresh. When the user has filled key fields, keep
  // temperature low so suggestions cohere with their choices.
  const filledKeyFields = ["theme", "gameName", "targetAudience", "artStyle"]
    .filter((k) => form[k]?.trim()).length;
  const isSparse  = filledKeyFields <= 1;          // 0 or 1 key fields filled
  const seed      = isSparse ? pickInnovativeSeed() : null;
  const nonce     = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const temperature = isSparse ? 1.05 : 0.7;

  const systemContent = isSparse
    ? "You are a senior slot game art director who tracks the 2026 global market for innovative, trending slot themes. " +
      "Given a creative seed, build a complete, specific, on-trend slot brief — every field must reinforce the seed's mood and audience. " +
      "Be concise (under 12 words per field) but highly specific and surprising. Avoid generic phrasing. " +
      `${ANTI_CLICHE_GUARD} ` +
      "Return a single JSON object with exactly the keys listed in the user message."
    : "You are a senior slot game art director and creative consultant. " +
      "Given a partial game brief, fill in ALL the missing fields with specific, evocative, industry-accurate values that " +
      "are consistent with each other and with the user's existing choices. Align tightly to what the user has already typed. " +
      "Be concise (under 12 words per field) but highly specific. " +
      "Return a single JSON object with exactly the keys listed in the user message.";

  const userContent = (() => {
    const parts: string[] = [];
    if (seed) {
      parts.push(`Creative seed (anchor every suggestion to this — produce something distinct, current, and globally appealing):`);
      parts.push(`  Pitch:    ${seed.pitch}`);
      parts.push(`  Audience: ${seed.audience}`);
      parts.push(`  Vibe:     ${seed.vibe}`);
      parts.push("");
    }
    if (filledContext) {
      parts.push("User's existing choices (treat as canonical — extend, do not contradict):");
      parts.push(filledContext);
      parts.push("");
    }
    parts.push(`Fill in these missing fields:\n{\n${fieldSpec}\n}`);
    parts.push(`\nrequest_nonce: ${nonce}`);
    return parts.join("\n");
  })();

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature,
      messages: [
        { role: "system", content: systemContent },
        { role: "user",   content: userContent },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}") as Record<string, string>;

    // Only return values for fields that were requested
    const suggestions: Record<string, string> = {};
    for (const key of emptyFields) {
      if (raw[key]?.trim()) suggestions[key] = raw[key].trim();
    }

    record({ provider: "openai", role: "prompt", outcome: "success", modelId: model });
    return Response.json({ suggestions });
  } catch (err) {
    console.error("[suggest-all]", err);
    const e = err as { status?: number; message?: string };
    record({ provider: "openai", role: "prompt", outcome: classifyError(err, e.status), modelId: model, reason: e.message });
    return Response.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
