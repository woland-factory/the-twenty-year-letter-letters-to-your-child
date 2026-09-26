import { describe, expect, it } from "vitest";
import { decideSave, forcedGeneration } from "../../src/save/generation";

describe("decideSave", () => {
  it("writes when the disk copy is older", () => {
    expect(decideSave(5, 3)).toEqual({ action: "write", outgoing: 6 });
  });

  it("writes when the disk copy is equal", () => {
    expect(decideSave(5, 5)).toEqual({ action: "write", outgoing: 6 });
  });

  it("warns when the disk copy is newer", () => {
    expect(decideSave(5, 7)).toEqual({ action: "warn", diskGeneration: 7 });
  });

  it("writes without warning for an empty or unreadable disk file", () => {
    expect(decideSave(0, -1)).toEqual({ action: "write", outgoing: 1 });
    expect(decideSave(4, -1)).toEqual({ action: "write", outgoing: 5 });
  });
});

describe("forcedGeneration", () => {
  it("climbs above both copies", () => {
    expect(forcedGeneration(5, 7)).toBe(8);
    expect(forcedGeneration(7, 5)).toBe(8);
    expect(forcedGeneration(3, -1)).toBe(4);
  });
});
