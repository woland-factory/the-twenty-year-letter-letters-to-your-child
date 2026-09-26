// The archive home. It opens with the integrity readout so a parent can see at
// a glance that their letters are here and which copy this file is, then lists
// the letters. When there are none, it names the product and offers the one
// thing to do.

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

export function Home({
  vault,
  now,
  onWrite,
  onOpenEntry,
  onOpenBook,
}: {
  vault: Vault;
  now: Date;
  onWrite: () => void;
  onOpenEntry: (id: string) => void;
  onOpenBook: () => void;
}) {
  const empty = vault.entries.length === 0;

  return (
    <main class="page" id="main">
      <div class="topbar">
        <span class="brand">The Twenty-Year Letter</span>
      </div>

      {empty ? (
        <div class="state">
          <h1>Write your first letter.</h1>
          <p>It saves to your own file and stays with you.</p>
          <button type="button" class="btn btn-primary" onClick={onWrite}>
            Write a letter
          </button>
        </div>
      ) : (
        <>
          <IntegrityReadout vault={vault} now={now} />
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
            <button type="button" class="btn btn-primary btn-block" onClick={onWrite}>
              Write a letter
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
