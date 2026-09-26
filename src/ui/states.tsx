// Designed loading and error surfaces. Neither is ever a blank screen or a raw
// error. The error state reassures the parent their file on disk is unchanged.

export function Loading() {
  return (
    <div class="boot" role="status" aria-live="polite">
      <div class="boot-title">Opening your file</div>
      <div class="boot-skeleton" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export function ErrorState({ heading, body }: { heading: string; body: string }) {
  return (
    <div class="page">
      <div class="state state-error" role="alert">
        <h1>{heading}</h1>
        <p>{body}</p>
      </div>
    </div>
  );
}
