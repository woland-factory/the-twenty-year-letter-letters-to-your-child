// The save button and its plain-language status. Saving is the most important
// interaction in the whole product, so the feedback is immediate (a pressed
// "Saving" state) and the confirmation says, in the product's voice, that the
// file is safe.

export type SavePhase = "idle" | "saving" | "saved" | "error";

export function SaveControls({
  phase,
  error,
  hint,
  canSave,
  onSave,
  onBack,
}: {
  phase: SavePhase;
  error: string | null;
  hint: string | null;
  canSave: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div class="editor-actions">
        <button
          type="button"
          class="btn btn-primary"
          onClick={onSave}
          disabled={phase === "saving" || !canSave}
        >
          {phase === "saving" ? "Saving" : "Save"}
        </button>
        <button type="button" class="btn btn-secondary" onClick={onBack}>
          Back to letters
        </button>
      </div>
      {hint && phase === "idle" && <p class="muted">{hint}</p>}
      <div class="save-status" role="status" aria-live="polite">
        {phase === "saved" && (
          <span class="save-status-saved">Saved. Your file is up to date.</span>
        )}
        {phase === "error" && error && <span class="save-status-error">{error}</span>}
      </div>
    </div>
  );
}
