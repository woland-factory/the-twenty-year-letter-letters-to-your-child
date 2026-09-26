// Coordinates the whole artifact: routes between the archive home and the
// editor, owns the vault in memory, and drives every save path to a calm,
// truthful outcome.

import { useState } from "preact/hooks";
import type { Vault, Entry } from "../vault";
import { SaveController } from "../save";
import { randomId } from "../ids";
import { Home } from "./Home";
import { Editor } from "./Editor";
import { StaleCopyDialog } from "./StaleCopyDialog";
import { BackupRitual } from "./BackupRitual";
import type { SavePhase } from "./SaveStatus";

const FIRST_SAVE_HINT =
  "Choose where to keep your file. After that, Save writes straight to it.";

type Route = "home" | "editor";

export function App({
  initialVault,
  controller,
  now = new Date(),
}: {
  initialVault: Vault;
  controller: SaveController;
  now?: Date;
}) {
  const [vault, setVault] = useState<Vault>(initialVault);
  const [route, setRoute] = useState<Route>("home");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stale, setStale] = useState<{ diskGeneration: number; myGeneration: number } | null>(
    null,
  );
  const [ritual, setRitual] = useState<{ generation: number; savedAt: string } | null>(null);
  const [pending, setPending] = useState<Vault | null>(null);

  function openWrite() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setPhase("idle");
    setSaveError(null);
    setRoute("editor");
  }

  function openEntry(id: string) {
    const entry = vault.entries.find((e) => e.id === id);
    if (!entry) return;
    setEditingId(id);
    setTitle(entry.title);
    setBody(entry.body);
    setPhase("idle");
    setSaveError(null);
    setRoute("editor");
  }

  function backToLetters() {
    setRoute("home");
  }

  // Fold the current draft into the vault, then hand it to the save controller,
  // which stamps the copy number and saved time.
  function buildVaultWithDraft(): { next: Vault; entryId: string } {
    const nowIso = now.toISOString();
    if (editingId) {
      const entries = vault.entries.map((e) =>
        e.id === editingId ? { ...e, title, body } : e,
      );
      return { next: { ...vault, entries }, entryId: editingId };
    }
    const entry: Entry = {
      id: randomId(),
      type: "letter",
      createdAt: nowIso,
      title,
      body,
    };
    return { next: { ...vault, entries: [entry, ...vault.entries] }, entryId: entry.id };
  }

  async function runSave() {
    setPhase("saving");
    setSaveError(null);
    const { next, entryId } = buildVaultWithDraft();
    const result = await controller.save(next);
    applyResult(result, next, entryId);
  }

  function applyResult(
    result: Awaited<ReturnType<SaveController["save"]>>,
    attempted: Vault,
    entryId: string,
  ) {
    if (result.status === "saved") {
      setVault(result.vault);
      setEditingId(entryId);
      setPhase("saved");
      if (result.via === "download" && result.vault.savedAt) {
        setRitual({ generation: result.vault.generation, savedAt: result.vault.savedAt });
      }
    } else if (result.status === "stale") {
      setPending(attempted);
      setStale({ diskGeneration: result.diskGeneration, myGeneration: result.myGeneration });
      setPhase("idle");
    } else if (result.status === "cancelled") {
      setPhase("idle");
    } else {
      setPhase("error");
      setSaveError(result.message);
    }
  }

  async function replaceDiskCopy() {
    if (!pending) return;
    const attempted = pending;
    const entryId = editingId ?? attempted.entries[0]?.id ?? "";
    setStale(null);
    setPhase("saving");
    const result = await controller.saveReplacingDisk(attempted);
    setPending(null);
    applyResult(result, attempted, entryId);
  }

  function keepDiskCopy() {
    setStale(null);
    setPending(null);
    setPhase("idle");
  }

  const hint = controller.needsFilePick() ? FIRST_SAVE_HINT : null;
  const canSave = title.trim().length > 0 || body.trim().length > 0;

  return (
    <>
      <a class="skip" href="#main">
        Skip to content
      </a>
      {route === "home" ? (
        <Home vault={vault} now={now} onWrite={openWrite} onOpenEntry={openEntry} />
      ) : (
        <Editor
          title={title}
          body={body}
          phase={phase}
          error={saveError}
          hint={hint}
          canSave={canSave}
          onTitle={setTitle}
          onBody={setBody}
          onSave={runSave}
          onBack={backToLetters}
        />
      )}

      {stale && (
        <StaleCopyDialog
          diskGeneration={stale.diskGeneration}
          myGeneration={stale.myGeneration}
          onReplace={replaceDiskCopy}
          onKeepDisk={keepDiskCopy}
        />
      )}

      {ritual && (
        <BackupRitual
          generation={ritual.generation}
          savedAt={ritual.savedAt}
          onDone={() => setRitual(null)}
        />
      )}
    </>
  );
}
