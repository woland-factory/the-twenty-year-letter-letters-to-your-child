# EPIC SPEC — The printable book

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This EPIC turns the archive into a book. All unsealed content is typeset into a
print-ready book that a parent can preview on screen and print (or Print to PDF)
into paper they hold. The book is derived live from the current vault every time
it is opened, so it always shows exactly what the file holds right now. Sealed
letters are absent by design: the book is the always-available unsealed paper
fallback, and the seal has no fallback.

This EPIC builds on the shipped spine (EPIC 1), the writing room (EPIC 2), and
sealed letters (EPIC 3): the single self-contained `.html` artifact, the
byte-stable self-carrying save on both browser paths, the letter+photo editor,
the archive, and per-letter sealing with the `isSealed` / `unsealedEntries`
predicates already in `src/entries.ts`. Do not rebuild or re-architect any of
that. The book is a pure read of the vault plus print CSS. It adds no data model
change, no crypto, and no network.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The felt safety and clarity of every step, above all
saving the file and sealing a letter, so a sleep-deprived non-technical parent
never fears loss across an eighteen-year commitment.

What it demands of THIS EPIC's work: the book is the product's structural answer
to the biggest fear, that a browser in 2044 might not open the file. The book
makes the worst case degrade to paper, never to loss. So the book must feel like
a real book the parent can trust to print cleanly on the first try, without
settings, plugins, or a service. Two things carry that trust:

1. **Print that just works.** Pressing print produces clean pages: the parent's
   words and photos, no app buttons, no clipped edges, no photo spilling off the
   page. A parent who prints once and sees a tidy book believes the paper
   fallback is real.
2. **A book that is always current.** Opening the book always shows the letters
   the file holds right now, with no "generate" step to forget and no stale copy.
   What they see on screen is what prints.

When any choice here is open, choose the option that makes the printed result
more predictable and the "is this current?" question impossible to ask.

---

## Scope

### In scope
- **A book view.** A new `"book"` route (alongside `home`, `editor`, `unseal`)
  reachable from the archive. It typesets every unsealed entry into a readable,
  book-like layout: a plain title header, then each letter with its title,
  occasion, date, body, and photos.
- **Live derivation.** The book is computed on every render from
  `unsealedEntries(vault.entries)`. There is no stored book, no cached render,
  and no manual "regenerate" control. Opening the book always reflects the
  current vault.
- **Print / Print to PDF.** A primary "Print the book" action calls
  `window.print()`. Print CSS (`@media print`) hides all app chrome, shows only
  the book, keeps photos within the page, and sets sensible page breaks so the
  browser's own print (and Print to PDF) produces clean pages.
- **Sealed letters excluded.** Sealed entries never appear in the book. The
  book consumes `unsealedEntries`, so a sealed entry's ciphertext, key hint, and
  date are all absent from the book.
- **A designed empty state.** When there is no unsealed content yet, the book
  shows a designed surface explaining that open letters print here, never a
  blank sheet. When the vault holds sealed entries but no unsealed ones, the
  empty state also states plainly that sealed letters are not printed here.
- **Chronological order.** The book reads oldest first, so it grows from the
  earliest letter toward the newest, like a family book that thickens over the
  years. (The archive stays newest-first; only the book reorders.)
- **Designed states and mobile-first.** The book view, its toolbar, the typeset
  pages, and the empty state are all designed surfaces, fully usable at 390px.

### Out of scope (Non-Goals — do not build)
- **Custom typography controls.** No font pickers, size sliders, theme choices,
  margins UI, or layout options. One fixed, readable typeset layout ships. Do
  not add any control that changes how the book looks.
- **Cover designer.** No cover art, color/photo cover picker, or title-page
  designer. A single plain typeset header derived from the child's name (or a
  neutral fallback) is the whole "cover". Do not build customization on top of it.
- **Server-side PDF rendering.** There is no server and none is added. The
  export path is the browser's own Print / Print to PDF via `window.print()`.
  Do not add a PDF library, a headless renderer, or any network call.
- **Print-shop integration.** No ordering, uploading, or sending the book
  anywhere. The book never leaves the machine, exactly like every other part of
  the artifact.
