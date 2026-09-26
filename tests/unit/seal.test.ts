import { describe, expect, it } from "vitest";
import { seal, unsealWithWords, UnsealError, type SealedPayload } from "../../src/seal";
import { bytesToWords } from "../../src/mnemonic";
import type { Photo } from "../../src/vault";

const PHOTO: Photo = {
  id: "p1",
  dataUrl: "data:image/jpeg;base64,/9j/AAAB",
  caption: "cake 🎂",
  w: 120,
  h: 90,
  bytes: 1234,
};

function payload(overrides: Partial<SealedPayload> = {}): SealedPayload {
  return {
    occasion: "First birthday",
    title: "For when you are grown",
    body: "Dear one,\n\nUnicode: café, 日本語, emoji 🎈.\nLine two.",
    photos: [PHOTO],
    ...overrides,
  };
}

describe("seal / unseal", () => {
  it("round-trips the exact payload including photos and unicode", async () => {
    const { sealed, words } = await seal(payload(), "In the birthday card", "2026-09-26T00:00:00.000Z");
    expect(words).toHaveLength(24);
    const opened = await unsealWithWords(sealed, words);
    expect(opened).toEqual(payload());
  });

  it("stores only iv, ciphertext, keyHint, sealedAt and no plaintext", async () => {
    const p = payload();
    const { sealed } = await seal(p, "grandma's drawer", "2026-09-26T00:00:00.000Z");
    expect(Object.keys(sealed).sort()).toEqual(["ciphertext", "iv", "keyHint", "sealedAt"]);
    expect(sealed.keyHint).toBe("grandma's drawer");
    expect(sealed.sealedAt).toBe("2026-09-26T00:00:00.000Z");
    const blob = JSON.stringify(sealed);
    expect(blob).not.toContain(p.title);
    expect(blob).not.toContain("café");
    expect(blob).not.toContain(p.photos[0].dataUrl);
  });

  it("fails a different valid mnemonic with UnsealError wrong-key", async () => {
    const { sealed } = await seal(payload(), "hint", "2026-09-26T00:00:00.000Z");
    const otherWords = bytesToWords(crypto.getRandomValues(new Uint8Array(32)));
    try {
      await unsealWithWords(sealed, otherWords);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsealError);
      expect((err as UnsealError).reason).toBe("wrong-key");
    }
  });

  it("fails a byte-flipped ciphertext with UnsealError wrong-key", async () => {
    const { sealed, words } = await seal(payload(), "hint", "2026-09-26T00:00:00.000Z");
    const tampered = {
      ...sealed,
      ciphertext: sealed.ciphertext[0] === "A" ? "B" + sealed.ciphertext.slice(1) : "A" + sealed.ciphertext.slice(1),
    };
    try {
      await unsealWithWords(tampered, words);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsealError);
      expect((err as UnsealError).reason).toBe("wrong-key");
    }
  });

  it("leaves the sealed blob untouched on a failed unseal", async () => {
    const { sealed } = await seal(payload(), "hint", "2026-09-26T00:00:00.000Z");
    const snapshot = JSON.stringify(sealed);
    const bad = bytesToWords(crypto.getRandomValues(new Uint8Array(32)));
    await expect(unsealWithWords(sealed, bad)).rejects.toBeInstanceOf(UnsealError);
    expect(JSON.stringify(sealed)).toBe(snapshot);
  });

  it("round-trips an interview payload with answers and age", async () => {
    const interviewPayload: SealedPayload = {
      occasion: "",
      title: "Interview at age 5",
      body: "",
      photos: [],
      childAgeYears: 5,
      answers: [
        { promptId: "early-school-1", promptText: "Proud of?", answerText: "Reading a whole book." },
        { promptId: "early-school-2", promptText: "Friends?", answerText: "They are kind. 日本語" },
      ],
    };
    const { sealed, words } = await seal(interviewPayload, "the drawer", "2026-09-26T00:00:00.000Z");
    // The blob leaks no readable answer text or age.
    const blob = JSON.stringify(sealed);
    expect(blob).not.toContain("Reading a whole book.");
    expect(blob).not.toContain("early-school-1");
    const opened = await unsealWithWords(sealed, words);
    expect(opened).toEqual(interviewPayload);
    expect(opened.childAgeYears).toBe(5);
    expect(opened.answers).toHaveLength(2);
  });

  it("generates a fresh iv per seal", async () => {
    const a = await seal(payload(), "hint", "2026-09-26T00:00:00.000Z");
    const b = await seal(payload(), "hint", "2026-09-26T00:00:00.000Z");
    expect(a.sealed.iv).not.toBe(b.sealed.iv);
    expect(a.words.join(" ")).not.toBe(b.words.join(" "));
  });
});
