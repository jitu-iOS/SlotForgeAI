import type { NextRequest } from "next/server";
import { buildStyleDNA, buildPrompts } from "@/app/lib/promptBuilder";
import { generateSingleImage } from "@/app/lib/mockImageGenerator";
import { record, classifyError } from "@/app/lib/usage/tracker";
import type { ProjectForm, Asset, StyleDNA, ImageModel, SlotType } from "@/app/types";

function inferProvider(model?: string): string {
  if (!model || model === "gpt-image-1" || model === "dall-e-3") return "openai";
  if (model.includes("imagineart")) return "imagineart";
  if (model.includes("pollinations") || model.includes("free")) return "free";
  if (model.includes("runway")) return "runway";
  return "replicate";
}

export const maxDuration = 300;

type GenerateBody = ProjectForm & { imageModel?: ImageModel; slotType?: SlotType; promptModel?: string };

type SSEEvent =
  | { type: "init"; styleDNA: StyleDNA; assets: Asset[] }
  | { type: "asset"; asset: Asset }
  | { type: "error"; message: string }
  | { type: "done" };

export async function POST(request: NextRequest) {
  let body: GenerateBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const missing = validate(body);
  if (missing.length > 0) {
    return Response.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const imageModel  = body.imageModel;
  const slotType    = body.slotType;
  const promptModel = body.promptModel;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      let promptRecorded = false;
      try {
        const styleDNA = await buildStyleDNA(body, slotType, promptModel);
        const stubs    = await buildPrompts(body, styleDNA, slotType, promptModel);
        record({ provider: "openai", role: "prompt", outcome: "success", modelId: promptModel });
        promptRecorded = true;

        send({ type: "init", styleDNA, assets: stubs });

        const imgProvider = inferProvider(imageModel);
        const BATCH = 3;
        for (let i = 0; i < stubs.length; i += BATCH) {
          const batch = stubs.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.map(async (stub) => {
              try {
                const asset = await generateSingleImage(stub, styleDNA, imageModel);
                record({ provider: imgProvider, role: "image", outcome: "success", modelId: imageModel });
                return asset;
              } catch (imgErr) {
                record({ provider: imgProvider, role: "image", outcome: classifyError(imgErr), modelId: imageModel, reason: imgErr instanceof Error ? imgErr.message : undefined });
                throw imgErr;
              }
            })
          );
          for (const asset of results) {
            send({ type: "asset", asset });
          }
        }

        send({ type: "done" });
      } catch (err) {
        if (!promptRecorded) {
          record({ provider: "openai", role: "prompt", outcome: classifyError(err), modelId: promptModel, reason: err instanceof Error ? err.message : undefined });
        }
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

function validate(body: GenerateBody): string[] {
  const missing: string[] = [];
  if (!body?.gameName?.trim())    missing.push("gameName");
  if (!body?.theme?.trim())       missing.push("theme");
  if (!body?.assetTypes?.length)  missing.push("assetTypes");
  return missing;
}
