// Opening a sealed letter, the path a grown child walks in 2044 with only paper
// and an offline browser. Two ways in, both feeding one decryption: type the 24
// words, or open a photo of the QR. On success the letter is shown read-only, in
// memory only. On a wrong or mistyped key it fails calmly with a clear next step
// and the file is never touched.

import { useRef, useState } from "preact/hooks";
import type { Entry } from "../vault";
import type { SealedPayload } from "../seal";
import { formatSavedMoment } from "../format";

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}

export function UnsealView({
  entry,
  revealed,
  opening,
  error,
  now,
  onSubmitWords,
  onSubmitQr,
  onClose,
}: {
  entry: Entry;
  revealed: SealedPayload | null;
  opening: boolean;
  error: string | null;
  now: Date;
  onSubmitWords: (words: string[]) => void;
  onSubmitQr: (file: File) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const keyHint = entry.sealed?.keyHint ?? "";
  const count = countWords(text);

  function submitWords() {
    const words = text.trim().split(/\s+/).filter(Boolean);
    onSubmitWords(words);
  }

  function pickQr(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) onSubmitQr(file);
  }

  if (revealed) {
    // A revealed interview carries answers instead of a body: show the title,
    // the date, and each recorded question with its answer, read-only.
    if (revealed.answers) {
      const title = revealed.title || "Interview";
      return (
        <main class="page" id="main">
          <div class="topbar">
            <span class="brand">Open a sealed interview</span>
          </div>
          <p class="reveal-note">
            This interview is open only on this screen. It stays sealed in your file.
          </p>
          <article class="reveal">
            <h1 class="reveal-title">{title}</h1>
            <p class="reveal-date muted">Recorded {formatSavedMoment(entry.createdAt, now)}</p>
            <dl class="reveal-answers">
              {revealed.answers.map((answer) => (
                <div class="reveal-answer" key={answer.promptId}>
                  <dt class="reveal-question">{answer.promptText}</dt>
                  <dd class="reveal-answer-text">{answer.answerText}</dd>
                </div>
              ))}
            </dl>
          </article>
          <button type="button" class="btn btn-secondary btn-block" onClick={onClose}>
            Close
          </button>
        </main>
      );
    }
    const title = revealed.title || "Untitled letter";
    return (
      <main class="page" id="main">
        <div class="topbar">
          <span class="brand">Open a sealed letter</span>
        </div>
        <p class="reveal-note">
          This letter is open only on this screen. It stays sealed in your file.
        </p>
        <article class="reveal">
          <h1 class="reveal-title">{title}</h1>
          {revealed.occasion && <p class="reveal-occasion">{revealed.occasion}</p>}
          <p class="reveal-date muted">Written {formatSavedMoment(entry.createdAt, now)}</p>
          <div class="reveal-body">{revealed.body}</div>
          {revealed.photos.length > 0 && (
            <ul class="reveal-photos">
              {revealed.photos.map((photo) => (
                <li key={photo.id}>
                  <img
                    class="reveal-photo"
                    src={photo.dataUrl}
                    alt={photo.caption || `Photo from "${title}"`}
                    width={photo.w}
                    height={photo.h}
                  />
                  {photo.caption && <p class="reveal-caption muted">{photo.caption}</p>}
                </li>
              ))}
            </ul>
          )}
        </article>
        <button type="button" class="btn btn-secondary btn-block" onClick={onClose}>
          Close
        </button>
      </main>
    );
  }

  return (
    <main class="page" id="main">
      <div class="topbar">
        <span class="brand">Open a sealed letter</span>
      </div>
      {keyHint.trim() !== "" && <p class="unseal-hint">Where the key lives: {keyHint}</p>}

      <label class="field">
        <span class="field-label">Type your 24 words</span>
        <textarea
          class="textarea words-input"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Type or paste the 24 words from your key sheet"
        />
      </label>
      <p class="word-count muted">{count} of 24 words</p>

      <div class="unseal-actions">
        <button
          type="button"
          class="btn btn-primary"
          disabled={opening || count === 0}
          onClick={submitWords}
        >
          {opening ? "Opening your letter" : "Open this letter"}
        </button>

        <input
          ref={fileRef}
          class="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Photo of your QR code"
          onChange={pickQr}
        />
        <button
          type="button"
          class="btn btn-secondary"
          disabled={opening}
          onClick={() => fileRef.current?.click()}
        >
          Open with the QR photo
        </button>
      </div>

      <div class="unseal-status" role="status" aria-live="polite">
        {opening && <span class="muted">Opening your letter</span>}
      </div>
      {error && (
        <p class="unseal-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" class="btn btn-secondary btn-block" onClick={onClose}>
        Close
      </button>
    </main>
  );
}