- **JS pagination / a page-by-page WYSIWYG paginator.** Do not compute page
  breaks in JavaScript or render numbered on-screen "pages". The on-screen
  preview is the typeset content styled as a book; the browser paginates it at
  print time via CSS break rules. Building a JS paginator is fragile drift.
- **Interview-specific rendering.** Interviews (EPIC 5) do not exist yet. The
  book renders every unsealed entry through its common fields (title, occasion,
  date, body, photos). When EPIC 5 adds interview entries they flow through the
  same generic rendering for those fields; wiring interview-specific fields
  (age, per-prompt answers) into the book is EPIC 5's job, not this one. Do not
  add an interview type, prompt fields, or age logic here.
- **Any change to the data model, the save mechanism, stale-copy detection, the
  CSP, `index.html`, the crypto/seal/unseal code, the distribution site, or the
  staging deploy.** The book reads the existing vault and prints; it changes none
  of these.
- **Any network request from the artifact, ever.** The book renders from
  in-memory data URLs and prints locally. Adding a library or a print helper must
  not add a single fetch, CDN load, WASM fetch, or `eval`.

---

## Quality bar as it applies here

The quality bar is binding spec. The clauses that bite in this EPIC:

- **Perceived speed (§1).** The book renders synchronously from the in-memory
  vault (photos are already embedded data URLs), so opening it is instant. There
  are no queries and no network on any path. "Print the book" gives feedback
  within 100ms (a pressed state) before the browser's print dialog opens. A
  large vault with many photos must still render without a blank screen; because
  the data is already in memory this is a plain synchronous render, but keep the
  markup lean (no per-photo work beyond an `<img>`).
- **Mobile-first (§2).** The book view, toolbar, typeset pages, and empty state
  are fully usable at 390px: no horizontal scroll, ~44px touch targets on Back
  and Print, readable text. Photos scale to the column width. The typeset column
  is a comfortable reading measure on phone and desktop alike.
- **Designed states (§3).** The empty book is a designed surface with a heading,
  a plain line, and one clear action, never a blank region. There is no loading
  state to design (the render is synchronous) and no error path (a pure read of
  already-parsed state cannot fail); do not invent one.
- **First-run (§4) — boundary with EPIC 6.** No walkthrough here. The book entry
  point and the Print action must stand on their own: an obvious labelled control
  that teaches by looking. On staging the demo sample already carries an unsealed
  letter with a photo, so opening the book shows a real typeset page within a
  minute without any typing. Do not add a tour.
- **Security hygiene (§5).** The artifact has no server, so the server-side
  clauses (route authorization, rate limiting) are not applicable and must not be
  invented. Applicable here: make zero network requests; render letter content
  as text (Preact escapes it) and photos via the existing `data:` image sources
  the CSP already permits; never log letter content. There is no new input
  boundary in this EPIC (the book only reads validated vault state).
- **Accessibility (§6).** The book view is a `<main>` landmark with a real
  heading hierarchy: one `<h1>` for the book title, an `<h2>` per entry title.
  Each entry is a semantic `<article>`. Photos use `<figure>`/`<figcaption>`
  with meaningful `alt` text (the caption when present, a plain fallback
  otherwise). Back and Print are real buttons, keyboard reachable, with visible
  focus states and sufficient contrast. The print action is reachable by
  keyboard.
- **Radically simple interface (§7).** One obvious primary action per surface:
  in the book with content, "Print the book" is primary and "Back to letters" is
  the subordinate return; in the empty book, "Write a letter" is the single
  primary action (hide Print when there is nothing to print). The archive's book
  entry point is a subordinate/secondary control, never competing with the
  primary "Write a letter". Cut words: the empty-state copy is one heading and
  one or two short lines.
- **Copy (§8).** Every new visible string reads like a person wrote it. No
  em-dashes or dash-asides, positive and direct phrasing, no banned LLM
  vocabulary, no negative empty-state phrasing. Sweep before done (see Example
  copy and Test plan).
- **README (§9).** Add `ui/BookView.tsx` to the "Where the code lives" module
  list and add one plain line to "What makes it different" about the printable
  book as the paper fallback. Keep the run/test commands accurate. No pipeline
  jargon.

---

## Technical design

### Route and app flow (`src/ui/App.tsx`)

