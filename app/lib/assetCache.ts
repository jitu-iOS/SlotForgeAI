// Server-side asset cache helpers. After every project save, we fire-and-
// forget an upload of each asset's bytes to /api/assets/<projectId>/<assetId>.
// On restore, if an asset's imageUrl is missing (e.g. IndexedDB cleared,
// different browser, partial save), the fallback URL points at the server
// cache so the <img> tag can still render the image.

export function assetCacheUrl(projectId: string, assetId: string): string {
  return `/api/assets/${encodeURIComponent(projectId)}/${encodeURIComponent(assetId)}`;
}

/**
 * Fire-and-forget upload of one asset's bytes to the server cache. Accepts
 * a data: URL (the format our generation pipeline returns). Network failures
 * are swallowed — the asset is still in IndexedDB; this is a backstop only.
 */
export async function uploadAssetToServerCache(
  projectId: string,
  assetId: string,
  imageDataUrl: string,
): Promise<void> {
  try {
    if (!imageDataUrl || !imageDataUrl.startsWith("data:")) return;

    // Parse data: URL into MIME + bytes. Format is `data:<mime>;base64,<b64>`.
    const commaIdx = imageDataUrl.indexOf(",");
    if (commaIdx < 0) return;
    const header = imageDataUrl.slice(5, commaIdx);
    const b64    = imageDataUrl.slice(commaIdx + 1);
    const mime   = header.split(";")[0] || "image/png";

    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const res = await fetch(assetCacheUrl(projectId, assetId), {
      method: "PUT",
      headers: { "Content-Type": mime },
      body: bin.buffer as ArrayBuffer,
    });
    if (!res.ok) {
      // Don't throw — caller doesn't await this.
      console.warn(`[assetCache] upload failed for ${projectId}/${assetId}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[assetCache] upload threw for ${projectId}/${assetId}:`, err);
  }
}

/**
 * Best-effort upload of every asset in a project. Returns a Promise that
 * resolves when all uploads complete (or fail). Caller can ignore — uploads
 * never block save.
 */
export async function uploadProjectAssets(projectId: string, assets: { id: string; imageUrl: string }[]): Promise<void> {
  await Promise.all(
    assets
      .filter((a) => a.imageUrl?.startsWith("data:"))
      .map((a) => uploadAssetToServerCache(projectId, a.id, a.imageUrl)),
  );
}
