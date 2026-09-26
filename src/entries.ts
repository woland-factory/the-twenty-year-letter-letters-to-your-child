// Pure entry-list logic, kept out of the components so it can be tested without
// a browser: how the archive orders entries, and how a draft folds back into
// the vault without disturbing anyone else's letter or photos.

import type { Entry, Photo, Sealed, Vault } from "./vault";

export type Draft = {
  occasion: string;
  title: string;
  body: string;
  photos: Photo[];
};

// Newest first, with a stable tiebreak on id so the order never depends on
// storage order or wobbles between renders.
export function sortedEntries(entries: Entry[]): Entry[] {
  return entries.slice().sort((a, b) => {
    if (a.createdAt < b.createdAt) return 1;
    if (a.createdAt > b.createdAt) return -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// Fold a draft into the vault. Editing maps entries in place by id, so every
// other entry and its photos are left exactly as they were. A new entry is
// prepended. Pure: the caller supplies the id and timestamp for a new entry.
export function foldDraft(
  vault: Vault,
  draft: Draft,
  editingId: string | null,
  newId: string,
  createdAt: string,
): { next: Vault; entryId: string } {
  if (editingId) {
    const entries = vault.entries.map((e) =>
      e.id === editingId
        ? {
            ...e,
            occasion: draft.occasion,
            title: draft.title,
            body: draft.body,
            photos: draft.photos,
          }
        : e,
    );
    return { next: { ...vault, entries }, entryId: editingId };
  }
  const entry: Entry = {
    id: newId,
    type: "letter",
    createdAt,
    occasion: draft.occasion,
    title: draft.title,
    body: draft.body,
    photos: draft.photos,
  };
  return { next: { ...vault, entries: [entry, ...vault.entries] }, entryId: newId };
}

// An entry is sealed iff it carries a sealed blob. Pure predicate so the archive
// and the future book can both branch on it without duplicating the rule.
export function isSealed(entry: Entry): boolean {
  return entry.sealed != null;
}

// The book-facing selection (EPIC 4 will consume it): sealed letters are
// excluded because their content lives only behind the paper key.
export function unsealedEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !isSealed(e));
}

// Fold a sealed blob into the vault, mirroring foldDraft. Editing replaces the
// target entry in place, keeping its id and createdAt but emptying every content
// field and setting the sealed blob, so its plaintext and photos leave the file.
// A new seal is prepended. Every other entry and its photos are left untouched.
export function foldSealed(
  vault: Vault,
  sealed: Sealed,
  editingId: string | null,
  newId: string,
  createdAt: string,
): { next: Vault; entryId: string } {
  if (editingId) {
    const entries = vault.entries.map((e) =>
      e.id === editingId
        ? {
            ...e,
            occasion: "",
            title: "",
            body: "",
            photos: [],
            sealed,
          }
        : e,
    );
    return { next: { ...vault, entries }, entryId: editingId };
  }
  const entry: Entry = {
    id: newId,
    type: "letter",
    createdAt,
    occasion: "",
    title: "",
    body: "",
    photos: [],
    sealed,
  };
  return { next: { ...vault, entries: [entry, ...vault.entries] }, entryId: newId };
}
