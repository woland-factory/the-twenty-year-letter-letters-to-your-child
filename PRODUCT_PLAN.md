# PRODUCT PLAN — The Twenty-Year Letter

*Letters to your child that no company has to survive.*

---

## Core value (one sentence)

A parent writes letters, photos, and a yearly interview to their child
inside one self-contained HTML file that seals chosen letters with
printable paper keys and continuously typesets everything into a
printable book, so opening day in 2044 needs no company, server, or
account.

## North star

The excellent version feels like a family heirloom you happen to edit in
a browser, never like software you could lose. On a quiet evening a
parent opens the file, adds a letter and a photo, records this year's
interview with their kid, and prints a fresh copy of a book that has
visibly grown thicker since last year. What they feel is calm ownership:
the whole thing sits in their own folder, backed up on their own terms,
and it will still open in 2044 with a slip of paper from a drawer.
Eighteen years on, the child opens it alone, with no login and no
company between them and the page, and reads letters written before they
could speak. The standard we hold: every save feels safe, every seal
feels trustworthy rather than frightening, and a tired non-technical
parent keeps the ritual going for two decades because the file never
once made them afraid of losing it.

## Quality differentiator

**Trustworthy simplicity.** The one dimension this app beats every
alternative on is the felt safety and clarity of each step, above all
saving and sealing. A delivery service asks you to trust a company; a
folder of Word documents asks you to trust yourself with no help;
TiddlyWiki asks you to tinker. This app makes the scary parts (save this
file, seal this letter forever, find the key in 2044) feel obvious and
calm to someone who is sleep-deprived and non-technical. If a step could
make a parent fear loss, that step is the bug.

## Signature moment

Sealing a letter and printing its paper key. The letter is encrypted in
the browser and never leaves the machine; its key prints as a short word
list plus a QR code that goes into this year's birthday card or grandma's
drawer. "The letter rides inside the file she carries. The key lives in
the physical world. No company sits between my kid and opening day."
A parent reaches this moment in the first fifteen minutes.

---

## Architecture at a glance

The product is **two things built from one repo**:

1. **The artifact** — a single self-contained `.html` file that is the
   whole app: writing room, archive, sealing, book, and all data
   embedded together. It runs from `file://` with zero network access.
   This is what the family keeps.
2. **The distribution site** — a small static site (landing page + a live
   copy of the artifact you can try in-browser) that exists only to help
   a stranger understand the product and download their own starter
   file. This is what staging deploys.

**Hard rule: the artifact makes no network requests, ever.** No
analytics, no error tracking, no fonts or scripts from a CDN, no LLM.
Everything is inlined at build time. Analytics and error tracking
(`UMAMI_*`, `SENTRY_DSN`) may be wired into the **distribution site
only** — never into the file a family saves, whose entire promise is
that nothing was ever posted into anyone's custody. A family's private
letters must never touch a server. This is a security-and-trust
requirement, not a preference.

### Recommended stack

- **Build:** Vite + `vite-plugin-singlefile` so the artifact compiles to
  one HTML file with all JS and CSS inlined and no external requests.
- **UI:** a compile-to-small framework (Preact or Svelte) or vanilla
  TypeScript. Keep the dependency surface tiny. An 18-year file should be
  small and boring.
- **Sealing:** Web Crypto `crypto.subtle` AES-GCM (available on
  `file://`, confirmed in validation). Bundle a small audited JS AES-GCM
  fallback for odd embedded browsers.
- **Paper key:** random 256-bit key encoded as a 24-word list from the
  BIP39 English wordlist (about 13 KB, inlined) plus a QR code (small
  inlined QR library). The key is shown once for printing and then never
  stored in the file.
- **Photos:** client-side recompression via `<canvas>` (cap longest edge,
  re-encode to JPEG/WebP) against a hard per-file and per-vault size
  budget before embedding as data URLs.
- **Book:** print CSS (`@media print`) over a paginated render of all
  unsealed content. No PDF service; the browser's own "Print to PDF" is
  the export path.

