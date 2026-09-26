import { describe, expect, it } from "vitest";
import { foldDraft, sortedEntries } from "../../src/entries";
import { emptyVault, type Entry, type Photo, type Vault } from "../../src/vault";

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
