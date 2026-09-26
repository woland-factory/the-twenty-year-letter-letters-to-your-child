// Shown after a download-path save. It names which copy is now the real one and
// gives it an identity a parent can read on the file itself, so test-reading a
// copy never leaves them unsure which file is canonical.

import { formatFullMoment } from "../format";

export function BackupRitual({
  generation,
  savedAt,
  onDone,
}: {
  generation: number;
  savedAt: string;
  onDone: () => void;
}) {
  return (
    <div class="backdrop" role="presentation">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ritual-title"
        aria-describedby="ritual-body"
      >
        <h2 id="ritual-title">Your newest copy just downloaded.</h2>
        <p id="ritual-body">
          Keep this one as your real file. Replace the older copy in your folder with it.
        </p>
        <div class="identity">
          Copy {generation}, saved {formatFullMoment(savedAt)}.
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-primary" onClick={onDone}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
