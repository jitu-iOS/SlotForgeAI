import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { getProviderKey } from "@/app/lib/keys/providerKey";

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

  let body: { form: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { form } = body;

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

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You are a senior slot game art director and creative consultant. " +
            "Given a partial game brief, fill in ALL the missing fields with specific, evocative, " +
            "industry-accurate values that are consistent with each other and with the provided context. " +
            "Be concise (under 12 words per field) but highly specific. " +
            "Return a single JSON object with exactly the keys listed in the user message.",
        },
        {
          role: "user",
          content:
            (filledContext
              ? `Current brief context:\n${filledContext}\n\n`
              : "(No fields filled yet — suggest a complete brief for a compelling slot game)\n\n") +
            `Fill in these missing fields:\n{\n${fieldSpec}\n}`,
        },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}") as Record<string, string>;

    // Only return values for fields that were requested
    const suggestions: Record<string, string> = {};
    for (const key of emptyFields) {
      if (raw[key]?.trim()) suggestions[key] = raw[key].trim();
    }

    return Response.json({ suggestions });
  } catch (err) {
    console.error("[suggest-all]", err);
    return Response.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
