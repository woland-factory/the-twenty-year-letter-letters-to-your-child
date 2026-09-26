import { describe, expect, it } from "vitest";
import {
  bookEntries,
  foldDraft,
  foldInterview,
  foldSealed,
  isSealed,
  sortedEntries,
  unsealedEntries,
} from "../../src/entries";
import {
  emptyVault,
  type Entry,
  type InterviewAnswer,
  type Photo,
  type Sealed,
  type Vault,
} from "../../src/vault";

function photo(id: string): Photo {
  return { id, dataUrl: `data:image/jpeg;base64,${id}`, caption: id, w: 10, h: 10, bytes: 100 };
}

function entry(id: string, createdAt: string, photoIds: string[] = []): Entry {
  return {
    id,
    type: "letter",
    createdAt,
    occasion: `occasion ${id}`,
    title: `title ${id}`,
    body: `body ${id}`,
    photos: photoIds.map(photo),
  };
}

function vaultWith(...entries: Entry[]): Vault {
  return { ...emptyVault(), entries };
}

describe("sortedEntries", () => {
  it("orders newest first by createdAt", () => {
    const a = entry("a", "2026-01-01T00:00:00.000Z");
    const b = entry("b", "2026-06-01T00:00:00.000Z");
    const c = entry("c", "2026-03-01T00:00:00.000Z");
    expect(sortedEntries([a, b, c]).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties on id deterministically", () => {
    const t = "2026-01-01T00:00:00.000Z";
    const x = entry("x", t);
    const m = entry("m", t);
    const z = entry("z", t);
    expect(sortedEntries([z, x, m]).map((e) => e.id)).toEqual(["m", "x", "z"]);
  });

  it("does not mutate the input array", () => {
    const list = [entry("a", "2026-01-01T00:00:00.000Z"), entry("b", "2026-02-01T00:00:00.000Z")];
    const before = list.map((e) => e.id);
    sortedEntries(list);
    expect(list.map((e) => e.id)).toEqual(before);
  });
});

describe("bookEntries", () => {
  const SEALED: Sealed = {
    iv: "AAAAAAAAAAAAAAAA",
    ciphertext: "Y2lwaGVydGV4dA==",
    keyHint: "In the birthday card",
    sealedAt: "2026-09-26T00:00:00.000Z",
  };

  it("returns unsealed entries oldest first", () => {
    const a = entry("a", "2026-01-01T00:00:00.000Z");
    const b = entry("b", "2026-06-01T00:00:00.000Z");
    const c = entry("c", "2026-03-01T00:00:00.000Z");
    expect(bookEntries([a, b, c]).map((e) => e.id)).toEqual(["a", "c", "b"]);
  });

  it("excludes sealed entries", () => {
    const open = entry("a", "2026-01-01T00:00:00.000Z");
    const sealed: Entry = { ...entry("b", "2026-02-01T00:00:00.000Z"), sealed: SEALED };
    expect(bookEntries([open, sealed]).map((e) => e.id)).toEqual(["a"]);
  });

  it("returns [] when every entry is sealed", () => {
    const s1: Entry = { ...entry("a", "2026-01-01T00:00:00.000Z"), sealed: SEALED };
    const s2: Entry = { ...entry("b", "2026-02-01T00:00:00.000Z"), sealed: SEALED };
    expect(bookEntries([s1, s2])).toEqual([]);
  });

  it("breaks ties on id deterministically", () => {
    const t = "2026-01-01T00:00:00.000Z";
    expect(bookEntries([entry("z", t), entry("x", t), entry("m", t)]).map((e) => e.id)).toEqual([
      "m",
      "x",
      "z",
    ]);
  });

  it("does not mutate the input array", () => {
    const list = [entry("b", "2026-02-01T00:00:00.000Z"), entry("a", "2026-01-01T00:00:00.000Z")];
    const before = list.map((e) => e.id);
    bookEntries(list);
    expect(list.map((e) => e.id)).toEqual(before);
  });
});

describe("foldDraft", () => {
  const draft = {
    occasion: "edited occasion",
    title: "edited title",
    body: "edited body",
    photos: [photo("new-photo")],
  };

  it("edits one entry in place, leaving others and their photos untouched", () => {
    const first = entry("e1", "2026-01-01T00:00:00.000Z", ["p1"]);
    const second = entry("e2", "2026-02-01T00:00:00.000Z", ["p2", "p3"]);
    const vault = vaultWith(first, second);

    const { next, entryId } = foldDraft(vault, draft, "e1", "unused", "2026-09-01T00:00:00.000Z");

    expect(entryId).toBe("e1");
    const edited = next.entries.find((e) => e.id === "e1")!;
    expect(edited.title).toBe("edited title");
    expect(edited.occasion).toBe("edited occasion");
    expect(edited.photos.map((p) => p.id)).toEqual(["new-photo"]);
    // The other entry is byte-for-byte the same object we started with.
    const other = next.entries.find((e) => e.id === "e2")!;
    expect(other).toEqual(second);
    expect(other.photos).toEqual(second.photos);
  });

  it("prepends a new entry without disturbing existing photos", () => {
    const existing = entry("e1", "2026-01-01T00:00:00.000Z", ["p1"]);
    const vault = vaultWith(existing);

    const { next, entryId } = foldDraft(vault, draft, null, "brand-new", "2026-09-01T00:00:00.000Z");

    expect(entryId).toBe("brand-new");
    expect(next.entries[0].id).toBe("brand-new");
    expect(next.entries[0].createdAt).toBe("2026-09-01T00:00:00.000Z");
    expect(next.entries[1]).toEqual(existing);
    expect(next.entries[1].photos).toEqual(existing.photos);
  });
});

const SEALED: Sealed = {
  iv: "AAAAAAAAAAAAAAAA",
  ciphertext: "Y2lwaGVydGV4dA==",
  keyHint: "In the birthday card",
  sealedAt: "2026-09-26T00:00:00.000Z",
};

function answers(...texts: string[]): InterviewAnswer[] {
  return texts.map((answerText, i) => ({
    promptId: `q-${i}`,
    promptText: `Question ${i}?`,
    answerText,
  }));
}

function interviewEntry(id: string, createdAt: string, childAgeYears: number): Entry {
  return {
    id,
    type: "interview",
    createdAt,
    occasion: "",
    title: `Interview at age ${childAgeYears}`,
    body: "",
    photos: [],
    childAgeYears,
    answers: answers("first", "second"),
  };
}

describe("foldInterview", () => {
  const draft = {
    title: "Interview at age 3",
    childAgeYears: 3,
    answers: answers("a spaceship", "hide and seek"),
  };

  it("prepends a new interview with the interview shape and empty letter fields", () => {
    const existing = entry("e1", "2026-01-01T00:00:00.000Z", ["p1"]);
    const vault = vaultWith(existing);

    const { next, entryId } = foldInterview(vault, draft, null, "iv-new", "2026-09-01T00:00:00.000Z");

    expect(entryId).toBe("iv-new");
    const created = next.entries[0];
    expect(created.id).toBe("iv-new");
    expect(created.type).toBe("interview");
    expect(created.createdAt).toBe("2026-09-01T00:00:00.000Z");
    expect(created.childAgeYears).toBe(3);
    expect(created.answers).toEqual(draft.answers);
    expect(created.occasion).toBe("");
    expect(created.body).toBe("");
    expect(created.photos).toEqual([]);
    // The existing letter and its photos are byte-for-byte unchanged.
    expect(next.entries[1]).toEqual(existing);
    expect(next.entries[1].photos).toEqual(existing.photos);
  });

  it("edits in place by id, preserving createdAt and childAgeYears", () => {
    const iv = interviewEntry("iv1", "2026-02-01T00:00:00.000Z", 3);
    const other = entry("e2", "2026-03-01T00:00:00.000Z", ["p2", "p3"]);
    const vault = vaultWith(iv, other);

    const { next, entryId } = foldInterview(
      vault,
      { title: "Edited title", childAgeYears: 99, answers: answers("new answer") },
      "iv1",
      "unused",
      "2026-09-01T00:00:00.000Z",
    );

    expect(entryId).toBe("iv1");
    const edited = next.entries.find((e) => e.id === "iv1")!;
    // Title and answers change; createdAt and the recorded age are facts, kept.
    expect(edited.title).toBe("Edited title");
    expect(edited.answers).toEqual(answers("new answer"));
    expect(edited.createdAt).toBe("2026-02-01T00:00:00.000Z");
    expect(edited.childAgeYears).toBe(3);
    // The other entry and its photos are untouched.
    expect(next.entries.find((e) => e.id === "e2")).toEqual(other);
  });
});

describe("foldSealed strips interview plaintext", () => {
  it("removes answers and childAgeYears, keeping type and createdAt", () => {
    const iv = interviewEntry("iv1", "2026-02-01T00:00:00.000Z", 4);
    const vault = vaultWith(iv);

    const { next } = foldSealed(vault, SEALED, "iv1", "unused", "2026-09-01T00:00:00.000Z");
    const sealed = next.entries.find((e) => e.id === "iv1")!;

    expect(sealed.answers).toBeUndefined();
    expect(sealed.childAgeYears).toBeUndefined();
    expect(sealed.type).toBe("interview");
    expect(sealed.createdAt).toBe("2026-02-01T00:00:00.000Z");
    expect(sealed.title).toBe("");
    expect(sealed.body).toBe("");
    expect(sealed.occasion).toBe("");
    expect(sealed.photos).toEqual([]);
    expect(sealed.sealed).toEqual(SEALED);
    // No plaintext answer survives anywhere in the serialized entry.
    expect(JSON.stringify(sealed)).not.toContain("first");
    expect(JSON.stringify(sealed)).not.toContain("second");
  });

  it("leaves a sealed letter's shape exactly as before", () => {
    const letter = entry("e1", "2026-01-01T00:00:00.000Z", ["p1"]);
    const vault = vaultWith(letter);
    const { next } = foldSealed(vault, SEALED, "e1", "unused", "2026-09-01T00:00:00.000Z");
    const sealed = next.entries.find((e) => e.id === "e1")!;
    expect(sealed.type).toBe("letter");
    expect(sealed.answers).toBeUndefined();
    expect(sealed.childAgeYears).toBeUndefined();
    expect(sealed.sealed).toEqual(SEALED);
  });
});

describe("isSealed / unsealedEntries", () => {
  it("marks an entry sealed iff it carries a sealed blob", () => {
    const open = entry("a", "2026-01-01T00:00:00.000Z");
    const sealed: Entry = { ...entry("b", "2026-02-01T00:00:00.000Z"), sealed: SEALED };
    expect(isSealed(open)).toBe(false);
    expect(isSealed(sealed)).toBe(true);
  });

  it("excludes sealed entries from the book-facing selection", () => {
    const open = entry("a", "2026-01-01T00:00:00.000Z");
    const sealed: Entry = { ...entry("b", "2026-02-01T00:00:00.000Z"), sealed: SEALED };
    expect(unsealedEntries([open, sealed]).map((e) => e.id)).toEqual(["a"]);
  });
});

describe("foldSealed", () => {
  it("replaces the target entry in place, emptying content and keeping createdAt", () => {
    const first = entry("e1", "2026-01-01T00:00:00.000Z", ["p1"]);
    const second = entry("e2", "2026-02-01T00:00:00.000Z", ["p2", "p3"]);
    const vault = vaultWith(first, second);

    const { next, entryId } = foldSealed(vault, SEALED, "e1", "unused", "2026-09-01T00:00:00.000Z");

    expect(entryId).toBe("e1");
    const sealed = next.entries.find((e) => e.id === "e1")!;
    expect(sealed.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(sealed.title).toBe("");
    expect(sealed.occasion).toBe("");
    expect(sealed.body).toBe("");
    expect(sealed.photos).toEqual([]);
    expect(sealed.sealed).toEqual(SEALED);
    // The other entry and its photos are byte-for-byte the same.
    const other = next.entries.find((e) => e.id === "e2")!;
    expect(other).toEqual(second);
    expect(other.photos).toEqual(second.photos);
  });

  it("prepends a new sealed entry with empty content", () => {
    const existing = entry("e1", "2026-01-01T00:00:00.000Z", ["p1"]);
    const vault = vaultWith(existing);

    const { next, entryId } = foldSealed(vault, SEALED, null, "new-id", "2026-09-01T00:00:00.000Z");

    expect(entryId).toBe("new-id");
    expect(next.entries[0].id).toBe("new-id");
    expect(next.entries[0].createdAt).toBe("2026-09-01T00:00:00.000Z");
    expect(next.entries[0].title).toBe("");
    expect(next.entries[0].photos).toEqual([]);
    expect(next.entries[0].sealed).toEqual(SEALED);
    expect(next.entries[1]).toEqual(existing);
  });
});
