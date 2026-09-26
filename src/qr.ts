// The QR side of the paper key. Encode renders the 24-word phrase to a crisp
// inline SVG for print; decode reads a photo of that sheet back to the same
// phrase. Both unseal paths (typed words, scanned QR) converge on words, so
// there is only ever one decryption path. All local: no network, no WASM.

import qrcode from "qrcode-generator";
import jsQR from "jsqr";

const QUIET_ZONE = 4; // modules of margin, the QR standard

// Thrown when a chosen image holds no readable code. The caller shows the calm
// "try a clearer photo" message; nothing else happens.
export class QrDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrDecodeError";
  }
}

// Deterministic: the same text always yields the same SVG. Medium error
// correction leaves the code scannable after a fold or a smudge on paper. The
// SVG is one black path on a white ground so it prints and scans cleanly.
export function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = count + QUIET_ZONE * 2;

  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `shape-rendering="crispEdges" width="100%" height="100%">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  );
}

// Draw the chosen image onto a canvas and read its pixels back for jsQR. Uses
// createImageBitmap where available, falling back to an <img> and an object URL.
// Both are local; the CSP already allows img-src blob:.
async function imageDataFromFile(file: File): Promise<ImageData> {
  let width: number;
  let height: number;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new QrDecodeError("This browser cannot read the code.");

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
  } else {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new QrDecodeError("This image could not be opened."));
        el.src = url;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return ctx.getImageData(0, 0, width, height);
}

// Decode the QR in a photo of the key sheet to its text (the 24 words). Throws
// QrDecodeError when no code is found so the caller can guide the parent to a
// clearer photo.
export async function decodeQrFromFile(file: File): Promise<string> {
  const image = await imageDataFromFile(file);
  const result = jsQR(image.data, image.width, image.height);
  if (!result || !result.data) {
    throw new QrDecodeError("No code was found in that image.");
  }
  return result.data;
}
