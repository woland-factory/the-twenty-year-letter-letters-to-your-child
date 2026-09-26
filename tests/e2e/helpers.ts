import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import type { Page } from "@playwright/test";

// The built artifact on disk. The webServer build step produces it before any
// test runs.
export const ARTIFACT_PATH = join(process.cwd(), "dist", "index.html");
export const ARTIFACT_URL = pathToFileURL(ARTIFACT_PATH).href;

// Installs a working in-memory File System Access API so the real Chromium save
// path (pick, re-read, generation compare, write) runs headlessly against a
// simulated file. window.__tylDisk holds the "file on disk".
export const MOCK_FSA = `
  window.__tylDisk = "";
  window.showSaveFilePicker = async () => ({
    getFile: async () => ({ text: async () => window.__tylDisk }),
    createWritable: async () => ({
      write: async (data) => { window.__tylDisk = data; },
      close: async () => {},
    }),
  });
`;

// Extract the real vault JSON from a serialized artifact. The app's own source
// is inlined into the file and mentions the vault-data markers as text, so we
// pick the block whose content actually parses as JSON.
export function extractVaultJson(html: string): string {
  const re = /<script id="vault-data"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      JSON.parse(m[1]);
      return m[1];
    } catch {
      // not the real vault block; keep looking
    }
  }
  throw new Error("no valid vault-data block");
}

// A real, decodable tiny JPEG data URL (the same warm gradient used for the
// live demo) for seeding entries whose thumbnails a test needs to render.
export const VALID_JPEG_DATA_URL =
  "data:image/jpeg;base64,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";

// Write a copy of the built artifact seeded with a given vault, so a test can
// open a file:// URL that already carries entries and photos. Replaces the real
// vault-data block (the one whose content starts with {"schemaVersion).
export function writeSeededArtifact(vault: unknown, tag: string): string {
  const html = readFileSync(ARTIFACT_PATH, "utf8");
  const json = JSON.stringify(vault).replace(/</g, "\\u003c");
  const seeded = html.replace(
    /(<script id="vault-data"[^>]*>)\{"schemaVersion[\s\S]*?(<\/script>)/,
    `$1${json}$2`,
  );
  if (seeded === html) throw new Error("seed did not apply");
  const path = join(tmpdir(), `tyl-seed-${tag}-${Date.now()}.html`);
  writeFileSync(path, seeded);
  return pathToFileURL(path).href;
}

// Generate an image in the browser and hand it to the editor's file input the
// way a real picker would. Returns the source byte size so a test can prove the
// recompressed result is smaller. A non-image type exercises the reject path.
export async function attachGeneratedImage(
  page: Page,
  opts: { width: number; height: number; name?: string; mimeType?: string },
): Promise<number> {
  return page.evaluate(
    async ({ width, height, name, mimeType }) => {
      const type = mimeType ?? "image/png";
      let file: File;
      if (!type.startsWith("image/")) {
        file = new File(["not an image at all"], name ?? "notes.txt", { type });
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#cc3344");
        grad.addColorStop(1, "#3399cc");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        // Speckle so the source has real detail and compresses to a real size.
        for (let i = 0; i < 4000; i++) {
          ctx.fillStyle = `rgb(${(i * 7) % 255},${(i * 13) % 255},${(i * 29) % 255})`;
          ctx.fillRect((i * 17) % width, (i * 31) % height, 4, 4);
        }
        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), type),
        );
        file = new File([blob], name ?? "photo.png", { type });
      }
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return file.size;
    },
    { width: opts.width, height: opts.height, name: opts.name, mimeType: opts.mimeType },
  );
}
