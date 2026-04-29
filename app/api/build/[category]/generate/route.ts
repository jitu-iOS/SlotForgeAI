import { NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";
import { getCategory } from "@/app/lib/qa/registry";
import { expandPrompts } from "@/app/lib/qa/promptExpander";
import { generateSingleImage } from "@/app/lib/mockImageGenerator";
import { tryFreeFallback } from "@/app/lib/freeFallbacks";
import { record, classifyError } from "@/app/lib/usage/tracker";
import { nanoid } from "@/app/lib/nanoid";
import type { BuildAnswers, ExpandedAssetPrompt } from "@/app/types/build";
import type { Asset, StyleDNA } from "@/app/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface GenerateBody {
  answers: BuildAnswers;
}

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

const STUB_STYLE_DNA: StyleDNA = {
  artStyle: "production-ready brand asset",
  colorPalette: ["#0f172a", "#6366f1", "#a855f7"],
  mood: "polished",
  theme: "guided wizard build",
  lightingHints: "soft, even, well-lit",
  textureHints: "clean, modern, professional",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);

  const { category } = await params;
  const def = getCategory(category);
  if (!def) return badRequest("Unknown category", 404);

  const body = await request.json().catch(() => null) as GenerateBody | null;
  if (!body || typeof body.answers !== "object") return badRequest("Invalid body");

  // Step 1 — expand answers into one prompt per asset spec via GPT-4o-mini
  // (deterministic fallback used if OpenAI key missing or call fails).
  const referenceUrl  = typeof body.answers.referenceUrl === "string" ? body.answers.referenceUrl : undefined;
  let expanded: ExpandedAssetPrompt[];
  try {
    expanded = await expandPrompts({ category: def, answers: body.answers, referenceUrl });
    record({ provider: "openai", role: "prompt", outcome: "success", modelId: "gpt-4o-mini" });
  } catch (err) {
    record({ provider: "openai", role: "prompt", outcome: classifyError(err), modelId: "gpt-4o-mini", reason: err instanceof Error ? err.message : undefined });
    return badRequest("Prompt expansion failed", 500);
  }

  // Step 2 — generate each asset image via the existing pipeline. Failures
  // route to the free Pollinations fallback (already returns a usable image).
  const results: BuildAsset[] = await Promise.all(
    expanded.map(async (e) => {
      const stub: Asset = {
        id: nanoid(),
        type: "ui", // arbitrary — we use this struct only as a vehicle into the pipeline
        label: e.label,
        prompt: `${e.prompt}\n\nRender at exactly ${e.width}×${e.height} pixels.`,
        imageUrl: "",
        selected: true,
      };

      let asset: Asset;
      try {
        asset = await generateSingleImage(stub, STUB_STYLE_DNA);
        record({ provider: "openai", role: "image", outcome: "success" });
      } catch (err) {
        console.warn(`[build/generate] primary failed for ${e.specId}, trying free fallback`, err);
        record({ provider: "openai", role: "image", outcome: classifyError(err), reason: err instanceof Error ? err.message : undefined });
        const fb = await tryFreeFallback(stub.prompt);
        asset = fb
          ? { ...stub, imageUrl: fb.imageUrl, usedFallback: fb.fallbackId }
          : stub;
      }

      // Detect placeholder fallthrough and try the free fallback once more.
      if (!asset.imageUrl || asset.imageUrl.startsWith("data:image/svg+xml")) {
        const fb = await tryFreeFallback(stub.prompt);
        if (fb) asset = { ...asset, imageUrl: fb.imageUrl, usedFallback: fb.fallbackId };
      }

      return {
        id: asset.id,
        specId: e.specId,
        label: e.label,
        group: e.group,
        width: e.width,
        height: e.height,
        imageUrl: asset.imageUrl,
        prompt: e.prompt,
        usedFallback: asset.usedFallback,
      };
    }),
  );

  return Response.json({
    category: def.slug,
    label: def.label,
    assetCount: results.length,
    assets: results,
  });
}
