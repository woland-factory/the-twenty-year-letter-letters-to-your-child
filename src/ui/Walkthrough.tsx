// The coach strip: a small non-modal region pinned to the bottom of the screen
// that points a brand-new parent at the next real control, one short sentence at
// a time. It never covers or disables the control it points at, never traps
// focus, and is skippable at every step.

import { WALK_COPY, type WalkStep } from "../walkthrough";

export function Walkthrough({
  step,
  stepNumber,
  totalSteps,
  canAdvance,
  onAdvance,
  onSkip,
}: {
  step: WalkStep;
  stepNumber: number;
  totalSteps: number;
  canAdvance: boolean;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  return (
    <section class="walk no-print" role="region" aria-label="Getting started">
      <div class="walk-inner">
        <p class="walk-step">
          Step {stepNumber} of {totalSteps}
        </p>
        <p class="walk-line" aria-live="polite">
          {WALK_COPY[step]}
        </p>
        <div class="walk-actions">
          {canAdvance && (
            <button type="button" class="btn btn-primary" onClick={onAdvance}>
              Got it
            </button>
          )}
          <button
            type="button"
            class="btn btn-secondary"
            aria-label="Skip the walkthrough"
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      </div>
    </section>
  );
}