### Self-carrying save mechanism

On load, the app captures its own pristine source (the document as it was
before any UI rendering) and splits it on unique markers around a single
data block:

```
<script id="vault-data" type="application/json"> … JSON … </script>
```

The vault JSON holds all state (letters, interviews, recompressed photos,
sealed ciphertext, metadata). Saving = re-serialize state into that
block inside the pristine template and write the whole HTML string out.
Because the app never serializes the live, mutated DOM, the saved file
stays clean and byte-stable except for its data.

- **Chromium (Chrome/Edge/Opera):** in-place save via the File System
  Access API. The app holds the file handle and overwrites the same file.
- **Firefox/Safari and anywhere the API is absent:** a designed
  download-and-replace ritual. The app produces the new file as a
  download and tells the parent, in plain words, to replace their
  canonical copy. This is the known friction hot-spot and is treated as a
  core feature (see EPIC 1), not plumbing.

---

## Data model sketch

```
Vault {
  schemaVersion: number
  generation:    number        // increments every save; drives stale-copy detection
  savedAt:       ISO string
  fileId:        string        // random id minted on first save, stable thereafter
  child:         { name: string, birthDate: ISO date }
  entries:       Entry[]
  firstRunDone:  boolean
}

Entry {
  id:        string
  type:      "letter" | "interview"
  createdAt: ISO string
  occasion:  string            // free text, e.g. "First birthday"
  title:     string
  // Present only while UNSEALED:
  body?:     string            // plain text or a minimal safe rich subset
  photos?:   Photo[]
  // Interview-only, when unsealed:
  childAgeYears?: number
  answers?:  { promptId: string, promptText: string, answerText: string }[]
  // Present only when SEALED (body/photos/answers removed and replaced by this):
  sealed?:   { algo: "AES-GCM", iv: string, ciphertext: string,
               keyHint: string, sealedAt: ISO string }
}

Photo { id: string, dataUrl: string, caption: string, w: number, h: number, bytes: number }
```

The **book is derived, never stored** — rendered on demand from all
unsealed entries. Sealed entries appear in the archive as locked
placeholders with their `keyHint` and are absent from the book (the book
is the unsealed fallback; the seal has no fallback, by design).

---

## Screen / view inventory

**The artifact (single-page views):**

1. **Archive / home** — timeline of entries, the integrity readout
   ("N letters, last saved <date>"), one primary action to write.
2. **Letter editor** — compose, attach and caption photos, save.
3. **Interview** — age-aware prompts, record the child's answers verbatim.
4. **Seal dialog** — irreversibility warning, generate + print the paper key.
5. **Unseal dialog** — enter the words or scan the QR, decrypt and read.
6. **Book** — paginated print preview and print action.
7. **Backup ritual surface** — canonical-copy guidance and "save now".
8. **First-run walkthrough** — a skippable guided path over real controls.
9. **Settings** — child name and birth date; backup reminders.

**The distribution site (served on staging):**

- **Landing page** — what it is, why it exists, download your file.
- **Try it live** — the artifact served in-browser, honoring `SEED_DEMO`.

---

## MVP user stories

- As an expectant parent, I open the file, write my first letter, attach
  a photo, and save it into my own folder, so the whole archive now lives
  with me and no one else.
- As a parent, I reopen the file weeks later and see exactly what I wrote,
  with a clear readout of how many letters it holds and when I last saved.
- As a parent, I seal a letter my child should not read until they are
  grown, print its paper key, and understand plainly that losing that key
  means the letter cannot be opened.
- As a parent on a non-Chromium browser, I save through a clear replace
  ritual and never end up unsure which copy is the real one.
- As a parent, each birthday I answer an age-aware interview with my child
  and record their words next to that year's letter.
- As a parent, I print a fresh copy of the book any time and hold a paper
  fallback of everything unsealed.
