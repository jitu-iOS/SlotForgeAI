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
 * Download all selected assets.
 * - 1 selected  → single PNG file download
 * - 2+ selected → ZIP containing PNGs in organised sub-folders
 */
export async function downloadSelectedAssets(
  assets: Asset[],
  gameName: string
): Promise<void> {
  const selected = assets.filter((a) => a.selected);
  if (selected.length === 0) return;

  const gameSlug = slugify(gameName || "slotforge");

  // Convert all selected SVG data URLs → PNG blobs in parallel
  const blobs = await Promise.all(
    selected.map((a) => svgDataUrlToPng(a.imageUrl))
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

function svgDataUrlToPng(dataUrl: string, size = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No 2d context")); return; }
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
        "image/png"
      );
    };

    img.onerror = () => reject(new Error(`Failed to load image: ${dataUrl.slice(0, 40)}…`));
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
