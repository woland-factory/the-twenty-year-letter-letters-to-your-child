// Shown on the Chromium path when the file on disk is a newer copy than the one
// the parent has open. This is a trust feature, not an edge case: we never
// overwrite a newer copy without asking.

export function StaleCopyDialog({
  diskGeneration,
  myGeneration,
  onReplace,
  onKeepDisk,
}: {
  diskGeneration: number;
  myGeneration: number;
  onReplace: () => void;
  onKeepDisk: () => void;
}) {
  return (
    <div class="backdrop" role="presentation">
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="stale-title"
        aria-describedby="stale-body"
      >
        <h2 id="stale-title">The file on disk is newer than this one.</h2>
        <p id="stale-body">
          The copy on disk is copy {diskGeneration}. The copy you have open is copy{" "}
          {myGeneration}. You can replace the disk copy with your open one, or keep the disk
          copy and start again from it.
        </p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-primary" onClick={onReplace}>
            Replace with my open copy
          </button>
          <button type="button" class="btn btn-secondary" onClick={onKeepDisk}>
            Keep the disk copy
          </button>
        </div>
      </div>
    </div>
  );
}