Extend the existing controller; keep its save, seal, and unseal orchestration
intact.

- Add `"book"` to the `Route` union (`"home" | "editor" | "unseal" | "book"`).
- Add `openBook()` (`setRoute("book")`) and reach the archive again with the
  existing `backToLetters()` (`setRoute("home")`).
- Render the book when `route === "book"`:
  ```tsx
  {route === "book" && (
    <BookView
      vault={vault}
      now={now}
      onBack={backToLetters}
      onWrite={openWrite}
    />
  )}
  ```
- Pass `onOpenBook={openBook}` to `Home`.
- The book reads `vault` from state, so it always reflects the current vault:
  any save (a new letter, an edit, a seal) updates `vault`, and the next time the
  parent opens the book it re-derives. No book state is stored on the controller
  or the vault.

### Archive entry point (`src/ui/Home.tsx`)

- Add an `onOpenBook: () => void` prop.
- In the **non-empty** archive branch, add a **subordinate** control to open the
  book, visibly secondary to the primary "Write a letter". Place it in the
  archive actions (for example a `btn btn-secondary` next to or above the
  existing "Write a letter" primary at the foot of the list). It shows whenever
  the archive has entries, including when every entry is sealed (opening the book
  then shows the designed empty state that explains sealed letters are not
  printed). Label: `Open the book`.
- The **empty** archive branch (zero entries) is unchanged: it keeps only "Write
  a letter". Do not add the book link there; there is nothing to read yet.
- Keep the integrity readout, ordering, and the sealed-placeholder rendering
  exactly as shipped.

### Book ordering and date (`src/entries.ts`, `src/format.ts`)

Add small pure, unit-tested helpers rather than inlining logic in the component.

- **`src/entries.ts` — `bookEntries(entries: Entry[]): Entry[]`.** Return the
  unsealed entries in **oldest-first** order (ascending `createdAt`, with a
  stable tiebreak on `id`), built on the existing `unsealedEntries`. This is the
  book's reading order. Example:
  ```ts
  export function bookEntries(entries: Entry[]): Entry[] {
    return unsealedEntries(entries).slice().sort((a, b) => {
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }
  ```
  Keep `sortedEntries` (newest-first) unchanged for the archive.
- **`src/format.ts` — `formatBookDate(iso: string): string`.** Return a clean
  printed date with no clock and no "today", reusing the module's `MONTHS`
  array: `"March 3, 2026"`. On an unparseable date return a plain fallback such
  as `"an undated day"`. This is the date the book prints under each entry;
  `formatSavedMoment`'s "today at 9:14 PM" form reads wrong in a printed book, so
  the book uses its own formatter.

### Book view (`src/ui/BookView.tsx`, new)

A pure component that reads the vault and typesets it. Structure so print CSS can
show only the book:

```tsx
export function BookView({ vault, now, onBack, onWrite }: {
  vault: Vault; now: Date; onBack: () => void; onWrite: () => void;
}) {
  const entries = bookEntries(vault.entries);
  const empty = entries.length === 0;
  const hasSealed = vault.entries.some(isSealed);
  const bookTitle = vault.child?.name ? `Letters to ${vault.child.name}` : "Your letters";
  // ...
}
```

- **Toolbar (screen only, not printed).** A `.topbar` / `.book-toolbar` OUTSIDE
  the printable `.book` container, carrying:
  - "Back to letters" (`btn btn-secondary`, calls `onBack`).
  - "Print the book" (`btn btn-primary`, calls `() => window.print()`) — shown
    only when the book is non-empty.
  Give the toolbar a `no-print` class so the print rules keep it off the page
  (belt and suspenders on top of the visibility toggle below).
- **The printable book (`<div class="book">` or `<article>`).** Rendered only
  when non-empty:
  - A plain header: `<h1 class="book-cover-title">{bookTitle}</h1>` and one
    subtitle line with the unsealed count (reuse `formatEntryCount(entries.length)`).
    This fixed header is the whole "cover"; do not add cover customization.
  - For each entry, a `<article class="book-entry">` with:
    - `<h2 class="book-entry-title">{entry.title || "Untitled letter"}</h2>`
    - the occasion, when present, as a subtitle line.
    - `<p class="book-entry-date">Written {formatBookDate(entry.createdAt)}</p>`
      (or a bare date line; keep the phrasing swept and short).
    - the body in a `white-space: pre-wrap` block so paragraphs and line breaks
      print as written (mirror `.reveal-body`).
    - each photo as a `<figure class="book-figure">` with an
      `<img class="book-photo">` (meaningful `alt`: the caption when present,
      else `Photo from "<title>"`) and a `<figcaption>` when the caption is set.
