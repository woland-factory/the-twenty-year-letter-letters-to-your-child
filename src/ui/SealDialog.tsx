// The seal dialog: the deliberate gate before the one irreversible step in the
// product. It states plainly what sealing means, takes a key hint, and refuses
// to confirm until the parent acknowledges they have a safe place for the key.
// Modeled on StaleCopyDialog: backdrop, alertdialog role, focus trapped, Escape
// and backdrop cancel (never confirm).

import { useEffect, useRef, useState } from "preact/hooks";

export function SealDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (keyHint: string) => void;
  onCancel: () => void;
}) {
  const [keyHint, setKeyHint] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog on open, onto Cancel (never the confirm button),
  // and send Escape to cancel. Return focus is handled by the editor re-render.
  useEffect(() => {
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div class="backdrop" role="presentation" onClick={onCancel}>
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="seal-title"
        aria-describedby="seal-body"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="seal-title">Seal this letter?</h2>
        <p id="seal-body">
          Sealing locks this letter. Only the printed key opens it. A lost key means this
          letter cannot be opened, and the book prints only unsealed letters.
        </p>

        <label class="field">
          <span class="field-label">Where will you keep the key?</span>
          <input
            class="input"
            type="text"
            value={keyHint}
            onInput={(e) => setKeyHint((e.target as HTMLInputElement).value)}
            placeholder="In your 18th birthday card"
            autocomplete="off"
          />
        </label>

        <label class="ack">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged((e.target as HTMLInputElement).checked)}
          />
          <span>I have a safe place for the key.</span>
        </label>

        <div class="dialog-actions">
          <button
            type="button"
            class="btn btn-primary"
            disabled={!acknowledged}
            onClick={() => onConfirm(keyHint)}
          >
            Seal and show my key
          </button>
          <button type="button" class="btn btn-secondary" ref={cancelRef} onClick={onCancel}>
            Keep it open
          </button>
        </div>
      </div>
    </div>
  );
}