- As my grown child in 2044, I open the file on an offline computer with
  no account, enter a paper key from a drawer, and read a sealed letter.

---

## EPICs (build order)

Each EPIC is small, independently reviewable, and has testable acceptance
criteria. Every criterion is met only when the delivered result also
clears the QUALITY BAR.

### EPIC 1 — The self-carrying file: shell, save/reopen, and staging scaffold

**Scope:** The spine. Single-file build pipeline (one HTML output, no
external requests). Embedded `vault-data` model with load/parse on open.
The self-carrying save mechanism on both paths: File System Access
in-place save on Chromium, and a designed download-and-replace ritual
elsewhere. Integrity readout on open. Generation-counter stale-copy
detection. Plus the distribution site: landing page + live artifact, and
the staging deploy scaffold (Dockerfile + `docker-compose.staging.yml`).
A parent can write one plain letter, save, and reopen with data intact.

**Acceptance criteria:**
- Build produces a single `.html` artifact that opens from `file://` and
  issues zero network requests (verify: DevTools network tab is empty on
  load and on save).
- Writing a plain letter, saving, closing, and reopening the saved file
  restores the letter exactly, on both a Chromium in-place save and a
  non-Chromium download-and-replace save.
- The saved file is clean: app code is byte-identical to the built shell;
  only the `vault-data` block changes between saves (no DOM-leak bloat).
- On open, the archive shows an integrity readout of entry count and last
  saved date rendered from the vault.
- Saving over a copy whose on-disk generation is higher than the loaded
  one warns the user before overwriting (Chromium path re-reads the file
  and compares `generation`).
- The download-and-replace path shows plain guidance on which copy is
  canonical; a parent test-reading the copy cannot end up unsure which
  file is real.
- Distribution site serves a landing page and a working live artifact.
- `Dockerfile` + `docker-compose.staging.yml` build and serve the
  distribution site; `docker compose -f docker-compose.staging.yml up`
  yields a reachable site. `SENTRY_DSN`/`UMAMI_*` env, if set, wire into
  the **site only**, never the artifact. (If an authoritative DEPLOY
  CONTRACT / STAGING DEPLOY CONTRACT block is present in this EPIC's
  build context, follow it exactly where it differs from the above.)
- `SEED_DEMO=true` makes the live artifact load a sample letter so a
  reviewer sees real content within a minute without typing anything.

**Non-goals:** photos, sealing, interview, book, walkthrough (later EPICs).

### EPIC 2 — The writing room: letters and photos

**Scope:** A real writing room. Compose letters with a title, an occasion,
and a body. Attach, caption, reorder, and remove photos, each
recompressed client-side to a hard size budget before embedding. Browse
the archive timeline of entries. Designed empty and loading states.

**Acceptance criteria:**
- A letter can be written with title, occasion, body, and one or more
  photos, then saved and reopened intact (photos included).
- Photos are recompressed before embedding: a large source image is
  capped to a bounded dimension and re-encoded, and the app enforces a
  per-vault size budget, refusing or warning past it with a plain
  message. Adding a typical phone photo does not bloat the file
  unbounded.
- The archive lists entries newest-relevant-first with occasion, date,
  and a photo thumbnail when present.
- The empty archive tells a brand-new parent what this is and offers one
  obvious action to begin, with no blank region.
- Editing an existing entry and saving preserves all other entries.
- Fully usable at 390px width: no horizontal scroll, tappable targets,
  readable text.

**Non-goals:** WYSIWYG/rich formatting beyond a minimal safe subset;
audio or video; cloud photo import.

### EPIC 3 — Sealed letters and paper keys (the signature moment)

**Scope:** Per-letter client-side AES-GCM sealing. Generate a random key,
encrypt the entry, strip its plaintext from the vault, and store only the
ciphertext blob plus a `keyHint`. Render the key as a 24-word list plus a
QR code on a clean printable key sheet. The unseal flow: enter the words
or scan the QR on any copy, decrypt, and read. The irreversibility
warning is shown plainly at seal time, every time.

