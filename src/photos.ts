// Photos, recompressed in the browser before they ever touch the file. Two
// jobs live here: the pure size math (unit-tested) and the browser encode
// (exercised end to end). Both keep the file small and every photo honest:
// what the parent sees added is exactly what round-trips back.

import type { Photo, Vault } from "./vault";

export const MAX_EDGE = 1600; // px, longest edge cap
export const JPEG_QUALITY = 0.82; // canvas re-encode quality
export const VAULT_PHOTO_BUDGET_BYTES = 20 * 1024 * 1024; // 20 MB of photo bytes

// JPEG is chosen over WebP on purpose: it decodes in every browser this file
// might be opened in two decades from now, which is the whole bet. Small and
// boring wins.

// Thrown when a chosen file is not an image, or cannot be decoded as one. The
// editor turns it into the plain "not a photo" message; it never crashes.
export class NotAnImageError extends Error {
  constructor(message = "That file is not a photo.") {
    super(message);
    this.name = "NotAnImageError";
  }
}

// The recompressed photo, without the id/caption the editor assigns.
export type RecompressedPhoto = Pick<Photo, "dataUrl" | "w" | "h" | "bytes">;

// Scale the longest edge down to maxEdge, preserving aspect ratio. Never
// upscales: an image already within maxEdge keeps its own dimensions.
export function computeTargetDimensions(
  w: number,
  h: number,
  maxEdge: number = MAX_EDGE,
): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { w: Math.round(w), h: Math.round(h) };
  const scale = maxEdge / longest;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

// Total embedded photo bytes across every entry, used for the budget.
export function vaultPhotoBytes(vault: Vault): number {
  let total = 0;
  for (const entry of vault.entries) {
    for (const photo of entry.photos ?? []) total += photo.bytes;
  }
  return total;
}

export function wouldExceedBudget(
  currentBytes: number,
  addBytes: number,
  budget: number = VAULT_PHOTO_BUDGET_BYTES,
): boolean {
  return currentBytes + addBytes > budget;
}

export function remainingBudget(
  currentBytes: number,
  budget: number = VAULT_PHOTO_BUDGET_BYTES,
): number {
  return Math.max(0, budget - currentBytes);
}

// Decoded byte length of a base64 data URL's payload. Computed, not guessed.
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const len = b64.length;
  if (len === 0) return 0;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

// Decode with createImageBitmap where available, falling back to an <img> and
// an object URL. A decode failure is treated as "not a photo".
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // fall through to the <img> path
    }
  }
  return decodeViaImage(file);
}

function decodeViaImage(file: File): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new NotAnImageError());
    };
    img.src = url;
  });
}

// Decode a chosen image, redraw it at the capped size, and re-encode as a JPEG
// data URL. Re-encoding through canvas also strips EXIF metadata, including any
// GPS location a phone camera embedded. That privacy win fits the product's
// promise: no location about a child ever rides along in the file.
export async function recompressImage(file: File): Promise<RecompressedPhoto> {
  if (!file.type.startsWith("image/")) throw new NotAnImageError();

  const decoded = await decodeImage(file);
  if (!decoded.width || !decoded.height) {
    decoded.release();
    throw new NotAnImageError();
  }

  try {
    const { w, h } = computeTargetDimensions(decoded.width, decoded.height, MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new NotAnImageError();
    ctx.drawImage(decoded.source, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!dataUrl.startsWith("data:image/jpeg")) throw new NotAnImageError();
    return { dataUrl, w, h, bytes: dataUrlByteLength(dataUrl) };
  } finally {
    decoded.release();
  }
}
