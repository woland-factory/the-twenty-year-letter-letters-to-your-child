// Coordinates the whole artifact: routes between the archive home and the
// editor, owns the vault in memory, and drives every save path to a calm,
// truthful outcome.

import { useState } from "preact/hooks";
import type { Vault, Photo } from "../vault";
import { SaveController } from "../save";
import { randomId } from "../ids";
import {
  NotAnImageError,
  recompressImage,
  vaultPhotoBytes,
  wouldExceedBudget,
} from "../photos";
import { foldDraft } from "../entries";
import { Home } from "./Home";
import { Editor } from "./Editor";
import { StaleCopyDialog } from "./StaleCopyDialog";
import { BackupRitual } from "./BackupRitual";
import type { SavePhase } from "./SaveStatus";

const FIRST_SAVE_HINT =
  "Choose where to keep your file. After that, Save writes straight to it.";

const NOT_AN_IMAGE_MSG = "That file is not a photo. Choose a JPEG or PNG image.";
const BUDGET_MSG = "Your file has reached its photo limit. Remove a photo to add a new one.";

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
  const [occasion, setOccasion] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosBusy, setPhotosBusy] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stale, setStale] = useState<{ diskGeneration: number; myGeneration: number } | null>(
    null,
  );
  const [ritual, setRitual] = useState<{ generation: number; savedAt: string } | null>(null);
  const [pending, setPending] = useState<Vault | null>(null);

  function resetDraft() {
    setTitle("");
    setOccasion("");
    setBody("");
    setPhotos([]);
    setPhotosBusy(0);
    setPhotoError(null);
    setPhase("idle");
    setSaveError(null);
  }

  function openWrite() {
    setEditingId(null);
    resetDraft();
    setRoute("editor");
  }

  function openEntry(id: string) {
    const entry = vault.entries.find((e) => e.id === id);
    if (!entry) return;
    setEditingId(id);
    resetDraft();
    setTitle(entry.title);
    setOccasion(entry.occasion);
    setBody(entry.body);
    setPhotos(entry.photos);
    setRoute("editor");
  }

  function backToLetters() {
    setRoute("home");
  }

  // Photo bytes already committed to the file that this save will keep. When
  // editing, the entry's own photos are replaced by the draft, so they do not
  // count toward the budget twice.
  function committedOtherBytes(): number {
    const all = vaultPhotoBytes(vault);
    if (!editingId) return all;
    const entry = vault.entries.find((e) => e.id === editingId);
    const own = (entry?.photos ?? []).reduce((sum, p) => sum + p.bytes, 0);
    return all - own;
  }

  // Recompress each chosen file and add it if it fits the budget. Runs the
  // files sequentially so a large photo never freezes the page, and shows the
  // plain message for the first file that is not an image or would overflow.
  async function addPhotos(files: File[]) {
    if (files.length === 0) return;
    setPhotoError(null);
    const otherBytes = committedOtherBytes();
    let working = photos;
    let draftBytes = working.reduce((sum, p) => sum + p.bytes, 0);
    let hitBudget = false;
    let notImage = false;

    for (const file of files) {
      setPhotosBusy((n) => n + 1);
      try {
        const recompressed = await recompressImage(file);
        if (wouldExceedBudget(otherBytes + draftBytes, recompressed.bytes)) {
          hitBudget = true;
          continue;
        }
        const photo: Photo = { ...recompressed, id: randomId(), caption: "" };
        working = [...working, photo];
        draftBytes += photo.bytes;
        setPhotos(working);
      } catch (err) {
        if (err instanceof NotAnImageError) notImage = true;
        else notImage = true; // any decode failure reads as "not a photo"
      } finally {
        setPhotosBusy((n) => n - 1);
      }
    }

    if (hitBudget) setPhotoError(BUDGET_MSG);
    else if (notImage) setPhotoError(NOT_AN_IMAGE_MSG);
  }

  function setCaption(id: string, caption: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function movePhoto(index: number, delta: number) {
    setPhotos((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function removePhoto(id: string) {
    setPhotoError(null);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  // Fold the current draft into the vault, then hand it to the save controller,
  // which stamps the copy number and saved time. foldDraft maps entries in
  // place by id, so every other entry and its photos stay untouched.
  function buildVaultWithDraft(): { next: Vault; entryId: string } {
    return foldDraft(vault, { occasion, title, body, photos }, editingId, randomId(), now.toISOString());
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
  const canSave =
    title.trim().length > 0 ||
    occasion.trim().length > 0 ||
    body.trim().length > 0 ||
    photos.length > 0;

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
          occasion={occasion}
          body={body}
          photos={photos}
          photosBusy={photosBusy > 0}
          photoError={photoError}
          phase={phase}
          error={saveError}
          hint={hint}
          canSave={canSave}
          onTitle={setTitle}
          onOccasion={setOccasion}
          onBody={setBody}
          onAddPhotos={addPhotos}
          onCaption={setCaption}
          onMovePhoto={movePhoto}
          onRemovePhoto={removePhoto}
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