- **Empty state (`<div class="state">`), rendered when no unsealed entries:**
  - Heading and one plain line (see Example copy). When `hasSealed` is true, add
    the line that sealed letters are not printed here.
  - One primary action, "Write a letter" (`onWrite`), plus the toolbar "Back to
    letters". Do not render "Print the book" in the empty book.
- The component never writes state, never calls save, and never mutates the
  vault. It is a pure function of `vault` + `now`.

### Styles and print CSS (`src/styles.css`)

Add screen styles for the book (a comfortable reading measure, book-like white
pages, readable serif or the existing system font, generous line height, photos
scaled to the column) and extend the existing `@media print` block. Keep the
existing key-sheet print rules intact; only ADD to the visible set and add
book-specific rules.

Print rules (extending the one `@media print` block already in the file):
```css
@media print {
  /* existing: @page margin, body background, body * hidden, key-sheet visible */
  .book,
  .book * {
    visibility: visible;
  }
  .book {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100%;
  }
  .no-print {
    display: none !important;
  }
  /* Keep a heading with the text that follows it; avoid splitting a photo. */
  .book-entry-title,
  .book-entry-occasion,
  .book-entry-date {
    break-after: avoid;
  }
  .book-figure,
  .book-photo {
    break-inside: avoid;
  }
  .book-photo {
    max-width: 100%;
    max-height: 16cm;   /* fits within an A4/Letter page with the 14mm margins */
    width: auto;
    height: auto;
  }
  .book-body {
    orphans: 3;
    widows: 3;
  }
}
```
Notes for the implementer:
- The book and the key sheet are never on screen at the same time (they are
  different routes/surfaces), so adding `.book`/`.book *` to the visible set does
  not disturb the key-sheet print test.
- `max-width: 100%` plus `max-height` with `width/height: auto` keeps each photo
  inside one page while preserving aspect ratio, satisfying "photos not
  overflowing the page".
- Do not force one entry per page (that wastes paper and is not asked for). Let
  the book flow; the break rules above keep it tidy.
- Include the `page-break-*` fallbacks alongside the `break-*` properties only if
  a target engine needs them; modern Chromium/Firefox/WebKit honor `break-*`.

### Files to touch (summary)
```
src/ui/BookView.tsx   NEW: typeset book view, toolbar, empty state
src/ui/App.tsx        add "book" route, openBook(), render BookView, pass onOpenBook
src/ui/Home.tsx       subordinate "Open the book" control on the non-empty archive
src/entries.ts        add bookEntries() (unsealed, oldest-first)
src/format.ts         add formatBookDate()
src/styles.css        book screen styles + extend @media print (book rules)
README.md             add BookView to the module list; one line on the printable book
tests/unit/...        bookEntries ordering + sealed exclusion; formatBookDate
tests/e2e/...         book render, print emulation, sealed exclusion, empty state, live reflect, mobile
```
Do NOT touch `src/vault.ts`, `src/template.ts`, `src/seal.ts`, `src/mnemonic.ts`,
`src/qr.ts`, `src/save/`, `index.html`, the CSP, `scripts/`, the Dockerfile, or
the staging compose file. No schema change, no migration, no dependency add.

---

## Example copy (ships verbatim downstream; already copy-swept)

- Archive book link: `Open the book`
- Book toolbar back: `Back to letters`
- Book print button: `Print the book`
- Book title with a child name: `Letters to <name>` (for example `Letters to Mira`)
- Book title with no child name: `Your letters`
- Book count subtitle: reuse `formatEntryCount` (`1 letter` / `<n> letters`)
- Entry date line: `Written <date>` (for example `Written March 3, 2026`)
- Photo alt fallback (no caption): `Photo from "<title>"`
- Empty book heading: `Your book fills as you write.`
- Empty book line: `Every open letter prints here as a book you can hold.`
- Empty book line when sealed letters exist: `Sealed letters stay locked and are not printed here.`
- Empty book action: `Write a letter`

