// The yearly interview: a short set of age-aware prompts the parent records with
// their child. Two surfaces, chosen by props: the birth-date capture step (shown
// only the first time, when the child's birth date is not known yet) and the
// prompt form. Answers are recorded verbatim. The view is a pure function of its
// props: it never writes the vault, it calls the App handlers.

import type { InterviewAnswer } from "../vault";
import { SaveControls, type SavePhase } from "./SaveStatus";

export function InterviewView({
  needsBirthDate,
  childName,
  birthDate,
  captureError,
  onChildName,
  onBirthDate,
  onContinue,
  title,
  answers,
  onAnswer,
  phase,
  error,
  hint,
  canSave,
  canSeal,
  sealingReady,
  sealing,
  sealMessage,
  onSave,
  onSeal,
  onBack,
}: {
  needsBirthDate: boolean;
  childName: string;
  birthDate: string;
  captureError: string | null;
  onChildName: (v: string) => void;
  onBirthDate: (v: string) => void;
  onContinue: () => void;
  title: string;
  answers: InterviewAnswer[];
  onAnswer: (promptId: string, v: string) => void;
  phase: SavePhase;
  error: string | null;
  hint: string | null;
  canSave: boolean;
  canSeal: boolean;
  sealingReady: boolean;
  sealing: boolean;
  sealMessage: string | null;
  onSave: () => void;
  onSeal: () => void;
  onBack: () => void;
}) {
  if (needsBirthDate) {
    return (
      <main class="page" id="main">
        <div class="topbar">
          <span class="brand">Record an interview</span>
        </div>

        <h1>First, your child's birth date.</h1>
        <p class="muted">The birth date picks the right questions for your child's age.</p>

        <label class="field">
          <span class="field-label">Birth date</span>
          <input
            class="input"
            type="date"
            value={birthDate}
            onInput={(e) => onBirthDate((e.target as HTMLInputElement).value)}
          />
        </label>

        <label class="field">
          <span class="field-label">Child's name</span>
          <input
            class="input"
            type="text"
            value={childName}
            onInput={(e) => onChildName((e.target as HTMLInputElement).value)}
            placeholder="Mira"
            autocomplete="off"
          />
        </label>

        {captureError && (
          <p class="save-status-error" role="alert">
            {captureError}
          </p>
        )}

        <div class="editor-actions">
          <button
            type="button"
            class="btn btn-primary"
            onClick={onContinue}
            disabled={birthDate.trim() === ""}
          >
            Continue
          </button>
          <button type="button" class="btn btn-secondary" onClick={onBack}>
            Back to letters
          </button>
        </div>
      </main>
    );
  }

  return (
    <main class="page" id="main">
      <div class="topbar">
        <span class="brand">Record an interview</span>
      </div>

      <h1>{title}</h1>

      <ol class="interview-prompts">
        {answers.map((answer) => (
          <li class="interview-prompt" key={answer.promptId}>
            <label class="field">
              <span class="field-label">{answer.promptText}</span>
              <textarea
                class="textarea interview-answer"
                value={answer.answerText}
                onInput={(e) => onAnswer(answer.promptId, (e.target as HTMLTextAreaElement).value)}
                placeholder="Write down what your child says."
              />
            </label>
          </li>
        ))}
      </ol>

      <SaveControls
        phase={phase}
        error={error}
        hint={hint}
        canSave={canSave}
        onSave={onSave}
        onBack={onBack}
        saveLabel="Save this interview"
      />

      <div class="seal-zone">
        <button
          type="button"
          class="btn btn-tertiary btn-block"
          onClick={onSeal}
          disabled={!canSeal}
        >
          Seal this interview
        </button>
        {!sealingReady && (
          <p class="muted seal-note">
            This browser cannot seal interviews. Open your file in an up-to-date browser to seal it.
          </p>
        )}
        <div class="seal-status" role="status" aria-live="polite">
          {sealing && <span class="muted">Sealing your interview</span>}
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
