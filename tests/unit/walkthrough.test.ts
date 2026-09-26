import { describe, expect, it } from "vitest";
import { WALK_COPY, WALK_STEPS, firstRunPending } from "../../src/walkthrough";
import { emptyVault, type Entry, type Vault } from "../../src/vault";

function letterEntry(): Entry {
  return {
    id: "e1",
    type: "letter",
    createdAt: "2026-06-01T00:00:00.000Z",
    occasion: "",
    title: "Hello",
    body: "body",
    photos: [],
  };
}

function vaultWith(opts: { firstRunDone: boolean; entries: Entry[] }): Vault {
  return { ...emptyVault(), firstRunDone: opts.firstRunDone, entries: opts.entries };
}

describe("firstRunPending", () => {
  it("is true for a brand-new empty vault", () => {
    expect(firstRunPending(emptyVault())).toBe(true);
  });

  it("is false once firstRunDone is set, even with no entries", () => {
    expect(firstRunPending(vaultWith({ firstRunDone: true, entries: [] }))).toBe(false);
  });

  it("is false when there is content, even with firstRunDone false", () => {
    expect(firstRunPending(vaultWith({ firstRunDone: false, entries: [letterEntry()] }))).toBe(
      false,
    );
  });

  it("is false for a vault that has both content and the flag", () => {
    expect(firstRunPending(vaultWith({ firstRunDone: true, entries: [letterEntry()] }))).toBe(
      false,
    );
  });
});

describe("step model", () => {
  it("is exactly the four ordered steps", () => {
    expect(WALK_STEPS).toEqual(["write", "save", "backup", "seal"]);
  });

  it("has one short non-empty sentence per step", () => {
    for (const step of WALK_STEPS) {
      const line = WALK_COPY[step];
      expect(typeof line).toBe("string");
      expect(line.trim().length).toBeGreaterThan(0);
      // One sentence: ends with a period and holds no mid-sentence dash-aside.
      expect(line.trim().endsWith(".")).toBe(true);
    }
  });
});

// The copy sweep is a standing test, not a one-time check: every user-visible
// string this EPIC ships is asserted clean here so a regression is caught.
describe("copy sweep", () => {
  const BANNED = [
    "seamlessly",
    "effortlessly",
    "unlock",
    "elevate",
    "empower",
    "leverage",
    "robust",
    "dive in",
    "in today's fast-paced world",
    "we've got you covered",
  ];
  const NEGATIVE = [
    /you don't have/i,
    /you have no\b/i,
    /no .* yet\b/i,
    /nothing .* here/i,
    /unable to/i,
    /something went wrong/i,
  ];

  const strings = [
    ...Object.values(WALK_COPY),
    "Skip",
    "Got it",
    "Getting started",
    "Skip the walkthrough",
    "Step 1 of 4",
    "Step 2 of 4",
    "Step 3 of 4",
    "Step 4 of 4",
  ];

  it("uses no em-dash or en-dash", () => {
    for (const s of strings) {
      expect(s.includes("—"), `em-dash in "${s}"`).toBe(false);
      expect(s.includes("–"), `en-dash in "${s}"`).toBe(false);
    }
  });

  it("uses none of the banned vocabulary", () => {
    for (const s of strings) {
      for (const word of BANNED) {
        expect(s.toLowerCase().includes(word), `banned "${word}" in "${s}"`).toBe(false);
      }
    }
  });

  it("uses no negative empty-state phrasing", () => {
    for (const s of strings) {
      for (const pattern of NEGATIVE) {
        expect(pattern.test(s), `negative phrasing in "${s}"`).toBe(false);
      }
    }
  });
});