Copy sweep for the strings above: no `—` or `–`; none of the banned vocabulary
("seamlessly", "effortlessly", "unlock", "elevate", "empower", "leverage",
"robust", "dive in", and kin); positive, direct phrasing; the empty state says
what the book is for and what to do, never "You have no letters yet". The
implementer repeats this sweep over every string they add, including the alt-text
fallback and any README copy.

---

## Ordered task list (each with acceptance criteria)

Brackets map to the planner's acceptance criteria: [AC1] renders every unsealed
letter (and interview, when they exist) with title, occasion, date, photos, body
in a readable typeset layout; [AC2] print produces clean pages (no clipped
content, no UI chrome, sensible breaks, photos within the page); [AC3] the book
reflects the current vault every open with no manual regeneration; [AC4] sealed
entries do not appear; [AC5] an empty book shows a designed state.

1. **Book selection and date helpers.** [AC1, AC3, AC4]
   - `bookEntries` returns unsealed entries oldest-first with a stable id
     tiebreak, built on `unsealedEntries`; sealed entries are excluded.
   - `formatBookDate` returns a clean printed date (`March 3, 2026`) and a plain
     fallback on an unparseable value. Unit-tested.

2. **Book view: typeset render.** [AC1, AC3]
   - `BookView` renders, for every unsealed entry in book order, the title,
     occasion (when present), date, body with line breaks preserved, and each
     photo with meaningful alt text, in a readable book-like layout with a plain
     title header.
   - The render is a pure function of the passed `vault`; there is no stored or
     cached book and no "regenerate" control. Reading it twice yields the same
     result; changing the vault and reopening reflects the change.

3. **Route and archive entry point.** [AC3]
   - App gains a `"book"` route; the archive shows a subordinate "Open the book"
     control (only when it has entries) that opens the book, and the book's "Back
     to letters" returns to the archive. The primary "Write a letter" stays the
     archive's one obvious action.

4. **Print CSS.** [AC2]
   - Under print, the app chrome (topbar, toolbar, buttons) is hidden and only
     the book prints. Photos stay within the page (bounded max-height and
     max-width). Headings stay with their following text and photos are not split
     across pages. Verified with print emulation.

5. **Empty state.** [AC4, AC5]
   - A book with no unsealed content shows a designed state (heading, plain line,
     "Write a letter") rather than a blank sheet, and when sealed entries exist
     it also states that sealed letters are not printed here. The "Print the
     book" action is not shown when the book is empty.

6. **Mobile, accessibility, copy sweep, docs.** [AC1, quality §2/§6/§8/§9]
   - The book view, toolbar, pages, and empty state are fully usable at 390px:
     no horizontal scroll, ~44px targets, readable text, photos scaled to the
     column.
   - Semantic structure: `<main>`, one `<h1>` book title, an `<h2>` per entry,
     `<article>` per entry, `<figure>`/`<figcaption>` for photos, visible focus
     on Back and Print, keyboard reaches Print.
   - Mechanical copy sweep over every new/changed string passes.
   - README module list and the one book line are accurate; commands unchanged.

---

## Test plan (automated tests prove each criterion)

**Unit / integration (Vitest):**
- **`bookEntries`:** given a mix of unsealed and sealed entries, returns only the
  unsealed ones, oldest `createdAt` first, with a deterministic id tiebreak;
  sealed entries are excluded; an all-sealed input returns `[]`. [AC1, AC3, AC4]
- **`formatBookDate`:** returns `"March 3, 2026"` for a known ISO date, with no
  clock and no "today"; returns the plain fallback for an unparseable string.
  [AC1]

**End-to-end (Playwright, real browser, loaded from `file://`, all engines):**
- **Book renders unsealed content:** seed a vault with two unsealed letters (one
  with a photo, bodies with line breaks) and open the book from the archive.
  Assert both titles, both occasions, both dates, the body text (line breaks
  preserved), and the photo `<img>` (with `naturalWidth > 0`) all appear, in
  oldest-first order. [AC1]
