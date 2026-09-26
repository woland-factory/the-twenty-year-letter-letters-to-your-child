import { describe, expect, it } from "vitest";
import {
  AGE_BANDS,
  ageInYears,
  birthdayNudge,
  interviewTitle,
  promptsForAge,
} from "../../src/interview";
import { emptyVault, type Entry, type Vault } from "../../src/vault";

function vaultWithChild(birthDate: string | null, entries: Entry[] = []): Vault {
  return { ...emptyVault(), child: { name: "Mira", birthDate }, entries };
}

function interviewEntry(childAgeYears: number): Entry {
  return {
    id: `iv-${childAgeYears}`,
    type: "interview",
    createdAt: "2026-06-01T00:00:00.000Z",
    occasion: "",
    title: interviewTitle(childAgeYears),
    body: "",
    photos: [],
    childAgeYears,
    answers: [],
  };
}

describe("ageInYears", () => {
  it("counts whole years when the birthday has already passed this year", () => {
    expect(ageInYears("2020-01-08", new Date("2026-06-01T12:00:00"))).toBe(6);
  });

  it("counts one year younger before this year's birthday", () => {
    expect(ageInYears("2020-12-31", new Date("2026-06-01T12:00:00"))).toBe(5);
  });

  it("counts the birthday itself as reached (boundary)", () => {
    expect(ageInYears("2020-06-01", new Date("2026-06-01T09:00:00"))).toBe(6);
  });

  it("treats a Feb 29 birth date as not-yet-had on Feb 28 of a non-leap year", () => {
    expect(ageInYears("2020-02-29", new Date("2026-02-28T12:00:00"))).toBe(5);
    expect(ageInYears("2020-02-29", new Date("2026-03-01T12:00:00"))).toBe(6);
  });

  it("returns null for an unparseable date", () => {
    expect(ageInYears("not-a-date", new Date("2026-06-01T12:00:00"))).toBeNull();
    expect(ageInYears("2020-13-40", new Date("2026-06-01T12:00:00"))).toBeNull();
  });

  it("returns null for a future birth date", () => {
    expect(ageInYears("2030-01-01", new Date("2026-06-01T12:00:00"))).toBeNull();
  });
});

describe("promptsForAge", () => {
  it("returns the right band across every boundary", () => {
    expect(promptsForAge(0).id).toBe("first-year");
    expect(promptsForAge(1).id).toBe("toddler");
    expect(promptsForAge(2).id).toBe("toddler");
    expect(promptsForAge(3).id).toBe("little-kid");
    expect(promptsForAge(4).id).toBe("little-kid");
    expect(promptsForAge(5).id).toBe("early-school");
    expect(promptsForAge(7).id).toBe("early-school");
    expect(promptsForAge(8).id).toBe("middle-childhood");
    expect(promptsForAge(10).id).toBe("middle-childhood");
    expect(promptsForAge(11).id).toBe("tween");
    expect(promptsForAge(13).id).toBe("tween");
    expect(promptsForAge(14).id).toBe("teen");
  });

  it("clamps a large age to the teen band", () => {
    expect(promptsForAge(40).id).toBe("teen");
    expect(promptsForAge(300).id).toBe("teen");
  });

  it("clamps below the youngest band to the first year", () => {
    expect(promptsForAge(-1).id).toBe("first-year");
  });

  it("gives every age a non-empty band", () => {
    for (let age = 0; age <= 25; age++) {
      expect(promptsForAge(age).prompts.length).toBeGreaterThan(0);
    }
  });

  it("gives the infancy band and the teen band different prompts", () => {
    const first = promptsForAge(0).prompts.map((p) => p.text);
    const teen = promptsForAge(15).prompts.map((p) => p.text);
    expect(first).not.toEqual(teen);
    // No prompt text is shared between the two bands.
    expect(first.some((t) => teen.includes(t))).toBe(false);
  });
});

describe("interviewTitle", () => {
  it("names the first year without a number", () => {
    expect(interviewTitle(0)).toBe("Interview in the first year");
  });

  it("names later years by age", () => {
    expect(interviewTitle(5)).toBe("Interview at age 5");
    expect(interviewTitle(1)).toBe("Interview at age 1");
  });
});

describe("prompt-pack copy sweep", () => {
  const banned = [
    "seamlessly",
    "effortlessly",
    "unlock",
    "elevate",
    "empower",
    "leverage",
    "robust",
    "dive in",
  ];

  it("contains no dash characters and no banned vocabulary", () => {
    const texts = AGE_BANDS.flatMap((band) => band.prompts.map((p) => p.text));
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toContain("—"); // em dash
      expect(text).not.toContain("–"); // en dash
      const lower = text.toLowerCase();
      for (const word of banned) {
        expect(lower.includes(word)).toBe(false);
      }
    }
  });

  it("has stable, unique prompt ids", () => {
    const ids = AGE_BANDS.flatMap((band) => band.prompts.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("birthdayNudge", () => {
  it("returns null with no birth date", () => {
    expect(birthdayNudge(vaultWithChild(null), new Date("2026-06-01T12:00:00"))).toBeNull();
    expect(birthdayNudge(emptyVault(), new Date("2026-06-01T12:00:00"))).toBeNull();
  });

  it("returns the age when inside the window and this year's interview is missing", () => {
    const nudge = birthdayNudge(vaultWithChild("2020-06-01"), new Date("2026-06-05T12:00:00"));
    expect(nudge).toEqual({ age: 6 });
  });

  it("shows just before the birthday too", () => {
    const nudge = birthdayNudge(vaultWithChild("2020-06-01"), new Date("2026-05-25T12:00:00"));
    expect(nudge).toEqual({ age: 6 });
  });

  it("returns null when an unsealed interview for that age already exists", () => {
    const vault = vaultWithChild("2020-06-01", [interviewEntry(6)]);
    expect(birthdayNudge(vault, new Date("2026-06-05T12:00:00"))).toBeNull();
  });

  it("still shows when only a sealed interview carries no readable age", () => {
    const sealed: Entry = {
      id: "sealed-iv",
      type: "interview",
      createdAt: "2026-06-01T00:00:00.000Z",
      occasion: "",
      title: "",
      body: "",
      photos: [],
      sealed: {
        iv: "AAAAAAAAAAAAAAAA",
        ciphertext: "Y2lwaGVy",
        keyHint: "the drawer",
        sealedAt: "2026-06-01T00:00:00.000Z",
      },
    };
    const vault = vaultWithChild("2020-06-01", [sealed]);
    expect(birthdayNudge(vault, new Date("2026-06-05T12:00:00"))).toEqual({ age: 6 });
  });

  it("returns null well outside the window", () => {
    expect(birthdayNudge(vaultWithChild("2020-06-01"), new Date("2026-09-01T12:00:00"))).toBeNull();
  });

  it("resolves a Feb 29 birthday on Feb 28 in a non-leap year", () => {
    expect(birthdayNudge(vaultWithChild("2020-02-29"), new Date("2026-02-28T12:00:00"))).toEqual({
      age: 6,
    });
  });

  it("shows around a birthday that crosses the year boundary", () => {
    // Birthday Jan 4; on Dec 27 the next anniversary is within 14 days.
    const nudge = birthdayNudge(vaultWithChild("2020-01-04"), new Date("2026-12-27T12:00:00"));
    expect(nudge).toEqual({ age: 7 });
  });
});
