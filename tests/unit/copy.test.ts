// A standing copy sweep over the pure string modules a parent reads: the yearly
// interview prompt pack and the phrasing helpers. It locks the tone rules from
// the quality bar so they cannot silently regress: no em-dashes or en-dashes, no
// machine-written vocabulary, and no negative empty-state phrasing.

import { describe, expect, it } from "vitest";
import { AGE_BANDS, interviewTitle } from "../../src/interview";
import {
  formatBookDate,
  formatCopyLine,
  formatEntryCount,
  formatFullMoment,
  formatSavedMoment,
} from "../../src/format";

// Every user-visible string these pure modules can produce, flattened.
function everyPhrase(): string[] {
  const now = new Date("2026-03-03T23:00:00");
  const phrases: string[] = [];

  // The whole prompt pack, every band.
  for (const band of AGE_BANDS) {
    for (const prompt of band.prompts) phrases.push(prompt.text);
  }

  // The derived interview titles, both the first-year phrasing and an age.
  phrases.push(interviewTitle(0), interviewTitle(5));

  // The phrasing helpers, including their unparseable-input fallbacks.
  phrases.push(formatEntryCount(0), formatEntryCount(1), formatEntryCount(3));
  phrases.push(formatCopyLine(1), formatCopyLine(12));
  phrases.push(formatSavedMoment("2026-03-03T21:14:00", now)); // "today at ..."
  phrases.push(formatSavedMoment("2026-01-01T09:00:00", now)); // full date
  phrases.push(formatSavedMoment("not a date", now)); // "at an unknown time"
  phrases.push(formatFullMoment("2026-03-03T21:14:00"));
  phrases.push(formatFullMoment("not a date")); // "an unknown time"
  phrases.push(formatBookDate("2026-03-03T21:14:00"));
  phrases.push(formatBookDate("not a date")); // "an undated day"

  return phrases;
}

// The banned machine-written vocabulary from the quality bar, case-insensitive.
const BANNED_VOCAB = [
  "seamlessly",
  "effortlessly",
  "unlock",
  "elevate",
  "empower",
  "leverage",
  "robust",
  "dive in",
  "in today's fast-paced world",
  "fast-paced",
  "we've got you covered",
];

// The banned negative empty-state phrasings from the quality bar.
const NEGATIVE_PATTERNS: RegExp[] = [
  /you don't have/i,
  /\bno\b[^.?!]*\byet\b/i,
  /nothing[^.?!]*here/i,
  /unable to/i,
  /something went wrong/i,
];

describe("copy sweep over the prompt pack and phrasing helpers", () => {
  const phrases = everyPhrase();

  it("has phrases to check", () => {
    // Guards against a refactor silently emptying the sweep.
    expect(phrases.length).toBeGreaterThan(30);
  });

  it("uses no em-dash or en-dash", () => {
    for (const phrase of phrases) {
      expect(phrase, `dash in: ${phrase}`).not.toMatch(/[—–]/);
    }
  });

  it("uses none of the banned machine-written vocabulary", () => {
    for (const phrase of phrases) {
      const lower = phrase.toLowerCase();
      for (const word of BANNED_VOCAB) {
        expect(lower.includes(word), `"${word}" in: ${phrase}`).toBe(false);
      }
    }
  });

  it("uses no negative empty-state phrasing", () => {
    for (const phrase of phrases) {
      for (const pattern of NEGATIVE_PATTERNS) {
        expect(phrase, `negative phrasing in: ${phrase}`).not.toMatch(pattern);
      }
    }
  });
});
