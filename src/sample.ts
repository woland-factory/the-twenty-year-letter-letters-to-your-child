// One inert sample letter for the live demo only. It loads only when the vault
// is empty and the page URL carries ?demo=1, so a downloaded file never seeds
// itself with someone else's letter.

import type { Vault } from "./vault";
import { SCHEMA_VERSION } from "./vault";

export function sampleVault(): Vault {
  return {
    schemaVersion: SCHEMA_VERSION,
    generation: 3,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "sample-demo-file",
    child: { name: "Mira", birthDate: "2026-01-08" },
    entries: [
      {
        id: "sample-letter-1",
        type: "letter",
        createdAt: "2026-03-03T21:10:00.000Z",
        title: "The night you came home",
        body:
          "Mira,\n\nYou slept the whole drive back, one hand curled around my finger. " +
          "The house felt different with you in it, quieter and fuller at the same time.\n\n" +
          "I am writing these down so that one day you can read them in your own voice. " +
          "There is so much I want you to know, and we have years to fill this book together.\n\n" +
          "Love,\nDad",
      },
    ],
    firstRunDone: false,
  };
}

export function isDemoRequested(): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get("demo") === "1";
  } catch {
    return false;
  }
}
