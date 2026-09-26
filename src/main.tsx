import { render } from "preact";
import { captureTemplate } from "./template";
import { parseVault, VaultParseError, type Vault } from "./vault";
import { SaveController } from "./save";
import { App } from "./ui/App";
import { ErrorState } from "./ui/states";
import { isDemoRequested, sampleVault } from "./sample";
import "./styles.css";

const root = document.getElementById("app");

// Capture the pristine shell FIRST, before any UI mounts into #app, so the
// saved file never carries app-injected DOM. If the markers are gone, saving
// would be unsafe, so we surface the error instead of rendering.
try {
  captureTemplate("<!DOCTYPE html>\n" + document.documentElement.outerHTML);
} catch {
  if (root)
    render(
      <ErrorState
        heading="We can't safely save this file."
        body="Open your most recent copy to keep going. Your file on disk is unchanged."
      />,
      root,
    );
  throw new Error("Template capture failed");
}

function readVaultText(): string {
  const el = document.getElementById("vault-data");
  return el?.textContent ?? "";
}

function boot() {
  if (!root) return;

  let vault: Vault;
  try {
    vault = parseVault(readVaultText());
  } catch (err) {
    const newer = err instanceof VaultParseError && err.kind === "newer-version";
    render(
      <ErrorState
        heading={
          newer
            ? "This file was saved by a newer version."
            : "We can't read the letters in this file."
        }
        body={
          newer
            ? "Open it with your newest copy of the app. Your file on disk is unchanged."
            : "Your file on disk is unchanged. Open your most recent copy to keep going."
        }
      />,
      root,
    );
    return;
  }

  // Live demo only: seed the sample letter when the vault is empty and the URL
  // asks for it. A downloaded file has no such flag, so it never self-seeds.
  if (vault.entries.length === 0 && isDemoRequested()) {
    vault = sampleVault();
  }

  const controller = new SaveController(vault.generation);
  render(<App initialVault={vault} controller={controller} />, root);
}

boot();
