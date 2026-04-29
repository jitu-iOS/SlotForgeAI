import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getSessionUser } from "@/app/lib/auth/session";
import { badRequest } from "@/app/lib/auth/validators";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES  = 12 * 1024 * 1024; // 12 MB hard cap (10 MB + headroom for multipart overhead)
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
]);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return badRequest("Unauthenticated", 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return badRequest("No file provided");

  if (file.size > MAX_BYTES) return badRequest(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB · max ${MAX_BYTES / 1024 / 1024} MB)`, 413);
  if (!ALLOWED_MIME.has(file.type)) return badRequest(`Unsupported MIME type: ${file.type}`, 415);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ext     = pickExt(file.type, file.name);
  const fileId  = crypto.randomUUID();
  const safeBase = fileId; // never trust user filename
  const dest    = path.join(UPLOAD_DIR, `${safeBase}${ext}`);
  const buf     = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buf);

  return Response.json({
    fileId,
    filename: file.name,
    mime: file.type,
    bytes: file.size,
  });
}

function pickExt(mime: string, fname: string): string {
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png")       return ".png";
  if (mime === "image/jpeg")      return ".jpg";
  if (mime === "image/webp")      return ".webp";
  if (mime === "image/gif")       return ".gif";
  if (mime === "image/svg+xml")   return ".svg";
  const dot = fname.lastIndexOf(".");
  return dot >= 0 ? fname.slice(dot).toLowerCase() : "";
}
