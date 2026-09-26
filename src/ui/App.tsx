// Coordinates the whole artifact: routes between the archive home, the editor,
// the interview, and the unseal view, owns the vault in memory, and drives every
// save and seal path to a calm, truthful outcome.

import { useState } from "preact/hooks";
import type { Vault, Photo, Entry, InterviewAnswer } from "../vault";
import { SaveController } from "../save";
import { randomId } from "../ids";
import {
  NotAnImageError,
  recompressImage,
  vaultPhotoBytes,
  wouldExceedBudget,
} from "../photos";
import { foldDraft, foldInterview, foldSealed, isSealed, type InterviewDraft } from "../entries";
import {
  ageInYears,
  birthdayNudge,
  interviewTitle,
  promptsForAge,
} from "../interview";
import {
  seal,
  sealingAvailable,
  unsealWithWords,
  UnsealError,
  type SealedPayload,
} from "../seal";
import { decodeQrFromFile, QrDecodeError } from "../qr";
import { Home } from "./Home";
import { BookView } from "./BookView";
import { Editor } from "./Editor";
import { InterviewView } from "./InterviewView";
import { SealDialog } from "./SealDialog";
import { KeySheet } from "./KeySheet";
import { UnsealView } from "./UnsealView";
import { StaleCopyDialog } from "./StaleCopyDialog";
import { BackupRitual } from "./BackupRitual";
import type { SavePhase } from "./SaveStatus";

const FIRST_SAVE_HINT =
  "Choose where to keep your file. After that, Save writes straight to it.";

const NOT_AN_IMAGE_MSG = "That file is not a photo. Choose a JPEG or PNG image.";
const BUDGET_MSG = "Your file has reached its photo limit. Remove a photo to add a new one.";
const SEAL_FAILED_MSG = "Sealing did not finish. Your letter is unchanged.";
const BAD_DATE_MSG = "Choose a birth date on or before today.";

const BAD_WORDS_MSG = "Those words do not match. Check each word and try again.";
const WRONG_KEY_MSG = "That key does not open this letter. Check you have the right key sheet.";
const QR_NOT_FOUND_MSG = "The code did not scan. Try a clearer photo of your key sheet.";

type Route = "home" | "editor" | "interview" | "unseal" | "book";
type SealContext = { words: string[]; keyHint: string };
type SealTarget = "letter" | "interview";

