// The minimal writing surface: a title and the letter itself. Enough to prove
// one plain letter round-trips into the file and back. The richer writing room
// comes later.

import { SaveControls, type SavePhase } from "./SaveStatus";

export function Editor({
  title,
  body,
  phase,
  error,
  hint,
  canSave,
  onTitle,
  onBody,
  onSave,
  onBack,
}: {
  title: string;
  body: string;
  phase: SavePhase;
  error: string | null;
  hint: string | null;
  canSave: boolean;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <main class="page" id="main">
      <div class="topbar">
        <span class="brand">Write a letter</span>
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
        <span class="field-label">Your letter</span>
        <textarea
          class="textarea"
          value={body}
          onInput={(e) => onBody((e.target as HTMLTextAreaElement).value)}
          placeholder="Write to your child. They will read this one day."
        />
      </label>

      <SaveControls
        phase={phase}
        error={error}
        hint={hint}
        canSave={canSave}
        onSave={onSave}
        onBack={onBack}
      />
    </main>
  );
}