**Acceptance criteria:**
- Sealing an entry encrypts it in the browser (no network request),
  removes its plaintext and photos from the saved vault, and stores only
  `{iv, ciphertext, keyHint, sealedAt}`. Inspecting the saved file's JSON
  reveals no readable letter text for a sealed entry.
- The seal dialog states, before confirming, that a lost key means the
  letter cannot be opened and that the book holds only unsealed content.
  Confirmation is deliberate, not a stray click.
- The printable key sheet shows the word list and a scannable QR, prints
  cleanly on one page, and includes the `keyHint` the parent chose.
- **Cross-machine open works:** a file saved on one machine, opened on a
  different, offline computer, unseals the entry using only the word list
  (and separately using only the QR). This is validated end to end.
- A wrong or mistyped key fails with a calm, plain message and never
  corrupts the vault.
- Sealed entries appear in the archive as locked placeholders showing
  their `keyHint`, and are excluded from the book.

**Non-goals:** key escrow, cloud key backup, passphrase-derived keys,
resealing an opened letter automatically, remembering keys in the file.

### EPIC 4 — The printable book

**Scope:** Continuous typesetting of all unsealed content into a
print-ready book, regenerated whenever content changes. A book view with
paginated preview and a print action, styled with print CSS. Sealed
entries are absent; the book is the unsealed paper fallback.

**Acceptance criteria:**
- The book renders every unsealed letter and interview with its title,
  occasion, date, photos, and body, in a readable typeset layout.
- Printing (or Print to PDF) produces clean pages: no clipped content, no
  UI chrome, sensible page breaks, photos not overflowing the page.
- The book reflects the current vault every time it is opened, with no
  manual regeneration step.
- Sealed entries do not appear in the book.
- A book with no unsealed content yet shows a designed state explaining
  that unsealed letters will appear here, not a blank sheet.

**Non-goals:** custom typography controls, cover designer, server-side
PDF rendering, print-shop integration.

### EPIC 5 — The yearly interview ritual

**Scope:** The ritual engine. A finite, age-aware prompt pack (written
once) so a three-year-old's interview differs from a twelve-year-old's.
An interview flow that presents prompts by the child's age, records
answers verbatim, and stores the interview next to that year's entries.
A gentle birthday-cadence nudge.

**Acceptance criteria:**
- Starting an interview selects prompts appropriate to the child's
  current age (derived from `child.birthDate`), and the age bands cover
  at least infancy through the teens.
- Answers are recorded verbatim per prompt and saved as an interview
  entry with the child's age at the time; reopening restores them.
- Interview entries appear in the archive and the book alongside letters
  and can be sealed like any entry.
- Prompt-pack copy passes the copy sweep (no banned vocabulary, no
  em-dashes, positive phrasing).
- Around the child's birthday the app surfaces one calm, dismissible nudge
  to record this year's interview; it never nags.

**Non-goals:** an LLM generating prompts at runtime (the finite pack is
the MVP; any LLM prompt-variety is a future BYOK-only garnish and out of
scope here); audio recording of answers; scheduled reminders by email.

### EPIC 6 — First-run walkthrough

**Scope:** A guided path that walks a brand-new parent through the core
loop once: write, save, reopen guidance, and seal. Anchored to the real
controls, one short imperative step at a time, skippable at any step,
shown only until first success and never again.

**Acceptance criteria:**
- On first open the walkthrough leads the parent through 2 to 4 steps
  anchored to real on-screen controls (write a letter, save the file,
  understand the backup copy, seal once), each step one short imperative
  sentence.
- The walkthrough is skippable at every step and dismissed permanently
  once the parent completes their first save/seal (`firstRunDone` set).
- A returning parent (a vault with content or `firstRunDone`) never sees
  it.
- The walkthrough points at controls and never replaces the interface
  with an essay; §4 and §7 of the quality bar are met together.