- **Sealed letters are absent:** seed a vault with one unsealed and one sealed
  entry, open the book, and assert the sealed entry's key hint and any sealed
  marker do not appear and only the unsealed letter is typeset. [AC4]
- **The book reflects the current vault:** open the book (see the seeded
  letters), go back, write and save a new letter, open the book again, and assert
  the new letter now appears with no regenerate step. [AC3]
- **Empty book, designed state:** seed a vault whose only entry is sealed (so the
  archive is non-empty and the book link shows), open the book, and assert the
  empty-state heading and line appear, the "sealed letters are not printed here"
  line appears, and "Print the book" is not shown. A truly empty vault reaches
  the same designed state via the same path once a letter exists then is sealed;
  the seeded case is sufficient. [AC4, AC5]
- **Clean print output:** open a book with a photo, call
  `page.emulateMedia({ media: "print" })`, and assert the `.book` is visible
  while the topbar brand and the toolbar are `visibility: hidden` /
  `display: none`; assert the printed photo's width does not exceed the book
  column width and its height is bounded (no overflow/clipping). [AC2]
- **Mobile 390px:** at a 390px viewport, open the book and assert no horizontal
  scroll (`scrollWidth <= clientWidth`), the Print and Back targets are tappable,
  and a photo scales to the column. [quality §2]

**Copy sweep (mechanical, part of done):** grep every user-visible string in the
book view, the archive book link, the empty state, and any README copy for the
characters `—` and `–`, the banned vocabulary, and negative empty-state phrasing
("You don't have", "No ... yet", "Nothing ... here", "Unable to", "Something went
wrong"). Every hit in a shipped string is a defect to fix in the same run.
[quality §8]

---

## Risks and notes for the implementer
- **Print is the whole point; verify it, do not assume it.** The differentiator
  lives in a clean first print. Run the print-emulation e2e on every engine and
  eyeball the manual print once (build the artifact, open the book, Print to
  PDF): no app buttons on the page, no clipped edges, no photo running off the
  page. If a photo overflows, the `max-height`/`max-width` cap is the fix, not a
  JS paginator.
- **The book is derived, never stored.** Render it from `vault` on every open.
  Do not add a "generate book" button, do not cache the render, and do not put a
  book blob in the vault. "No manual regeneration step" is an acceptance
  criterion, and a stored book is how it silently goes stale.
- **Sealed exclusion goes through `unsealedEntries`.** Do not re-implement the
  sealed check in the book. Consume the existing predicate so the rule stays in
  one place.
- **Stay out of EPIC 5.** Render entries through their common fields only. Do not
  add an interview type, prompt fields, or age logic; interviews do not exist
  yet and their book rendering is EPIC 5's job.
- **Do not touch the data model, save, crypto, CSP, or deploy.** The book is a
  read plus print CSS. No schema bump, no migration, no new dependency, no
  `index.html` or CSP change. If the quality bar seems to demand one of these,
  block with a precise question rather than building it.
- **Keep it one fixed layout.** Custom typography, a cover designer, server-side
  PDF, and print-shop integration are Non-Goals. A single readable typeset layout
  with the browser's own print is the whole scope; adding options is drift.

---

## Notes on this spec's provenance
Built by expanding the planner's authoritative scope for EPIC 4 against the
shipped EPIC 1 + EPIC 2 + EPIC 3 codebase (the single-file artifact, `vault.ts`,
`template.ts`, `entries.ts` with `isSealed`/`unsealedEntries`, `photos.ts`,
`save/`, the seal/unseal flow, and the Preact UI with its existing `@media print`
key-sheet rules). Concrete choices the implementer can execute directly: a new
`"book"` route rendered by a pure `BookView`; a `bookEntries` selector
(unsealed, oldest-first) and a `formatBookDate` helper; the book derived live
from the vault with no stored render; and print handled entirely by extending the
existing print CSS to show a `.book` container with bounded photos and sensible
break rules, using the browser's own Print / Print to PDF. No data model, crypto,
CSP, dependency, or deploy change is needed. No DEPLOY / STAGING DEPLOY CONTRACT
block was present in this task's context, and this EPIC does not change the
deploy.
