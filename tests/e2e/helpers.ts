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

// Extract the vault JSON from a serialized artifact string.
export function extractVaultJson(html: string): string {
  const m = html.match(/<script id="vault-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no vault-data block");
  return m[1];
}
