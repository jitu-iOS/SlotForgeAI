import type { NextRequest } from "next/server";
import { buildStyleDNA, buildPrompts } from "@/app/lib/promptBuilder";
import { generateSingleImage } from "@/app/lib/mockImageGenerator";
import { record, classifyError, type UsageOutcome } from "@/app/lib/usage/tracker";
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
  | { type: "asset_error"; id: string; label: string; message: string; code: UsageOutcome }
  | { type: "fatal"; reason: string; code: UsageOutcome; completed: number; failed: number; total: number }
  | { type: "error"; message: string }
  | { type: "done"; completed: number; failed: number; total: number };

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
        let completed = 0;
        let failed    = 0;
        let consecutiveEmptyBatches = 0;

        outer: for (let i = 0; i < stubs.length; i += BATCH) {
          const batch = stubs.slice(i, i + BATCH);

          // allSettled so a single image failure does not lose its sibling
          // successes, and does not abort subsequent batches.
          const settled = await Promise.all(
            batch.map(async (stub) => {
              try {
                const asset = await generateSingleImage(stub, styleDNA, imageModel);
                record({ provider: imgProvider, role: "image", outcome: "success", modelId: imageModel });
                return { ok: true as const, stub, asset };
              } catch (imgErr) {
                const code = classifyError(imgErr);
                const message = imgErr instanceof Error ? imgErr.message : "Image generation failed";
                record({ provider: imgProvider, role: "image", outcome: code, modelId: imageModel, reason: message });
                return { ok: false as const, stub, code, message };
              }
            })
          );

          let batchSuccesses = 0;
          let fatalCode: UsageOutcome | null = null;
          let fatalMessage = "";

          for (const r of settled) {
            if (r.ok) {
              send({ type: "asset", asset: r.asset });
              completed++;
              batchSuccesses++;
            } else {
              send({ type: "asset_error", id: r.stub.id, label: r.stub.label, message: r.message, code: r.code });
              failed++;
              // Quota / auth errors aren't isolated incidents — every subsequent
              // call will fail the same way. Bail with a clear fatal signal so
              // the client can offer failover instead of burning more attempts.
              if (r.code === "quota_exhausted" || r.code === "auth_failed") {
                fatalCode = r.code;
                fatalMessage = r.message;
              }
            }
          }

          if (fatalCode) {
            send({ type: "fatal", reason: fatalMessage, code: fatalCode, completed, failed, total: stubs.length });
            break outer;
          }

          // Two consecutive batches with zero successes → the model is dead in
          // the water (rate limited too aggressively, transient outage, etc.).
          // Stop early instead of grinding through every remaining stub.
          if (batchSuccesses === 0) {
            consecutiveEmptyBatches++;
            if (consecutiveEmptyBatches >= 2) {
              const lastFail = settled.find((r) => !r.ok) as { ok: false; code: UsageOutcome; message: string } | undefined;
              send({
                type: "fatal",
                reason: lastFail?.message ?? "Generation failing repeatedly — stopping early",
                code: lastFail?.code ?? "other_failure",
                completed, failed, total: stubs.length,
              });
              break outer;
            }
          } else {
            consecutiveEmptyBatches = 0;
          }
        }

        send({ type: "done", completed, failed, total: stubs.length });
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
