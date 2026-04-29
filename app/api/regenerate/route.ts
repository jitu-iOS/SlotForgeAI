import type { NextRequest } from "next/server";

export const maxDuration = 120;
import { rebuildSingleAsset } from "@/app/lib/promptBuilder";
import { generateMockImages } from "@/app/lib/mockImageGenerator";
import { record, classifyError } from "@/app/lib/usage/tracker";
import type { StyleDNA, AssetType } from "@/app/types";

const VALID_TYPES: AssetType[] = ["symbol_low", "symbol_high", "background", "ui", "fx"];

interface RegenerateBody {
  styleDNA: StyleDNA;
  assetId: string;
  assetType: AssetType;
  assetLabel: string;
}

export async function POST(request: NextRequest) {
  let body: RegenerateBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { styleDNA, assetId, assetType, assetLabel } = body;

  if (!styleDNA || !assetId || !assetType || !assetLabel) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(assetType)) {
    return Response.json({ error: `Invalid assetType: ${assetType}` }, { status: 400 });
  }

  try {
    const assetStub = await rebuildSingleAsset(styleDNA, assetType, assetLabel, assetId);
    const [asset] = await generateMockImages([assetStub], styleDNA);
    record({ provider: "openai", role: "image", outcome: "success" });
    return Response.json({ asset });
  } catch (err) {
    console.error("[regenerate]", err);
    record({ provider: "openai", role: "image", outcome: classifyError(err), reason: err instanceof Error ? err.message : undefined });
    return Response.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