function unsealMessageFor(err: unknown): string {
  if (err instanceof QrDecodeError) return QR_NOT_FOUND_MSG;
  if (err instanceof UnsealError && err.reason === "bad-words") return BAD_WORDS_MSG;
  return WRONG_KEY_MSG;
}

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
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);

  // Interview state, kept separate from the letter draft so the two flows never
  // interfere. needsBirthDate shows the capture step; didCapture records that
  // this interview supplied the birth date, so save writes it into vault.child.
  const [interviewEditingId, setInterviewEditingId] = useState<string | null>(null);
  const [interviewTitleText, setInterviewTitleText] = useState("");
  const [interviewAge, setInterviewAge] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState<InterviewAnswer[]>([]);
  const [needsBirthDate, setNeedsBirthDate] = useState(false);
  const [didCapture, setDidCapture] = useState(false);
  const [captureName, setCaptureName] = useState("");
  const [captureBirthDate, setCaptureBirthDate] = useState("");
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Seal state. sealCtx holds the words in memory across the save (and any
  // stale prompt); keySheet is the once-shown surface after the ciphertext is
  // safely on disk; sealMessage is the calm "did not finish" note on failure.
  const [sealDialog, setSealDialog] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealMessage, setSealMessage] = useState<string | null>(null);
  const [sealCtx, setSealCtx] = useState<SealContext | null>(null);
  const [sealTarget, setSealTarget] = useState<SealTarget>("letter");
  const [keySheet, setKeySheet] = useState<SealContext | null>(null);

  // The birthday nudge, dismissed only for this session. Recording this year's
  // interview makes birthdayNudge return null structurally, so it does not
  // reappear after a real interview is saved.
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Unseal state. The revealed payload lives only here, for display; it is never
  // written back to the vault.
  const [unsealEntry, setUnsealEntry] = useState<Entry | null>(null);
  const [revealed, setRevealed] = useState<SealedPayload | null>(null);
  const [unsealOpening, setUnsealOpening] = useState(false);
  const [unsealError, setUnsealError] = useState<string | null>(null);

  const sealingReady = sealingAvailable();

  function resetDraft() {
    setTitle("");
    setOccasion("");
    setBody("");
    setPhotos([]);
    setPhotosBusy(0);
    setPhotoError(null);
    setPhase("idle");
    setSaveError(null);
    setSealing(false);
    setSealMessage(null);
  }

  // Reset the shared save/seal status so the interview flow opens clean.
  function resetInterviewStatus() {
    setPhase("idle");
    setSaveError(null);
    setSealing(false);
    setSealMessage(null);
    setCaptureError(null);
  }

  function openWrite() {
    setEditingId(null);
    resetDraft();
    setRoute("editor");
  }

  function seedInterview(age: number) {
    const band = promptsForAge(age);
    setInterviewAnswers(
      band.prompts.map((p) => ({ promptId: p.id, promptText: p.text, answerText: "" })),
    );
    setInterviewTitleText(interviewTitle(age));
    setInterviewAge(age);
    setNeedsBirthDate(false);
  }

  // Start a new interview. Without a known birth date, the capture step comes
  // first; with one, the age-appropriate prompts open straight away.
  function openInterview() {
    setInterviewEditingId(null);
    setInterviewAnswers([]);
    setInterviewTitleText("");
    setInterviewAge(0);
    setCaptureName(vault.child?.name ?? "");
    setCaptureBirthDate("");
    setDidCapture(false);
    resetInterviewStatus();

    const birthDate = vault.child?.birthDate ?? null;
    const age = birthDate ? ageInYears(birthDate, now) : null;
    if (age === null) {
      setNeedsBirthDate(true);
    } else {
      seedInterview(age);
    }
    setRoute("interview");
  }

  // The capture step's Continue: validate the entered date, then open the
  // age-appropriate prompts. The date is written to vault.child only on save.
  function continueCapture() {
    const age = ageInYears(captureBirthDate, now);
    if (age === null) {
      setCaptureError(BAD_DATE_MSG);
      return;
    }
    setDidCapture(true);
    setCaptureError(null);
    seedInterview(age);
  }

  // Reopen an unsealed interview from the archive, restoring every recorded
  // answer verbatim so editing continues exactly where it left off.
  function openInterviewEntry(id: string) {
    const entry = vault.entries.find((e) => e.id === id);
    if (!entry || entry.type !== "interview") return;
    setInterviewEditingId(id);
    setInterviewTitleText(entry.title);
    setInterviewAge(entry.childAgeYears ?? 0);
    setInterviewAnswers(entry.answers ?? []);
    setNeedsBirthDate(false);
    setDidCapture(false);
    resetInterviewStatus();
    setRoute("interview");
  }

  function openEntry(id: string) {
    const entry = vault.entries.find((e) => e.id === id);
    if (!entry) return;
    if (isSealed(entry)) {
      setUnsealEntry(entry);
      setRevealed(null);
      setUnsealError(null);
      setUnsealOpening(false);
      setRoute("unseal");
      return;
    }
    if (entry.type === "interview") {
      openInterviewEntry(id);
      return;
    }
    setEditingId(id);
    resetDraft();
    setTitle(entry.title);
    setOccasion(entry.occasion);
    setBody(entry.body);
    setPhotos(entry.photos);
    setRoute("editor");
  }

  function setAnswer(promptId: string, answerText: string) {
    setInterviewAnswers((prev) =>
      prev.map((a) => (a.promptId === promptId ? { ...a, answerText } : a)),
    );
  }

  function backToLetters() {
    setRoute("home");
  }

  function openBook() {
    setRoute("book");
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
    applyResult(result, next, entryId, null);
  }

  // The child record to save alongside an interview: a captured birth date is
  // written into vault.child, otherwise the existing child is kept.
  function childForInterviewSave(): Vault["child"] {
    if (didCapture) return { name: captureName.trim(), birthDate: captureBirthDate };
    return vault.child;
  }

  function interviewDraft(): InterviewDraft {
    return { title: interviewTitleText, childAgeYears: interviewAge, answers: interviewAnswers };
  }

  // Save an interview through the existing controller so stale-copy detection,
  // the download ritual, and the "Saved" readout all apply, exactly like a
  // letter. A captured birth date lands in vault.child on the same save.
  async function saveInterview() {
    setPhase("saving");
    setSaveError(null);
    const base = { ...vault, child: childForInterviewSave() };
    const { next, entryId } = foldInterview(
      base,
      interviewDraft(),
      interviewEditingId,
      randomId(),
      now.toISOString(),
    );
    const result = await controller.save(next);
    if (result.status === "saved") setInterviewEditingId(entryId);
    applyResult(result, next, entryId, null);
  }

  function openSealDialog(target: SealTarget) {
    setSealTarget(target);
    setSealDialog(true);
  }

  // The trust-critical seal path, shared by letters and interviews. Encrypt
  // first, then save; the sealed vault is committed and the key sheet shown ONLY
  // after the save resolves to "saved". On any other outcome the entry stays
  // unsealed and the draft is untouched.
  async function runSeal(keyHint: string) {
    setSealDialog(false);
    setSealMessage(null);
    setSealing(true);

    // Build the base vault, the payload, and the id foldSealed will replace.
    let base = vault;
    let payload: SealedPayload;
    let sealEditingId: string | null;
    if (sealTarget === "interview") {
      base = { ...vault, child: childForInterviewSave() };
      payload = {
        occasion: "",
        title: interviewTitleText,
        body: "",
        photos: [],
        childAgeYears: interviewAge,
        answers: interviewAnswers,
      };
      // Make sure the interview exists as an entry so foldSealed keeps its type
      // "interview" while stripping every plaintext field.
      if (interviewEditingId) {
        sealEditingId = interviewEditingId;
      } else {
        const folded = foldInterview(base, interviewDraft(), null, randomId(), now.toISOString());
        base = folded.next;
        sealEditingId = folded.entryId;
      }
    } else {
      payload = { occasion, title, body, photos };
      sealEditingId = editingId;
    }

    let sealed;
    let words: string[];
    try {
      ({ sealed, words } = await seal(payload, keyHint, now.toISOString()));
    } catch {
      setSealing(false);
      setSealMessage(SEAL_FAILED_MSG);
      return;
    }
    const ctx: SealContext = { words, keyHint };
    setSealCtx(ctx); // held across the save, and across a stale prompt if one appears
    const { next, entryId } = foldSealed(base, sealed, sealEditingId, randomId(), now.toISOString());
    const saveResult = await controller.save(next);
    applyResult(saveResult, next, entryId, ctx);
  }

  function applyResult(
    result: Awaited<ReturnType<SaveController["save"]>>,
    attempted: Vault,
    entryId: string,
    seal: SealContext | null,
  ) {
    if (result.status === "saved") {
      setVault(result.vault);
      setEditingId(entryId);
      if (seal) {
        // The ciphertext is now on disk, so the seal is real. Show the key once,
        // return to the archive behind it, and drop the draft.
        setSealCtx(null);
        setSealing(false);
        setPhase("idle");
        resetDraft();
        setRoute("home");
        setKeySheet(seal);
      } else {
        setPhase("saved");
        if (result.via === "download" && result.vault.savedAt) {
          setRitual({ generation: result.vault.generation, savedAt: result.vault.savedAt });
        }
      }
    } else if (result.status === "stale") {
      setPending(attempted);
      setPendingEntryId(entryId);
      setStale({ diskGeneration: result.diskGeneration, myGeneration: result.myGeneration });
      setPhase("idle");
      // sealCtx (if any) stays in memory so the key sheet can appear after the
      // parent resolves the stale prompt to a saved replace.
      if (seal) setSealing(false);
    } else if (result.status === "cancelled") {
      setPhase("idle");
      if (seal) {
        setSealCtx(null);
        setSealing(false);
        setSealMessage(SEAL_FAILED_MSG);
      }
    } else {
      if (seal) {
        setSealCtx(null);
        setSealing(false);
        setPhase("idle");
        setSealMessage(SEAL_FAILED_MSG);
      } else {
        setPhase("error");
        setSaveError(result.message);
      }
    }
  }

  async function replaceDiskCopy() {
    if (!pending) return;
    const attempted = pending;
    const entryId = pendingEntryId ?? attempted.entries[0]?.id ?? "";
    setStale(null);
    setPhase("saving");
    if (sealCtx) setSealing(true);
    const result = await controller.saveReplacingDisk(attempted);
    setPending(null);
    setPendingEntryId(null);
    applyResult(result, attempted, entryId, sealCtx);
  }

  function keepDiskCopy() {
    setStale(null);
    setPending(null);
    setPendingEntryId(null);
    setPhase("idle");
    if (sealCtx) {
      // The parent kept the disk copy, so this seal did not save. Discard the
      // words and leave the letter unsealed and intact.
      setSealCtx(null);
      setSealing(false);
      setSealMessage(SEAL_FAILED_MSG);
    }
  }

  function dismissKeySheet() {
    // The words leave memory here. They were never in the vault.
    setKeySheet(null);
  }

  async function unsealWords(words: string[]) {
    const sealed = unsealEntry?.sealed;
    if (!sealed) return;
    setUnsealError(null);
    setUnsealOpening(true);
    try {
      const payload = await unsealWithWords(sealed, words);
      setRevealed(payload);
    } catch (err) {
      setUnsealError(unsealMessageFor(err));
    } finally {
      setUnsealOpening(false);
    }
  }

  async function unsealQr(file: File) {
    const sealed = unsealEntry?.sealed;
    if (!sealed) return;
    setUnsealError(null);
    setUnsealOpening(true);
    try {
      const text = await decodeQrFromFile(file);
      const words = text.trim().split(/\s+/).filter(Boolean);
      const payload = await unsealWithWords(sealed, words);
      setRevealed(payload);
    } catch (err) {
      setUnsealError(unsealMessageFor(err));
    } finally {
      setUnsealOpening(false);
    }
  }

  function closeUnseal() {
    setRoute("home");
    setUnsealEntry(null);
    setRevealed(null);
    setUnsealError(null);
    setUnsealOpening(false);
  }

  const hint = controller.needsFilePick() ? FIRST_SAVE_HINT : null;
  const canSave =
    title.trim().length > 0 ||
    occasion.trim().length > 0 ||
    body.trim().length > 0 ||
    photos.length > 0;
  const canSeal =
    canSave && sealingReady && photosBusy === 0 && phase !== "saving" && !sealing;
  // An interview always has something to keep (recording nothing this year is
  // allowed), so it can always save and, when ready, seal.
  const canSealInterview = sealingReady && phase !== "saving" && !sealing;

  const nudge = birthdayNudge(vault, now);

  return (
    <>
      <a class="skip" href="#main">
        Skip to content
      </a>
      {route === "home" && (
        <Home
          vault={vault}
          now={now}
          nudge={nudge}
          nudgeDismissed={nudgeDismissed}
          onWrite={openWrite}
          onOpenEntry={openEntry}
          onOpenInterview={openInterview}
          onOpenBook={openBook}
          onDismissNudge={() => setNudgeDismissed(true)}
        />
      )}
      {route === "book" && (
        <BookView vault={vault} onBack={backToLetters} onWrite={openWrite} />
      )}
      {route === "editor" && (
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
          canSeal={canSeal}
          sealingReady={sealingReady}
          sealing={sealing}
          sealMessage={sealMessage}
          onTitle={setTitle}
          onOccasion={setOccasion}
          onBody={setBody}
          onAddPhotos={addPhotos}
          onCaption={setCaption}
          onMovePhoto={movePhoto}
          onRemovePhoto={removePhoto}
          onSave={runSave}
          onSeal={() => openSealDialog("letter")}
          onBack={backToLetters}
        />
      )}
      {route === "interview" && (
        <InterviewView
          needsBirthDate={needsBirthDate}
          childName={captureName}
          birthDate={captureBirthDate}
          captureError={captureError}
          onChildName={setCaptureName}
          onBirthDate={setCaptureBirthDate}
          onContinue={continueCapture}
          title={interviewTitleText}
          answers={interviewAnswers}
          onAnswer={setAnswer}
          phase={phase}
          error={saveError}
          hint={hint}
          canSave={true}
          canSeal={canSealInterview}
          sealingReady={sealingReady}
          sealing={sealing}
          sealMessage={sealMessage}
          onSave={saveInterview}
          onSeal={() => openSealDialog("interview")}
          onBack={backToLetters}
        />
      )}
      {route === "unseal" && unsealEntry && (
        <UnsealView
          entry={unsealEntry}
          revealed={revealed}
          opening={unsealOpening}
          error={unsealError}
          now={now}
          onSubmitWords={unsealWords}
          onSubmitQr={unsealQr}
          onClose={closeUnseal}
        />
      )}

      {sealDialog && (
        <SealDialog onConfirm={runSeal} onCancel={() => setSealDialog(false)} />
      )}

      {keySheet && (
        <KeySheet words={keySheet.words} keyHint={keySheet.keyHint} onDismiss={dismissKeySheet} />
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
