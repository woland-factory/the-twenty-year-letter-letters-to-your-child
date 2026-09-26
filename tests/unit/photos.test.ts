import { describe, expect, it } from "vitest";
import {
  computeTargetDimensions,
  dataUrlByteLength,
  MAX_EDGE,
  remainingBudget,
  VAULT_PHOTO_BUDGET_BYTES,
  vaultPhotoBytes,
  wouldExceedBudget,
} from "../../src/photos";
import { emptyVault, type Photo, type Vault } from "../../src/vault";

function photo(bytes: number): Photo {
  return { id: "p", dataUrl: "data:image/jpeg;base64,AA", caption: "", w: 10, h: 10, bytes };
}

function vaultWithPhotoBytes(...sizes: number[]): Vault {
  const v = emptyVault();
  v.entries.push({
    id: "e1",
    type: "letter",
    createdAt: "2026-01-01T00:00:00.000Z",
    occasion: "",
    title: "t",
    body: "b",
    photos: sizes.map(photo),
  });
  return v;
}

describe("computeTargetDimensions", () => {
  it("caps a landscape image's longest edge to MAX_EDGE", () => {
    expect(computeTargetDimensions(3200, 2000, MAX_EDGE)).toEqual({ w: 1600, h: 1000 });
  });

  it("caps a portrait image's longest edge to MAX_EDGE", () => {
    expect(computeTargetDimensions(2000, 3200, MAX_EDGE)).toEqual({ w: 1000, h: 1600 });
  });

  it("caps a square image to MAX_EDGE on both sides", () => {
    expect(computeTargetDimensions(4000, 4000, MAX_EDGE)).toEqual({ w: 1600, h: 1600 });
  });

  it("never upscales an image already within the bound", () => {
    expect(computeTargetDimensions(800, 600, MAX_EDGE)).toEqual({ w: 800, h: 600 });
  });

  it("leaves an exactly-at-bound image unchanged", () => {
    expect(computeTargetDimensions(1600, 900, MAX_EDGE)).toEqual({ w: 1600, h: 900 });
  });

  it("rounds fractional targets to integers", () => {
    const { w, h } = computeTargetDimensions(1000, 333, 500);
    expect(Number.isInteger(w)).toBe(true);
    expect(Number.isInteger(h)).toBe(true);
    expect(w).toBe(500);
    expect(h).toBe(167);
  });
});

describe("budget math", () => {
  it("sums photo bytes across entries", () => {
    expect(vaultPhotoBytes(emptyVault())).toBe(0);
    expect(vaultPhotoBytes(vaultWithPhotoBytes(100, 250))).toBe(350);
  });

  it("wouldExceedBudget is true only past the hard budget", () => {
    expect(wouldExceedBudget(0, 100)).toBe(false);
    expect(wouldExceedBudget(VAULT_PHOTO_BUDGET_BYTES, 1)).toBe(true);
    expect(wouldExceedBudget(VAULT_PHOTO_BUDGET_BYTES, 0)).toBe(false);
    expect(wouldExceedBudget(VAULT_PHOTO_BUDGET_BYTES - 10, 10)).toBe(false);
    expect(wouldExceedBudget(VAULT_PHOTO_BUDGET_BYTES - 10, 11)).toBe(true);
  });

  it("remainingBudget never goes negative", () => {
    expect(remainingBudget(0)).toBe(VAULT_PHOTO_BUDGET_BYTES);
    expect(remainingBudget(VAULT_PHOTO_BUDGET_BYTES + 500)).toBe(0);
  });
});

describe("dataUrlByteLength", () => {
  it("computes the decoded payload size", () => {
    // "AAAA" decodes to 3 bytes; "AA==" to 1; "AAA=" to 2.
    expect(dataUrlByteLength("data:image/jpeg;base64,AAAA")).toBe(3);
    expect(dataUrlByteLength("data:image/jpeg;base64,AA==")).toBe(1);
    expect(dataUrlByteLength("data:image/jpeg;base64,AAA=")).toBe(2);
  });
});
