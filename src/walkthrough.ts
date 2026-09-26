// The first-run walkthrough model. Pure data and one boot predicate, with no
// Preact import, so it is fully unit-testable and is the single source of truth
// for the step order, the step copy, and whether the walk starts at all.

import type { Vault } from "./vault";

export type WalkStep = "write" | "save" | "backup" | "seal";

// The ordered path. Four steps, one for each real control the parent touches:
// write a letter, save the file, understand the copy to reopen, seal a letter.
export const WALK_STEPS: WalkStep[] = ["write", "save", "backup", "seal"];

// One short imperative sentence per step. Ships verbatim; copy-swept.
export const WALK_COPY: Record<WalkStep, string> = {
  write: "Write your first letter.",
  save: "Save it to your own file.",
  backup: "Keep this saved copy as the one you reopen.",
  seal: "Seal a letter to lock it.",
};

// True only for a brand-new parent: no first-run success recorded and no
// content yet. A returning parent has either saved before (firstRunDone) or
// already holds letters, so the walk never shows for them.
export function firstRunPending(vault: Vault): boolean {
  return !vault.firstRunDone && vault.entries.length === 0;
}
