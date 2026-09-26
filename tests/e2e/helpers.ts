import { join } from "node:path";
import { pathToFileURL } from "node:url";

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
