import { describe, expect, it } from "vitest";
import {
  formatCopyLine,
  formatEntryCount,
  formatFullMoment,
  formatSavedMoment,
} from "../../src/format";

describe("formatEntryCount", () => {
  it("phrases counts as a human would", () => {
    expect(formatEntryCount(0)).toBe("No letters yet");
    expect(formatEntryCount(1)).toBe("1 letter");
    expect(formatEntryCount(3)).toBe("3 letters");
  });
});

describe("formatSavedMoment", () => {
  it("says 'today at ...' on the same calendar day", () => {
    const iso = "2026-03-03T21:14:00";
    const now = new Date("2026-03-03T23:00:00");
    expect(formatSavedMoment(iso, now)).toBe("today at 9:14 PM");
  });

  it("gives the full date on another day", () => {
    const iso = "2026-03-03T21:14:00";
    const now = new Date("2026-05-01T09:00:00");
    expect(formatSavedMoment(iso, now)).toBe("March 3, 2026");
  });

  it("handles midnight and noon in 12-hour time", () => {
    const now = new Date("2026-03-03T12:30:00");
    expect(formatSavedMoment("2026-03-03T00:05:00", now)).toBe("today at 12:05 AM");
    expect(formatSavedMoment("2026-03-03T12:00:00", now)).toBe("today at 12:00 PM");
  });
});

describe("formatFullMoment", () => {
  it("renders the download-ritual identity", () => {
    expect(formatFullMoment("2026-03-03T21:14:00")).toBe("March 3, 2026 at 9:14 PM");
  });
});

describe("formatCopyLine", () => {
  it("names the copy number", () => {
    expect(formatCopyLine(4)).toBe("This is copy 4.");
  });
});
