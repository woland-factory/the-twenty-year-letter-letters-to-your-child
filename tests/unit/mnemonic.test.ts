import { describe, expect, it } from "vitest";
import { bytesToWords, wordsToBytes } from "../../src/mnemonic";
import { UnsealError } from "../../src/seal";

describe("mnemonic", () => {
  it("round-trips many random 32-byte keys as exactly 24 words", () => {
    for (let i = 0; i < 50; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const words = bytesToWords(bytes);
      expect(words).toHaveLength(24);
      expect(wordsToBytes(words)).toEqual(bytes);
    }
  });

  it("normalizes case and whitespace before validating", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const words = bytesToWords(bytes);
    const messy = "  " + words.join("   ").toUpperCase() + "\n";
    expect(wordsToBytes(messy.split(/\s+/).filter(Boolean))).toEqual(bytes);
  });

  it("rejects a single altered word with UnsealError bad-words", () => {
    const words = bytesToWords(crypto.getRandomValues(new Uint8Array(32)));
    const altered = words.slice();
    altered[5] = altered[5] === "zoo" ? "zone" : "zoo";
    try {
      wordsToBytes(altered);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsealError);
      expect((err as UnsealError).reason).toBe("bad-words");
    }
  });

  it("rejects an unknown word", () => {
    const words = bytesToWords(crypto.getRandomValues(new Uint8Array(32)));
    words[0] = "notabip39word";
    expect(() => wordsToBytes(words)).toThrow(UnsealError);
  });

  it("rejects a wrong word count", () => {
    const words = bytesToWords(crypto.getRandomValues(new Uint8Array(32)));
    expect(() => wordsToBytes(words.slice(0, 23))).toThrow(UnsealError);
  });
});
