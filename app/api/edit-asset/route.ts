import type { NextRequest } from "next/server";
import OpenAI from "openai";
import type { Asset, AssetType, StyleDNA, ImageModel } from "@/app/types";
import { getProviderKey } from "@/app/lib/keys/providerKey";

export const maxDuration = 120;

interface EditBody {
  assetId: string;
  assetType: AssetType;
  assetLabel: string;
  assetPrompt: string;
  imageUrl: string;
  instruction: string;
  styleDNA: StyleDNA;
  imageModel?: ImageModel;
}

// ---------------------------------------------------------------------------
// GPT-4o-mini rewrites the prompt to incorporate the edit instruction.
// This is more reliable than images.edit() — it works with any model,
// any image format, and doesn't have file-upload requirements.
// ---------------------------------------------------------------------------
async function buildEditPrompt(
  originalPrompt: string,
  instruction: string,
  styleDNA: StyleDNA,
  apiKey: string | undefined
): Promise<string> {
  // Strip any previous edit annotations so prompts don't stack endlessly
  const basePrompt = originalPrompt
    .split(" · Edited:")[0]
    .split(" Additional requirements:")[0]
    .trim();

  if (apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content:
              "You are a slot game art director. Given an existing image prompt and an edit instruction, rewrite the prompt so the edit is fully applied. " +
              "Keep the same art style, theme, and composition constraints. " +
              "End with '2D game asset, PNG, isolated on transparent background'. " +
              "Return JSON: { \"prompt\": \"...\" }",
          },
          {
            role: "user",
            content:
              `Original prompt:\n${basePrompt}\n\n` +
              `Edit instruction: ${instruction.trim()}\n\n` +
              `Style DNA — Art style: ${styleDNA.artStyle}, Theme: ${styleDNA.theme}, ` +
              `Mood: ${styleDNA.mood}, Colors: ${styleDNA.colorPalette.slice(0, 4).join(", ")}`,
          },
        ],
      });
      const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
      if (raw.prompt?.trim()) return raw.prompt.trim();
    } catch (err) {
      console.error("[edit-asset] GPT prompt rewrite failed:", err);
    }
  }

  // Template fallback — still produces a usable prompt without the API
  return (
    `${instruction.trim()}. ` +
    `${basePrompt.slice(0, 250)}. ` +
    `Art style: ${styleDNA.artStyle}. Theme: ${styleDNA.theme}. Mood: ${styleDNA.mood}. ` +
    `Colors: ${styleDNA.colorPalette.slice(0, 3).join(", ")}. ${styleDNA.lightingHints}. ` +
    `2D game asset, PNG, isolated on transparent background.`
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: EditBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    assetId, assetType, assetLabel, assetPrompt,
    instruction, styleDNA, imageModel,
  } = body;

  if (!assetId || !instruction?.trim()) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = await getProviderKey("openai");

  // Build an AI-improved prompt that incorporates the edit instruction
  const editedPrompt = await buildEditPrompt(assetPrompt, instruction, styleDNA, apiKey);

  const stub: Asset = {
    id: assetId,
    type: assetType,
    label: assetLabel,
    prompt: editedPrompt,
    imageUrl: "",
    selected: false,
  };

  try {
    const { generateSingleImage } = await import("@/app/lib/mockImageGenerator");
    const generated = await generateSingleImage(stub, styleDNA, imageModel);

    // Return the generated asset; annotate the prompt so history shows the edit
    return Response.json({
      asset: {
        ...generated,
        prompt: `${assetPrompt.split(" · Edited:")[0]} · Edited: ${instruction.trim()}`,
      },
    });
  } catch (err) {
    console.error("[edit-asset] generation failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
