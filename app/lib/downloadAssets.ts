import JSZip from "jszip";
import type { Asset, AssetType } from "@/app/types";

// Folder layout inside the ZIP
const TYPE_FOLDERS: Record<AssetType, string> = {
  symbol_high: "symbols/high",
  symbol_low:  "symbols/low",
  background:  "background",
  ui:          "ui",
  fx:          "fx",
};

/**
 * Download all selected assets as PNGs.
 * - 1 selected  → single PNG file
 * - 2+ selected → ZIP with PNGs organised into sub-folders
 * Respects each asset's `transparentBg` flag:
 *   - true (default) → preserve alpha channel (transparent PNG)
 *   - false          → composite onto white before saving
 */
export async function downloadSelectedAssets(
  assets: Asset[],
  gameName: string
): Promise<void> {
  const selected = assets.filter((a) => a.selected);
  if (selected.length === 0) return;

  const gameSlug = slugify(gameName || "slotforge");

  const blobs = await Promise.all(
    selected.map((a) => imageUrlToPng(a.imageUrl, a.transparentBg !== false))
  );

  if (selected.length === 1) {
    downloadBlob(blobs[0], `${slugify(selected[0].label)}.png`);
    return;
  }

  // Build ZIP
  const zip = new JSZip();
  const root = zip.folder(`${gameSlug}-assets`)!;

  selected.forEach((asset, i) => {
    const folderPath = TYPE_FOLDERS[asset.type];
    const filename = `${slugify(asset.label)}.png`;
    root.folder(folderPath)!.file(filename, blobs[i]);
  });

  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  downloadBlob(zipBlob, `${gameSlug}-assets.zip`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decode any image data URL (PNG, JPEG, SVG, base64) into a PNG Blob.
 * transparent = true  → draw on a clear canvas → preserves alpha channel
 * transparent = false → fill white first → opaque output
 */
function imageUrlToPng(dataUrl: string, transparent: boolean, size = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!dataUrl) { reject(new Error("Empty image URL")); return; }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No 2d context")); return; }

      if (!transparent) {
        // Solid white background so the saved PNG has no alpha
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
      }
      // ctx starts fully transparent by default — transparent PNGs keep their alpha

      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
        "image/png"
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so the browser has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
