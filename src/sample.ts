// One inert sample letter for the live demo only. It loads only when the vault
// is empty and the page URL carries ?demo=1, so a downloaded file never seeds
// itself with someone else's letter.

import type { Photo, Vault } from "./vault";
import { SCHEMA_VERSION } from "./vault";

// One tiny pre-rendered photo (a warm dusk gradient) so the live demo shows a
// real thumbnail and the photo feature without any typing. It is inlined into
// every built artifact, so it stays small on purpose (well under 40 KB). The
// downloaded starter file is the empty vault and never carries it.
const SAMPLE_PHOTO: Photo = {
  id: "sample-photo-1",
  caption: "Home at last",
  w: 160,
  h: 108,
  bytes: 1617,
  dataUrl:
    "data:image/jpeg;base64,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",
};

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
        occasion: "The day we came home",
        title: "The night you came home",
        body:
          "Mira,\n\nYou slept the whole drive back, one hand curled around my finger. " +
          "The house felt different with you in it, quieter and fuller at the same time.\n\n" +
          "I am writing these down so that one day you can read them in your own voice. " +
          "There is so much I want you to know, and we have years to fill this book together.\n\n" +
          "Love,\nDad",
        photos: [SAMPLE_PHOTO],
      },
      // A sealed letter, so the demo archive shows the locked state at a glance.
      // Its key was thrown away at authoring time, so it stays sealed forever.
      // The ciphertext holds a short throwaway note and no photos.
      {
        id: "sample-sealed-1",
        type: "letter",
        createdAt: "2026-02-14T09:00:00.000Z",
        occasion: "",
        title: "",
        body: "",
        photos: [],
        sealed: {
          iv: "U2fTvI4/n2MwNKVE",
          ciphertext:
            "+8VDyPyGfLUQdFzrVpv93i9w1+QlyfOMRzDGSR6JLolZ3a7tOrWgjICeFqsYwbz5o9LnpgfoUDt7hA4SnbaOhr6CVVAInebZc0tDJupVXmcIA9zjAFpnjBO2WPJpmxGedimIXiliS1SJJRmwKRoigQ8mBe4SGc4GqLy41pXeDQ==",
          keyHint: "In Mira's first birthday card",
          sealedAt: "2026-02-14T09:00:00.000Z",
        },
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
