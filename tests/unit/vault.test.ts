import { describe, expect, it } from "vitest";
import {
  emptyVault,
  parseVault,
  SCHEMA_VERSION,
  VaultParseError,
  type Vault,
} from "../../src/vault";

describe("parseVault", () => {
  it("parses a valid empty vault", () => {
    const v = parseVault(JSON.stringify(emptyVault()));
    expect(v.schemaVersion).toBe(SCHEMA_VERSION);
    expect(v.entries).toEqual([]);
    expect(v.generation).toBe(0);
    expect(v.savedAt).toBeNull();
  });

  it("parses a v2 vault with letters and photos", () => {
    const raw: Vault = {
      schemaVersion: 2,
      generation: 2,
      savedAt: "2026-03-03T21:14:00.000Z",
      fileId: "abc",
      child: { name: "Mira", birthDate: null },
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "First birthday",
          title: "Hi",
          body: "x",
          photos: [
            {
              id: "p1",
              dataUrl: "data:image/jpeg;base64,/9j/AAAB",
              caption: "cake",
              w: 1600,
              h: 900,
              bytes: 4321,
            },
          ],
        },
      ],
      firstRunDone: false,
    };
    const v = parseVault(JSON.stringify(raw));
    expect(v.entries).toHaveLength(1);
    expect(v.entries[0].title).toBe("Hi");
    expect(v.entries[0].occasion).toBe("First birthday");
    expect(v.entries[0].photos[0].caption).toBe("cake");
    expect(v.child?.name).toBe("Mira");
  });

  it("migrates a v2 vault to v3, leaving entries intact", () => {
    const raw = {
      schemaVersion: 2,
      generation: 2,
      savedAt: "2026-03-03T21:14:00.000Z",
      fileId: "abc",
      child: null,
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "First birthday",
          title: "Hi",
          body: "x",
          photos: [],
        },
      ],
      firstRunDone: false,
    };
    const v = parseVault(JSON.stringify(raw));
    expect(v.schemaVersion).toBe(3);
    expect(v.entries[0].title).toBe("Hi");
    expect(v.entries[0].sealed).toBeUndefined();
  });

  it("migrates a v1 vault all the way to v3", () => {
    const raw = {
      schemaVersion: 1,
      generation: 1,
      savedAt: null,
      fileId: "abc",
      child: null,
      entries: [
        { id: "e1", type: "letter", createdAt: "2026-01-01T00:00:00.000Z", title: "Hi", body: "x" },
      ],
      firstRunDone: false,
    };
    const v = parseVault(JSON.stringify(raw));
    expect(v.schemaVersion).toBe(3);
    expect(v.entries[0].occasion).toBe("");
    expect(v.entries[0].photos).toEqual([]);
  });

  it("parses a v3 vault with a sealed entry and preserves the blob", () => {
    const raw = {
      ...emptyVault(),
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "",
          title: "",
          body: "",
          photos: [],
          sealed: {
            iv: "AAAAAAAAAAAAAAAA",
            ciphertext: "Y2lwaGVy",
            keyHint: "In the birthday card",
            sealedAt: "2026-02-14T00:00:00.000Z",
            futureField: "keep-me",
          },
        },
      ],
    };
    const v = parseVault(JSON.stringify(raw));
    expect(v.entries[0].sealed?.keyHint).toBe("In the birthday card");
    expect(v.entries[0].sealed?.ciphertext).toBe("Y2lwaGVy");
    expect((v.entries[0].sealed as Record<string, unknown>).futureField).toBe("keep-me");
  });

  it("rejects a malformed sealed blob (missing iv)", () => {
    const raw = {
      ...emptyVault(),
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "",
          title: "",
          body: "",
          photos: [],
          sealed: { ciphertext: "Y2lwaGVy", keyHint: "h", sealedAt: "2026-02-14T00:00:00.000Z" },
        },
      ],
    };
    expect(() => parseVault(JSON.stringify(raw))).toThrow(VaultParseError);
  });

  it("rejects a sealed blob with a non-string ciphertext", () => {
    const raw = {
      ...emptyVault(),
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "",
          title: "",
          body: "",
          photos: [],
          sealed: { iv: "AAAA", ciphertext: 42, keyHint: "h", sealedAt: "2026-02-14T00:00:00.000Z" },
        },
      ],
    };
    expect(() => parseVault(JSON.stringify(raw))).toThrow(VaultParseError);
  });

  it("flags a v4 (newer-than-known) schemaVersion distinctly", () => {
    try {
      parseVault(JSON.stringify({ ...emptyVault(), schemaVersion: 4 }));
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(VaultParseError);
      expect((err as VaultParseError).kind).toBe("newer-version");
    }
  });

  it("migrates a v1 vault, filling occasion and photos on every entry", () => {
    const raw = {
      schemaVersion: 1,
      generation: 2,
      savedAt: "2026-03-03T21:14:00.000Z",
      fileId: "abc",
      child: null,
      entries: [
        { id: "e1", type: "letter", createdAt: "2026-01-01T00:00:00.000Z", title: "Hi", body: "x" },
      ],
      firstRunDone: false,
    };
    const v = parseVault(JSON.stringify(raw));
    expect(v.schemaVersion).toBe(SCHEMA_VERSION);
    expect(v.entries[0].occasion).toBe("");
    expect(v.entries[0].photos).toEqual([]);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseVault("{not json")).toThrow(VaultParseError);
  });

  it("rejects a non-object", () => {
    expect(() => parseVault("42")).toThrow(VaultParseError);
    expect(() => parseVault("[]")).toThrow(VaultParseError);
  });

  it("rejects a missing schemaVersion", () => {
    expect(() => parseVault(JSON.stringify({ entries: [] }))).toThrow(VaultParseError);
  });

  it("flags a newer-than-known schemaVersion distinctly", () => {
    try {
      parseVault(JSON.stringify({ ...emptyVault(), schemaVersion: 99 }));
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(VaultParseError);
      expect((err as VaultParseError).kind).toBe("newer-version");
    }
  });

  it("rejects a broken entry", () => {
    const raw = { ...emptyVault(), entries: [{ id: "e1", type: "letter", createdAt: "x", title: "t" }] };
    expect(() => parseVault(JSON.stringify(raw))).toThrow(VaultParseError);
  });

  it("rejects a non-string occasion", () => {
    const raw = {
      ...emptyVault(),
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: 5,
          title: "t",
          body: "b",
          photos: [],
        },
      ],
    };
    expect(() => parseVault(JSON.stringify(raw))).toThrow(VaultParseError);
  });

  it("rejects a malformed photo", () => {
    const raw = {
      ...emptyVault(),
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "",
          title: "t",
          body: "b",
          photos: [{ id: "p1", dataUrl: "data:image/jpeg;base64,AA", caption: "c", w: 10, h: 10 }],
        },
      ],
    };
    expect(() => parseVault(JSON.stringify(raw))).toThrow(VaultParseError);
  });

  it("preserves unknown future fields on the vault, entries, and photos", () => {
    const raw = {
      ...emptyVault(),
      futureFlag: "keep-me",
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "",
          title: "t",
          body: "b",
          photos: [
            {
              id: "p1",
              dataUrl: "data:image/jpeg;base64,AA",
              caption: "c",
              w: 10,
              h: 10,
              bytes: 2,
              sealed: { cipher: "later" },
            },
          ],
          extraEntryField: "later",
        },
      ],
    };
    const v = parseVault(JSON.stringify(raw));
    expect((v as Record<string, unknown>).futureFlag).toBe("keep-me");
    expect((v.entries[0] as Record<string, unknown>).extraEntryField).toBe("later");
    expect((v.entries[0].photos[0] as Record<string, unknown>).sealed).toEqual({ cipher: "later" });
  });
});
