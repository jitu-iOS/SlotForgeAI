import crypto from "node:crypto";

export interface FallbackResult {
  /** data: URL of the generated image (PNG/JPEG, base64) */
  imageUrl: string;
  /** stable id of the fallback that produced the image */
  fallbackId: string;
}

export interface FallbackAdapter {
  id: string;
  name: string;
  /** True if this fallback requires no signup / no API key */
  isFree: boolean;
  priority: number; // lower = tried first
  ping: () => Promise<boolean>;
  generate: (prompt: string) => Promise<FallbackResult | null>;
}

const TIMEOUT_MS = 25_000;

async function fetchWithTimeout(url: string, init?: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Pollinations — free, no key, no signup. Image generation backend that
 * fronts FLUX / SDXL / Stable Diffusion variants. Identical prompts with the
 * same seed are server-side cached, so retries are cheap.
 */
const pollinations: FallbackAdapter = {
  id: "pollinations",
  name: "Pollinations",
  isFree: true,
  priority: 10,

  async ping() {
    try {
      const r = await fetchWithTimeout("https://image.pollinations.ai/", { method: "HEAD" }, 4000);
      return r.ok || r.status === 405; // some hosts reject HEAD with 405 but service is up
    } catch {
      return false;
    }
  },

  async generate(prompt: string) {
    const seed = crypto.createHash("sha256").update(prompt).digest()[0]; // 0–255
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`;
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") || "image/png";
      if (!ct.startsWith("image/")) return null;
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      const mime = ct.split(";")[0];
      return { imageUrl: `data:${mime};base64,${b64}`, fallbackId: pollinations.id };
    } catch {
      return null;
    }
  },
};

export const FALLBACK_REGISTRY: FallbackAdapter[] = [pollinations].sort((a, b) => a.priority - b.priority);

/**
 * Try each registered fallback in priority order until one returns an image.
 * Caller is responsible for checking health beforehand if it wants to skip
 * known-down adapters; this function just tries them sequentially.
 */
export async function tryFreeFallback(prompt: string): Promise<FallbackResult | null> {
  for (const adapter of FALLBACK_REGISTRY) {
    try {
      const result = await adapter.generate(prompt);
      if (result) return result;
    } catch (err) {
      console.warn(`[fallback:${adapter.id}] generate threw:`, err);
    }
  }
  return null;
}

export function getFallbackById(id: string): FallbackAdapter | null {
  return FALLBACK_REGISTRY.find((a) => a.id === id) ?? null;
}
