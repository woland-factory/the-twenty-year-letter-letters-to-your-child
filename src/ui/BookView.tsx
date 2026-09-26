// The book: every unsealed letter typeset into one readable, printable book.
// It is a pure read of the vault. There is no stored book and no "generate"
// step, so opening it always shows exactly what the file holds right now. The
// browser's own Print (and Print to PDF) turns it into paper, the always
// available fallback if a browser in 2044 cannot open the file.

import type { Vault } from "../vault";
import { bookEntries, isSealed } from "../entries";
import { formatBookDate, formatEntryCount } from "../format";

export function BookView({
  vault,
  onBack,
  onWrite,
}: {
  vault: Vault;
  onBack: () => void;
  onWrite: () => void;
}) {
  const entries = bookEntries(vault.entries);
  const empty = entries.length === 0;
  const hasSealed = vault.entries.some(isSealed);
  const bookTitle = vault.child?.name ? `Letters to ${vault.child.name}` : "Your letters";

  return (
    <main class="page book-page" id="main">
      <div class="topbar book-toolbar no-print">
        <span class="brand">The book</span>
        <div class="book-toolbar-actions">
          <button type="button" class="btn btn-secondary" onClick={onBack}>
            Back to letters
          </button>
          {!empty && (
            <button type="button" class="btn btn-primary" onClick={() => window.print()}>
              Print the book
            </button>
          )}
        </div>
      </div>

      {empty ? (
        <div class="state">
          <h1>Your book fills as you write.</h1>
          <p>Every open letter prints here as a book you can hold.</p>
          {hasSealed && <p>Sealed letters stay locked and are not printed here.</p>}
          <button type="button" class="btn btn-primary" onClick={onWrite}>
            Write a letter
          </button>
        </div>
      ) : (
        <div class="book">
          <header class="book-cover">
            <h1 class="book-cover-title">{bookTitle}</h1>
            <p class="book-cover-count">{formatEntryCount(entries.length)}</p>
          </header>

          {entries.map((entry) => {
            // An interview typesets as its questions and answers, no body or
            // photos. A letter renders exactly as before.
            if (entry.type === "interview") {
              const interviewTitle = entry.title || "Interview";
              return (
                <article class="book-entry book-interview" key={entry.id}>
                  <h2 class="book-entry-title">{interviewTitle}</h2>
                  <p class="book-entry-date">Recorded {formatBookDate(entry.createdAt)}</p>
                  <dl class="book-answers">
                    {(entry.answers ?? []).map((answer) => (
                      <div class="book-answer" key={answer.promptId}>
                        <dt class="book-question">{answer.promptText}</dt>
                        <dd class="book-answer-text">{answer.answerText}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            }
            const title = entry.title || "Untitled letter";
            return (
              <article class="book-entry" key={entry.id}>
                <h2 class="book-entry-title">{title}</h2>
                {entry.occasion && <p class="book-entry-occasion">{entry.occasion}</p>}
                <p class="book-entry-date">Written {formatBookDate(entry.createdAt)}</p>
                <div class="book-body">{entry.body}</div>
                {entry.photos.map((photo) => (
                  <figure class="book-figure" key={photo.id}>
                    <img
                      class="book-photo"
                      src={photo.dataUrl}
                      alt={photo.caption || `Photo from "${title}"`}
                      width={photo.w}
                      height={photo.h}
                    />
                    {photo.caption && <figcaption>{photo.caption}</figcaption>}
                  </figure>
                ))}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
