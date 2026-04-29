import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSessionUser } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";

export const runtime = "nodejs";

const ASSETS_ROOT = path.join(process.cwd(), "data", "assets");

const MIME_EXT: Record<string, string> = {
  "image/png":  ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif":  ".gif",
  "video/mp4":  ".mp4",
  "video/webm": ".webm",
};

const ALLOWED_MIMES = new Set(Object.keys(MIME_EXT));

function safeId(s: string): string {
  // Allow letters, digits, dash, underscore. Reject anything else.
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : "";
}

async function findAssetFile(projectId: string, assetId: string): Promise<{ filepath: string; mime: string } | null> {
  const dir = path.join(ASSETS_ROOT, projectId);
  for (const [mime, ext] of Object.entries(MIME_EXT)) {
    const candidate = path.join(dir, `${assetId}${ext}`);
    try {
      await fs.access(candidate);
      return { filepath: candidate, mime };
    } catch { /* try next ext */ }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; assetId: string }> },
) {
  const { projectId, assetId } = await params;
  const pid = safeId(projectId);
  const aid = safeId(assetId);
  if (!pid || !aid) return badRequest("Invalid id", 400);

  // Reads are public — assets are referenced by opaque IDs (nanoid + uuid)
  // generated client-side. No directory listing endpoint exists.
  const found = await findAssetFile(pid, aid);
  if (!found) return new Response("Not found", { status: 404 });

  const buf = await fs.readFile(found.filepath);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": found.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; assetId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);

  const { projectId, assetId } = await params;
  const pid = safeId(projectId);
  const aid = safeId(assetId);
  if (!pid || !aid) return badRequest("Invalid id", 400);

  const mime = request.headers.get("content-type") || "image/png";
  if (!ALLOWED_MIMES.has(mime)) return badRequest(`Unsupported MIME: ${mime}`, 415);

  const buf = Buffer.from(await request.arrayBuffer());
  // Hard cap: 25MB per asset (well above an MP4 short clip; protects disk).
  if (buf.byteLength > 25 * 1024 * 1024) return badRequest("Asset too large (>25MB)", 413);

  const dir = path.join(ASSETS_ROOT, pid);
  await fs.mkdir(dir, { recursive: true });

  // Remove any prior copy with a different extension so we don't keep stale
  // bytes for the same asset id under multiple MIMEs.
  for (const ext of Object.values(MIME_EXT)) {
    const candidate = path.join(dir, `${aid}${ext}`);
    try { await fs.unlink(candidate); } catch { /* ignore */ }
  }

  const ext  = MIME_EXT[mime];
  const dest = path.join(dir, `${aid}${ext}`);
  const tmp  = `${dest}.${process.pid}.tmp`;
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, dest);

  return Response.json({ ok: true, path: `/api/assets/${pid}/${aid}` });
}
