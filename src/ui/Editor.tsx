// The writing room: a letter (title, occasion, body) and its photos. Photos
// are recompressed before they enter the file, so what the parent sees added
// is exactly what saves. The letter is the focus; the photo controls sit below
// it and stay visibly subordinate.

import { useRef } from "preact/hooks";
import type { Photo } from "../vault";
import { SaveControls, type SavePhase } from "./SaveStatus";

export function Editor({
  title,
  occasion,
  body,
  photos,
  photosBusy,
  photoError,
  phase,
  error,
  hint,
  canSave,
  canSeal,
  sealingReady,
  sealing,
  sealMessage,
  onTitle,
  onOccasion,
  onBody,
  onAddPhotos,
  onCaption,
  onMovePhoto,
  onRemovePhoto,
  onSave,
  onSeal,
  onBack,
  highlight = null,
}: {
  title: string;
  occasion: string;
  body: string;
  photos: Photo[];
  photosBusy: boolean;
  photoError: string | null;
  phase: SavePhase;
  error: string | null;
  hint: string | null;
  canSave: boolean;
  canSeal: boolean;
  sealingReady: boolean;
  sealing: boolean;
  sealMessage: string | null;
  highlight?: "save" | "backup" | "seal" | null;
  onTitle: (v: string) => void;
  onOccasion: (v: string) => void;
  onBody: (v: string) => void;
  onAddPhotos: (files: File[]) => void;
  onCaption: (id: string, v: string) => void;
  onMovePhoto: (index: number, delta: number) => void;
  onRemovePhoto: (id: string) => void;
  onSave: () => void;
  onSeal: () => void;
  onBack: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    onAddPhotos(files);
    input.value = ""; // allow re-picking the same file
  }

  return (
    <main class="page" id="main">
      <div class="topbar">
        <h1 class="brand">Write a letter</h1>
      </div>

      <label class="field">
        <span class="field-label">Title</span>
        <input
          class="input"
          type="text"
          value={title}
          onInput={(e) => onTitle((e.target as HTMLInputElement).value)}
          placeholder="The night you came home"
          autocomplete="off"
        />
      </label>

      <label class="field">
        <span class="field-label">Occasion</span>
        <input
          class="input"
          type="text"
          value={occasion}
          onInput={(e) => onOccasion((e.target as HTMLInputElement).value)}
          placeholder="First birthday"
          autocomplete="off"
        />
      </label>

      <label class="field">
        <span class="field-label">Your letter</span>
        <textarea
          class="textarea"
          value={body}
          onInput={(e) => onBody((e.target as HTMLTextAreaElement).value)}
          placeholder="Write to your child. They will read this one day."
        />
      </label>

      <section class="photos" aria-labelledby="photos-heading">
        <h2 class="field-label" id="photos-heading">
          Photos
        </h2>

        <input
          ref={fileRef}
          class="visually-hidden"
          type="file"
          accept="image/*"
          multiple
          aria-label="Add photos"
          onChange={pickFiles}
        />
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={photosBusy}
        >
          Add photos
        </button>

        <div class="photo-status" role="status" aria-live="polite">
          {photosBusy && <span class="muted">Adding your photo</span>}
        </div>
        {photoError && (
          <p class="photo-error" role="alert">
            {photoError}
          </p>
        )}

        {photos.length > 0 && (
          <ul class="photo-grid">
            {photos.map((photo, index) => (
              <li class="photo-card" key={photo.id}>
                <img
                  class="photo-thumb"
                  src={photo.dataUrl}
                  alt={photo.caption || `Photo from your letter "${title || "Untitled letter"}"`}
                  width={photo.w}
                  height={photo.h}
                />
                <label class="photo-caption">
                  <span class="visually-hidden">Add a caption</span>
                  <input
                    class="input"
                    type="text"
                    value={photo.caption}
                    onInput={(e) => onCaption(photo.id, (e.target as HTMLInputElement).value)}
                    placeholder="Add a caption"
                    autocomplete="off"
                  />
                </label>
                <div class="photo-controls">
                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    aria-label="Move photo up"
                    disabled={index === 0}
                    onClick={() => onMovePhoto(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    aria-label="Move photo down"
                    disabled={index === photos.length - 1}
                    onClick={() => onMovePhoto(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    aria-label="Remove photo"
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SaveControls
        phase={phase}
        error={error}
        hint={hint}
        canSave={canSave}
        onSave={onSave}
        onBack={onBack}
        highlightSave={highlight === "save"}
        highlightBackup={highlight === "backup"}
      />

      <div class="seal-zone">
        <button
          type="button"
          class={`btn btn-tertiary btn-block${highlight === "seal" ? " walk-highlight" : ""}`}
          onClick={onSeal}
          disabled={!canSeal}
        >
          Seal this letter
        </button>
        {!sealingReady && (
          <p class="muted seal-note">
            This browser cannot seal letters. Open your file in an up-to-date browser to seal it.
          </p>
        )}
        <div class="seal-status" role="status" aria-live="polite">
          {sealing && <span class="muted">Sealing your letter</span>}
        </div>
        {sealMessage && (
          <p class="seal-message" role="alert">
            {sealMessage}
          </p>
        )}
      </div>
    </main>
  );
}
