// Pure entry-list logic, kept out of the components so it can be tested without
// a browser: how the archive orders entries, and how a draft folds back into
// the vault without disturbing anyone else's letter or photos.

import type { Entry, Photo, Vault } from "./vault";

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