- On staging with `SEED_DEMO`, the demo state does not trap a reviewer in
  the walkthrough; they can reach the sealed-letter differentiator within
  a minute.

**Non-goals:** a tutorial video, a multi-page onboarding wizard,
re-triggerable tours.

### EPIC 7 — Polish (UX / performance / quality-bar pass)

**Scope:** A refinement pass over the whole delivered product against the
QUALITY BAR and the trustworthy-simplicity differentiator. No new
features. Tighten what exists: perceived speed, mobile layout at 390px,
designed empty/loading/error states everywhere, accessibility, and a full
copy sweep. Special attention to the two fear points: the save ritual and
the seal warning.

**Acceptance criteria:**
- First meaningful render shows real content within about 1 second when
  opening a file; large vaults (many photos) open without a blank screen
  (skeleton or progressive render).
- Every interaction gives feedback within 100ms (pressed states,
  progress on save and on seal/encrypt).
- Every screen is fully usable at 390px: no horizontal scroll, ~44px
  touch targets, readable text.
- Empty, loading, and error states are designed on every view, in the
  product's own voice, with a clear next action and no raw errors.
- Accessibility basics pass: color contrast, visible focus states, every
  input labeled, semantic headings and landmarks, full keyboard reach,
  alt text on meaningful images.
- Copy sweep passes across every user-visible string and the prompt pack:
  no "—" or "–", none of the banned LLM vocabulary, no negative
  empty-state phrasing.
- The save ritual and the seal warning are reviewed specifically for felt
  safety: a first-time user can complete each without fearing loss, and
  the seal warning is unmistakable.
- `README.md` lets a stranger understand, run (verified against the
  compose files), and contribute, with no pipeline jargon.

**Non-goals:** any new feature, redesign, animation system, or
optimization beyond the budgets above.

---

## Non-Goals / Out of scope (the fence)

These are tempting and deliberately excluded from v1:

- **Delivery or scheduling.** No "send this on a future date." The whole
  premise rejects the delivery-service bet. The file carries itself.
- **Accounts, login, or identity.** None. Opening day needs no account.
- **Servers, sync, or cloud storage of family content.** The artifact
  never talks to a network. Backup is the family's, by design.
- **Collaboration / multi-user editing.** One family, one file.
- **A runtime LLM in the core loop.** No AI is needed to deliver the
  value; adding one would add network calls and friction to a private
  offline file. Optional prompt-variety via BYOK is a future garnish, not
  MVP.
- **Analytics or error tracking inside the artifact.** Site only.
- **Native mobile apps.** The file opens in any browser; that is the point.
- **Rich WYSIWYG editing, audio/video, print-shop integration, cover
  designers.** Out of scope for the smallest professional product.
- **Key recovery / escrow.** A lost paper key is unrecoverable by design,
  stated plainly at seal time.
- **The Hundred-Year File / generational hand-down.** A compelling bolder
  sibling, but a different, riskier product. Not this build.

---

## Risks and how the plan meets them

- **Save/reopen friction on non-Chromium browsers** is the probe's known
  hot-spot. Mitigation: the download-and-replace ritual is a designed
  first-class surface in EPIC 1, with canonical-copy guidance and
  stale-copy detection, not an afterthought.
- **A parent fearing the seal** would kill the signature moment.
  Mitigation: the irreversibility warning is plain and deliberate, the
  book is the always-available unsealed fallback, and EPIC 7 reviews the
  seal specifically for felt safety.
- **File bloat over 18 years** would make the artifact unwieldy.
  Mitigation: hard client-side photo recompression and a per-vault size
  budget with a plain warning (EPIC 2).
- **The 2044 browser bet.** Mitigation is structural: the regenerating
  printable book means the worst case degrades to paper, never to loss.
- **Ritual abandonment** (a real, unsolved-by-software risk). Mitigation:
  the age-aware interview and the visibly growing book give a reason to
  return; honestly, this is a bet the product makes, not a fact it
  guarantees.
