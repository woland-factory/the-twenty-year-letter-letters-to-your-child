// The self-carrying part. The app is an HTML file that can rewrite itself
// with new letters while keeping every byte of its own code identical. We do
// that by capturing the pristine shell once, before any UI mounts, and only
// ever swapping the JSON between the two marker comments.

import type { Vault } from "./vault";

export const VAULT_BEGIN = "<!--TYL:VAULT-DATA:BEGIN-->";
export const VAULT_END = "<!--TYL:VAULT-DATA:END-->";

let head: string | null = null;
let tail: string | null = null;

// Capture the shell exactly as it was parsed from disk. head is everything up
// to and including the BEGIN marker; tail is everything from the END marker
// onward. The old vault JSON between them is discarded and regenerated on
// every save, so the app code (head + tail) never changes byte for byte.
export function captureTemplate(fullHtml: string): void {
  const begin = fullHtml.indexOf(VAULT_BEGIN);
  const end = fullHtml.indexOf(VAULT_END);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(
      "This file is missing its save markers, so saving is not safe. Open your most recent copy.",
    );
  }
  head = fullHtml.slice(0, begin + VAULT_BEGIN.length);
  tail = fullHtml.slice(end);
}

// For tests: capture from an explicit string without a DOM.
export function isTemplateReady(): boolean {
  return head !== null && tail !== null;
}

// Escape every "<" so the JSON can never break out of the <script> context.
// No "</script>", "<!--", or "-->" sequence can survive this, and < is a
// valid JSON escape so the round-trip is lossless.
export function escapeForScript(json: string): string {
  return json.replace(/</g, "\\u003c");
}

// Deterministic key order so the same vault serializes to the same bytes every
// time. Known keys come first in a fixed order; any unknown fields a newer
// version wrote are appended in sorted order so they are preserved, not lost.
function ordered(obj: Record<string, unknown>, knownOrder: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of knownOrder) {
    if (key in obj) out[key] = obj[key];
  }
  for (const key of Object.keys(obj).sort()) {
    if (!knownOrder.includes(key)) out[key] = obj[key];
  }
  return out;
}

function orderPhoto(photo: Record<string, unknown>): Record<string, unknown> {
  return ordered(photo, ["id", "dataUrl", "caption", "w", "h", "bytes"]);
}

function orderSealed(sealed: Record<string, unknown>): Record<string, unknown> {
  return ordered(sealed, ["iv", "ciphertext", "keyHint", "sealedAt"]);
}

function orderEntry(entry: Record<string, unknown>): Record<string, unknown> {
  const out = ordered(entry, [
    "id",
    "type",
    "createdAt",
    "occasion",
    "title",
    "body",
    "photos",
    "childAgeYears",
    "answers",
    "sealed",
  ]);
  if (Array.isArray(out.photos)) {
    out.photos = out.photos.map((p) => orderPhoto(p as Record<string, unknown>));
  }
  if (out.sealed && typeof out.sealed === "object") {
    out.sealed = orderSealed(out.sealed as Record<string, unknown>);
  }
  return out;
}

function orderVault(vault: Vault): Record<string, unknown> {
  const base = ordered(vault as Record<string, unknown>, [
    "schemaVersion",
    "generation",
    "savedAt",
    "fileId",
    "child",
    "entries",
    "firstRunDone",
  ]);
  base.entries = (vault.entries ?? []).map((e) => orderEntry(e as Record<string, unknown>));
  return base;
}

export function serializeVaultJson(vault: Vault): string {
  return JSON.stringify(orderVault(vault));
}

// Produce the full HTML file for the given vault. Everything outside the
// vault-data block is byte-identical to what we captured on open.
export function serialize(vault: Vault): string {
  if (head === null || tail === null) {
    throw new Error("The file template was not captured, so saving is not safe.");
  }
  const json = serializeVaultJson(vault);
  return (
    head +
    '\n<script id="vault-data" type="application/json">' +
    escapeForScript(json) +
    "</script>\n" +
    tail
  );
}
