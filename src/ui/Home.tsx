// The archive home. It opens with the integrity readout so a parent can see at
// a glance that their letters are here and which copy this file is, then lists
// the letters and interviews. When there are none, it names the product and
// offers the one thing to do.

import type { Vault } from "../vault";
import { formatCopyLine, formatEntryCount, formatSavedMoment } from "../format";
import { isSealed, sortedEntries } from "../entries";

function IntegrityReadout({ vault, now }: { vault: Vault; now: Date }) {
  const count = formatEntryCount(vault.entries.length);
  const saved =
    vault.savedAt !== null
      ? `Saved ${formatSavedMoment(vault.savedAt, now)}.`
      : "Save to keep your first copy.";
  return (
    <div class="readout">
      <div class="readout-line">
        {count}. {saved}
      </div>
      {vault.generation > 0 && (
        <div class="readout-copy">{formatCopyLine(vault.generation)}</div>
      )}
    </div>
  );
}

function BirthdayNudge({
  onOpenInterview,
  onDismissNudge,
}: {
  onOpenInterview: () => void;
  onDismissNudge: () => void;
}) {
  return (
    <section class="nudge" aria-labelledby="nudge-heading">
      <h2 class="nudge-heading" id="nudge-heading">
        Time for this year's interview.
      </h2>
      <p class="nudge-line">A few questions with your child, kept next to this year's letters.</p>
      <div class="nudge-actions">
        <button type="button" class="btn btn-primary" onClick={onOpenInterview}>
          Record this year's interview
        </button>
        <button type="button" class="btn btn-secondary" onClick={onDismissNudge}>
          Not now
        </button>
      </div>
    </section>
  );
}

export function Home({
  vault,
  now,
  nudge,
  nudgeDismissed,
  onWrite,
  onOpenEntry,
  onOpenInterview,
  onOpenBook,
  onDismissNudge,
  highlightWrite = false,
}: {
  vault: Vault;
  now: Date;
  nudge: { age: number } | null;
  nudgeDismissed: boolean;
  onWrite: () => void;
  onOpenEntry: (id: string) => void;
  onOpenInterview: () => void;
  onOpenBook: () => void;
  onDismissNudge: () => void;
  highlightWrite?: boolean;
}) {
  const empty = vault.entries.length === 0;
  const writeClass = `btn btn-primary${highlightWrite ? " walk-highlight" : ""}`;

  return (
    <main class="page" id="main">
      <div class="topbar">
        <span class="brand">The Twenty-Year Letter</span>
      </div>

      {empty ? (
        <div class="state">
          <h1>Write your first letter.</h1>
          <p>It saves to your own file and stays with you.</p>
          <button type="button" class={writeClass} onClick={onWrite}>
            Write a letter
          </button>
        </div>
      ) : (
        <>
          <IntegrityReadout vault={vault} now={now} />
          {nudge && !nudgeDismissed && (
            <BirthdayNudge onOpenInterview={onOpenInterview} onDismissNudge={onDismissNudge} />
          )}
          <ul class="entries">
            {sortedEntries(vault.entries).map((entry) => {
              // A sealed entry has no readable content in the file, so it shows
              // as a locked placeholder: a lock, "Sealed letter", the key hint,
              // and the date. Opening it routes to the unseal view.
              if (isSealed(entry)) {
                const keyHint = entry.sealed?.keyHint ?? "";
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      class="entry entry-sealed"
                      onClick={() => onOpenEntry(entry.id)}
                    >
                      <span class="entry-lock" aria-hidden="true">
                        🔒
                      </span>
                      <span class="entry-text">
                        <span class="entry-title">
                          <span class="visually-hidden">Sealed. </span>Sealed letter
                        </span>
                        {keyHint && <span class="entry-occasion">{keyHint}</span>}
                        <span class="entry-date">
                          Written {formatSavedMoment(entry.createdAt, now)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              // An unsealed interview: no thumbnail, marked as an interview,
              // opening back into the interview flow in edit mode.
              if (entry.type === "interview") {
                const title = entry.title || "Interview";
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      class="entry entry-interview"
                      onClick={() => onOpenEntry(entry.id)}
                    >
                      <span class="entry-text">
                        <span class="entry-occasion">Yearly interview</span>
                        <span class="entry-title">{title}</span>
                        <span class="entry-date">
                          Recorded {formatSavedMoment(entry.createdAt, now)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              const cover = entry.photos?.[0];
              const title = entry.title || "Untitled letter";
              return (
                <li key={entry.id}>
                  <button type="button" class="entry" onClick={() => onOpenEntry(entry.id)}>
                    {cover && (
                      <img
                        class="entry-thumb"
                        src={cover.dataUrl}
                        alt={cover.caption || `Photo from your letter "${title}"`}
                        width={cover.w}
                        height={cover.h}
                      />
                    )}
                    <span class="entry-text">
                      <span class="entry-title">{title}</span>
                      {entry.occasion && <span class="entry-occasion">{entry.occasion}</span>}
                      <span class="entry-date">
                        Written {formatSavedMoment(entry.createdAt, now)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div class="archive-actions">
            <button type="button" class={`${writeClass} btn-block`} onClick={onWrite}>
              Write a letter
            </button>
            <button type="button" class="btn btn-secondary btn-block" onClick={onOpenInterview}>
              Record an interview
            </button>
            <button type="button" class="btn btn-secondary btn-block" onClick={onOpenBook}>
              Open the book
            </button>
          </div>
        </>
      )}
    </main>
  );
}
