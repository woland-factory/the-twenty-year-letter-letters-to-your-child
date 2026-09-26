// The archive home. It opens with the integrity readout so a parent can see at
// a glance that their letters are here and which copy this file is, then lists
// the letters. When there are none, it names the product and offers the one
// thing to do.

import type { Vault } from "../vault";
import { formatCopyLine, formatEntryCount, formatSavedMoment } from "../format";

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
}: {
  vault: Vault;
  now: Date;
  onWrite: () => void;
  onOpenEntry: (id: string) => void;
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
            {vault.entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" class="entry" onClick={() => onOpenEntry(entry.id)}>
                  <div class="entry-title">{entry.title || "Untitled letter"}</div>
                  <div class="entry-date">
                    Written {formatSavedMoment(entry.createdAt, now)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" class="btn btn-primary btn-block" onClick={onWrite}>
            Write a letter
          </button>
        </>
      )}
    </main>
  );
}
