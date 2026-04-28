import type { ProviderName } from "./vault";

const TIMEOUT_MS = 5000;

interface TestResult {
  ok: boolean;
  message: string;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function testProviderKey(provider: ProviderName, key: string): Promise<TestResult> {
  if (!key || key.trim().length < 8) return { ok: false, message: "Key is empty or too short." };

  try {
    if (provider === "openai") {
      const r = await fetchWithTimeout("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (r.ok) return { ok: true, message: "OpenAI accepted the key." };
      if (r.status === 401) return { ok: false, message: "OpenAI rejected the key (401)." };
      return { ok: false, message: `OpenAI returned ${r.status}.` };
    }
    if (provider === "replicate") {
      const r = await fetchWithTimeout("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Token ${key}` },
      });
      if (r.ok) return { ok: true, message: "Replicate accepted the token." };
      if (r.status === 401) return { ok: false, message: "Replicate rejected the token (401)." };
      return { ok: false, message: `Replicate returned ${r.status}.` };
    }
    if (provider === "runway") {
      const r = await fetchWithTimeout("https://api.dev.runwayml.com/v1/organization", {
        headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": "2024-09-13" },
      });
      if (r.ok) return { ok: true, message: "Runway accepted the key." };
      if (r.status === 401 || r.status === 403) return { ok: false, message: `Runway rejected the key (${r.status}).` };
      return { ok: true, message: `Runway returned ${r.status} — saved (no canonical health check).` };
    }
    if (provider === "imagineart") {
      // No documented "ping" endpoint; do a tiny no-op request to the generation endpoint
      // with an obviously-empty body so we just learn whether the auth header is accepted.
      const fd = new FormData();
      fd.append("prompt", "test");
      fd.append("style", "realistic");
      fd.append("aspect_ratio", "1:1");
      const r = await fetchWithTimeout("https://api.vyro.ai/v2/image/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: fd,
      });
      if (r.status === 401 || r.status === 403) return { ok: false, message: `Imagine Art rejected the key (${r.status}).` };
      // 200 OK or 4xx that's NOT auth-related means the key is accepted (the request body may be wrong but auth passed).
      return { ok: true, message: r.ok ? "Imagine Art accepted the key." : `Imagine Art accepted the key (returned ${r.status} for the test prompt).` };
    }
    return { ok: false, message: "Unknown provider." };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError") return { ok: false, message: `Provider check timed out after ${TIMEOUT_MS / 1000}s.` };
    return { ok: false, message: e?.message || "Network error during provider check." };
  }
}
