# EPIC SPEC — The writing room: letters and photos

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This EPIC turns the minimal one-field editor from the spine into a real
writing room. A parent composes a letter with a title, an occasion, and a
body, attaches photos that are recompressed in the browser to a bounded
size before they go into the file, captions and reorders them, and browses
a growing archive of entries with dates, occasions, and thumbnails. When
this EPIC is done, a parent can write a letter with several photos, save
it, reopen it, and find everything intact, on a file that has not bloated
without limit.

This EPIC builds on the shipped spine (EPIC 1): the single self-contained
`.html` artifact, the self-carrying save mechanism on both browser paths,
the integrity readout, stale-copy detection, and the distribution site. Do
not rebuild or re-architect any of that. Extend it.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The felt safety and clarity of every step, so a
sleep-deprived non-technical parent never fears loss across an eighteen-year
commitment.

What it demands of THIS EPIC's work: the writing room is where the parent
spends their time, and photos are the one place this EPIC can quietly betray
trust. Two failure modes matter above all. First, a photo that seems added
but is silently dropped, corrupted, or invisible on reopen reads as loss.
Every photo the parent sees in the editor must round-trip into the saved
file and back, exactly, or the app must say plainly and immediately that it
could not add it and why. Second, a file that bloats without bound until it
is too large to keep, back up, or open is a slow loss the parent cannot see
coming. Recompression and a hard size budget are the safety rail, and the
budget message must be calm and actionable, never a scold or a dead end.
When any photo choice is open, choose the option that makes loss harder and
the truth more obvious.

---

## Scope

### In scope
- **A real letter.** The editor composes a letter with three fields: a
  **title**, an **occasion** (free text, e.g. "First birthday"), and a
  **body** (plain text, multi-line). All three are optional individually,
  but a letter needs at least one of them or a photo to be saveable.
- **Photos, recompressed client-side.** Attach one or more image files.
  Each is decoded and re-encoded in the browser (canvas) to a bounded
  longest edge and a chosen JPEG quality *before* it is embedded as a data
  URL. Captions per photo. Reorder photos (move up / move down). Remove a
  photo.
- **A per-vault photo size budget.** The app tracks total embedded photo
  bytes and refuses to add a photo that would push the vault past a hard
  budget, with a plain, actionable message. Adding a typical phone photo
  costs a few hundred KB, not several MB.
- **The archive timeline.** Home lists entries in a sensible order (newest
  first) showing the occasion, the date, and a photo thumbnail when the
  entry has one. The existing integrity readout and empty state stay.
- **Designed empty and loading states.** The empty archive (already shipped)
  keeps naming the product and offering the one action to begin. A designed
  loading state covers photo processing: the moment a parent picks a photo,
  they see it is being added (within 100ms), never a frozen button.
- **Editing preserves everything else.** Opening an existing entry, changing
  it, and saving leaves every other entry, and every other entry's photos,
  untouched.
- **Schema forward-migration to version 2.** `Entry` gains `occasion` and
  `photos`. `migrate` adds a v1→v2 case that fills those fields on older
  entries. Forward-only, never mutating an existing field's meaning.
- **Mobile-first.** The whole writing room and archive are fully usable at
  390px: no horizontal scroll, ~44px touch targets, readable text.

### Out of scope (Non-Goals — do not build)
- **WYSIWYG or rich formatting** beyond plain text. The body stays plain
  text rendered with preserved line breaks. No bold/italic toolbar, no
  markdown rendering, no HTML entry. (A "minimal safe subset" here means
  exactly: plain text with line breaks preserved, nothing more.)
- **Audio or video.** Image files only. The file picker accepts images
  only, and non-image input is rejected with a plain message.
- **Cloud photo import.** Photos come from the local file picker only. No
  Google Photos, no URL fetch, no drag-from-web. (The artifact makes zero
  network requests, forever; see below.)
- **Sealing / encryption / paper keys** (EPIC 3). Do not touch Web Crypto,
  BIP39, or QR. Entries in this EPIC are always unsealed.
- **The printable book** (EPIC 4), **the interview ritual** (EPIC 5), and
  **the first-run walkthrough** (EPIC 6). Do not build a guided tour; the
  designed empty state is the first-run surface for now.
- **Any change to the save mechanism, stale-copy detection, or the
  distribution site / staging deploy** beyond what carrying the new fields
  requires. The spine is done. Do not re-architect it.
- **Any analytics or error tracking inside the artifact.** The artifact
  makes zero network requests. Photo processing (FileReader, canvas,
  `createImageBitmap`) is entirely local and must add no exception to that.

---

## Quality bar as it applies here

The quality bar is binding spec. The clauses that bite in this EPIC:

- **Perceived speed (§1).** Picking a photo gives feedback within 100ms (an
  inline "Adding your photo" state and a disabled control), even though
  decode + re-encode of a large image takes longer. Never block the main
  thread so long the page appears frozen; process asynchronously and show
  progress when several photos are added at once. The archive with
  thumbnails must render without a blank region; thumbnails are the already
  recompressed data URLs, so there is no extra fetch.
- **Mobile-first (§2).** Editor (with the photo grid, captions, and
  reorder/remove controls) and archive are fully usable at 390px: no
  horizontal scroll, ~44px touch targets on every button, readable text.
- **Designed states (§3).** Empty archive names the product and offers the
  one action (already shipped, keep it). Loading = the per-photo processing
  state. Error = a plain, in-context message when a file is not an image or
  when the vault is at its photo budget, with a clear next action and no raw
  error. A photo that fails to decode must never crash the editor or lose
  the letter already typed.
- **First-run (§4) — boundary with EPIC 6.** No walkthrough here. The empty
  state must still not dead-end a new parent: it names the product and
  offers "Write a letter". The occasion field and the photo control carry
  real placeholder examples so the parent learns by seeing, not by reading.
- **Security hygiene (§5).** Validate at the boundary: accept image files
  only, reject anything that does not decode as an image with a plain
  message, enforce the size budget. Output encoding: captions, titles,
  occasions, and bodies are rendered as text (Preact escapes them); photo
  data URLs go only into `<img src>`. No network, ever (canvas re-encode is
  local; the CSP `connect-src 'none'` already forbids any upload). No PII in
  logs — do not log photo bytes or file names.
- **Accessibility (§6).** Every input labeled (title, occasion, body, each
  caption). Reorder and remove controls have descriptive accessible labels
  and are keyboard reachable. Photos rendered in the archive and editor
  carry meaningful `alt` text (the caption when present, otherwise a phrase
  naming the letter). Visible focus states, sufficient contrast, semantic
  headings.
- **Radically simple interface (§7).** One obvious primary action per screen
  (home: write; editor: save). The photo controls are visibly subordinate to
  the letter. Cut words: labels are one or two words, examples do the
  teaching. No paragraph explaining how to add a photo.
- **Copy (§8).** Every new visible string reads like a person wrote it. No
  em-dashes or dash-asides, positive and direct phrasing, no banned LLM
  vocabulary, no negative empty-state phrasing. Sweep before done (see the
  Example copy and Test plan sections).
- **README (§9).** Update the "Where the code lives" list if you add modules
  (a `photos` module). Keep the run/test commands accurate. No pipeline
  jargon.

---

## Technical design

### Data model (schema version 2, forward-only)

Bump `SCHEMA_VERSION` from 1 to 2 in `src/vault.ts`. Extend `Entry` and add
a `Photo` type:

```ts
export type Photo = {
  id: string;
  dataUrl: string;   // recompressed JPEG data URL ("data:image/jpeg;base64,...")
  caption: string;   // free text, may be ""
  w: number;         // recompressed pixel width
  h: number;         // recompressed pixel height
  bytes: number;     // recompressed size in bytes, used for the budget
};

export type Entry = {
  id: string;
  type: "letter";
  createdAt: string;      // ISO
  occasion: string;       // NEW: free text, may be "" (added in v2)
  title: string;
  body: string;           // plain text
  photos: Photo[];        // NEW: may be [] (added in v2)
  [extra: string]: unknown;
};
```

- `emptyVault()` still returns `schemaVersion: SCHEMA_VERSION` (now 2),
  entries `[]`. No change to the vault-level fields.
- **Migration.** `migrate(raw)` gains a forward step: when the parsed
  `schemaVersion` is 1, upgrade each entry by defaulting
  `occasion: ""` and `photos: []` if absent, then set `schemaVersion: 2`.
  Keep the existing guard: `schemaVersion < 1` throws; a `schemaVersion`
  greater than the known `SCHEMA_VERSION` (now 2) yields the designed
  "newer-version" error state, unchanged. This is the decisive choice on the
  cross-version question: bumping the version means a file carrying photos,
  if ever opened by an older shell, hits the clear "open with your newest
  copy" surface instead of silently showing letters with the photos
  invisible. That is the trust-preserving outcome for the differentiator.
- **Defensive validation.** Extend `validateEntry` in `parseVault`:
  - `occasion`: if present must be a string; a missing `occasion` on a
    freshly migrated entry is filled by `migrate`, so after migration it is
    always a string. Treat a non-string `occasion` as malformed
    (`VaultParseError`).
  - `photos`: must be an array; each element validated by a new
    `validatePhoto` (string `id`, string `dataUrl`, string `caption`,
    finite-number `w`, `h`, `bytes`). A malformed photo yields
    `VaultParseError` (the designed error state), never a silent drop and
    never a crash. Unknown extra fields on a photo are preserved like other
    unknown fields.
- Unknown-field preservation and the newer-than-known behavior are unchanged
  from EPIC 1.

### Serialization key order (`src/template.ts`)

Byte-stability must survive the new fields. Update `orderEntry`'s known key
order to include the new fields in a fixed position:

```
["id", "type", "createdAt", "occasion", "title", "body", "photos"]
```

Photo objects inside `entries[].photos` also need a deterministic key order
so serialization is stable. Add an `orderPhoto` helper with fixed order
`["id", "dataUrl", "caption", "w", "h", "bytes"]` and map it over each
entry's `photos` inside `orderVault` (mirroring how `orderEntry` is applied
today). The existing head/tail capture, `escapeForScript`, and the
byte-stability guarantee are unchanged. Base64 data URLs contain no `<`, so
`escapeForScript` is a no-op on them and the round-trip stays lossless.

### The photo module (`src/photos.ts`, new)

One small, boring module. Split the pure math (unit-testable without a
browser) from the browser-only encode (covered by e2e).

**Constants (name them, one place):**
```ts
export const MAX_EDGE = 1600;                       // px, longest edge cap
export const JPEG_QUALITY = 0.82;                   // canvas re-encode quality
export const VAULT_PHOTO_BUDGET_BYTES = 20 * 1024 * 1024; // 20 MB of photo bytes
```
JPEG is chosen deliberately over WebP: it decodes in every browser this file
might be opened in two decades from now, which is the whole bet. Small and
boring wins.

**Pure helpers (unit-tested):**
- `computeTargetDimensions(w, h, maxEdge)` → `{ w, h }`. Scales the longest
  edge down to `maxEdge`, preserving aspect ratio, rounding to integers.
  **Never upscales**: an image already within `maxEdge` keeps its
  dimensions. Handles landscape, portrait, square, and exactly-at-bound.
- `vaultPhotoBytes(vault)` → sum of `bytes` across every entry's photos.
- `wouldExceedBudget(currentBytes, addBytes)` → boolean
  (`currentBytes + addBytes > VAULT_PHOTO_BUDGET_BYTES`).
- `remainingBudget(currentBytes)` → non-negative number, for messaging.

**Browser encode (e2e-tested):**
- `recompressImage(file)` → `Promise<Photo>` (without `id`/`caption`, or with
  a fresh `id` and empty `caption`; pick one shape and keep it consistent):
  1. Reject early if `file.type` is not an image type; throw a typed
     `NotAnImageError` (or return a discriminated result) the editor turns
     into the plain "not a photo" message.
  2. Decode with `createImageBitmap(file)` (falls back to an `Image` +
     object URL if `createImageBitmap` is unavailable). A decode failure is
     treated as "not a photo".
  3. Compute target dimensions, draw onto a `<canvas>` (or `OffscreenCanvas`)
     at the target size, and re-encode with
     `canvas.toDataURL("image/jpeg", JPEG_QUALITY)` (or `toBlob` then read as
     data URL).
  4. Return `{ dataUrl, w, h, bytes }` where `bytes` is the decoded byte
     length of the data URL's base64 payload (compute it, do not guess).
  - Re-encoding through canvas also strips EXIF metadata, including any GPS
    location embedded by a phone camera. State this in a code comment: it is
    a privacy win that fits the product's promise, not an accident.
- The budget check is enforced by the *caller* (the editor), so it can show
  the message and refuse the specific photo, not inside `recompressImage`.

All of this is local: `FileReader`, `createImageBitmap`, and `<canvas>` make
no network request, and the CSP already permits `img-src data: blob:`. No
change to `index.html` or the CSP is needed or allowed here.

### Editor (`src/ui/Editor.tsx` + `src/ui/App.tsx`)

Extend the existing editor; do not replace its structure.

- Add an **Occasion** field between title and body: a labeled text input with
  a real example placeholder.
- Add a **Photos** section below the body:
  - An "Add photos" control backed by a hidden `<input type="file"
    accept="image/*" multiple>` (or a visible file input styled as a
    button). Selecting files runs each through `recompressImage`, applying
    the budget check per photo before embedding.
  - While a photo is processing, show the inline "Adding your photo" state
    immediately (within 100ms) and prevent duplicate submits.
  - Render each embedded photo as a thumbnail with: a caption text input
    (labeled), a "Move photo up" and "Move photo down" control (disabled at
    the ends), and a "Remove photo" control. All controls ~44px and keyboard
    reachable with accessible labels.
  - If a selected file is not an image, or adding it would exceed the budget,
    show the plain message near the photo controls and do not embed that
    file. Other selected files that do fit are still added.
- **App state.** The editor draft currently carries `title` and `body` in
  `App.tsx`. Extend it to carry `occasion` and `photos` too. `openWrite`
  initializes them empty; `openEntry` loads them from the entry;
  `buildVaultWithDraft` writes all four fields back. Editing maps over
  entries by `editingId` exactly as today, so **all other entries and their
  photos are preserved untouched** (this is the mechanism that satisfies the
  edit-preservation criterion; keep it a pure in-place map).
- `canSave` becomes true when any of title, occasion, body (trimmed) is
  non-empty **or** `photos.length > 0`.
- The save flow (`runSave`, `applyResult`, stale/download handling) is
  unchanged; it already serializes whatever vault it is handed. Photos ride
  along for free once the draft carries them.

### Archive home (`src/ui/Home.tsx`)

- Keep the integrity readout and the empty state exactly as shipped (the
  empty state already satisfies §3/§4/§7 for this EPIC).
- Render the entry list **sorted by `createdAt` descending** (newest first),
  with a stable tiebreak on `id` so order is deterministic. Do not rely on
  storage order.
- Each entry row shows, in addition to the title:
  - The **occasion** when present (a short line or a subtle tag).
  - The **date** (reuse `formatSavedMoment(entry.createdAt, now)`).
  - A **thumbnail** of the entry's first photo when it has one, rendered
    from the stored data URL with meaningful `alt` (the photo's caption, or a
    phrase naming the letter). No thumbnail when the entry has no photos; the
    row must still look intentional, never broken.
- Keep the row a single tappable target that opens the entry. No horizontal
  scroll at 390px with a thumbnail present.

### Styles (`src/styles.css`)

Add styles for the photo grid, thumbnails (fixed aspect box, `object-fit:
cover`), caption inputs, and the reorder/remove control cluster, plus the
archive thumbnail. Reuse the existing tokens and component classes; do not
introduce a CSS framework or a design system. Everything must hold at 390px
with no horizontal scroll.

### Sample / live demo (`src/sample.ts`)

- Extend the sample letter with an `occasion` (e.g. "The day we came home")
  and **one small inlined sample photo** so the live demo (`?demo=1` on
  staging) shows the writing room's photo feature and an archive thumbnail
  within a minute, with no typing.
- The sample photo MUST be tiny (a small-dimension JPEG data URL, target
  well under 40 KB) because it is inlined into every built artifact. Keep the
  artifact small and boring. The downloaded starter file is still the empty
  vault and never carries the sample.

### Files to touch (summary)
```
src/vault.ts        SCHEMA_VERSION=2; Photo type; Entry gains occasion+photos;
                    migrate v1→v2; validatePhoto; extend validateEntry
src/template.ts     orderEntry key order += occasion,photos; add orderPhoto
src/photos.ts       NEW: constants, pure dimension/budget math, recompressImage
src/ui/Editor.tsx   occasion field; photos section (add/caption/reorder/remove)
src/ui/App.tsx      draft state carries occasion+photos; buildVaultWithDraft
src/ui/Home.tsx     archive: sort, occasion, date, thumbnail; keep empty state
src/styles.css      photo grid, thumbnails, caption + control styles
src/sample.ts       occasion + one tiny sample photo for the demo
README.md           update module list / keep commands accurate
tests/unit/...      photos math, budget, vault v2 parse/migrate, serialize
tests/e2e/...       photo round-trip, cap, budget, archive, edit, mobile
```
Do not touch `index.html`, the CSP, `save/`, `scripts/`, the Dockerfile, or
the staging compose file. The spine is done.

---

## Example copy (ships verbatim downstream; already copy-swept)

- Occasion field label: `Occasion`
- Occasion placeholder (example, not instruction): `First birthday`
- Photos section heading: `Photos`
- Add photos button: `Add photos`
- Photo processing (inline): `Adding your photo`
- Caption input label / placeholder: `Add a caption`
- Reorder controls (accessible labels): `Move photo up` / `Move photo down`
- Remove control (accessible label): `Remove photo`
- Not-an-image message: `That file is not a photo. Choose a JPEG or PNG image.`
- Budget-reached message: `Your file has reached its photo limit. Remove a photo to add a new one.`
- Archive occasion line (rendered from the entry's occasion, no fixed copy).
- Archive thumbnail alt when no caption: `Photo from your letter "<title>"`

Retained from the spine (do not change): empty state
`Write your first letter.` / `It saves to your own file and stays with you.`
/ `Write a letter`; save strings; integrity readout strings.

Copy sweep for the strings above: no `—` or `–`; none of the banned
vocabulary ("seamlessly", "effortlessly", "unlock", "elevate", "empower",
"leverage", "robust", "dive in", and kin); error and limit messages use
positive, direct phrasing that says what happened and what to do next. The
implementer repeats this sweep over every string they add, including alt
text, placeholders, and any README copy.

---

## Ordered task list (each with acceptance criteria)

Numbers in brackets map to the planner's acceptance criteria this task helps
satisfy: [AC1] letter+photos round-trip; [AC2] recompress + budget; [AC3]
archive order/occasion/date/thumbnail; [AC4] designed empty state; [AC5]
edit preserves other entries; [AC6] usable at 390px.

1. **Schema v2: model, migration, defensive parse.** [AC1, AC5]
   - `SCHEMA_VERSION = 2`; `Photo` type; `Entry` gains `occasion` and
     `photos`. `emptyVault()` still valid.
   - `migrate` upgrades a v1 vault by filling `occasion: ""` and
     `photos: []` on every entry and setting `schemaVersion: 2`.
   - `parseVault` validates `occasion` (string) and `photos` (array of valid
     `Photo`), turning malformed data into the typed error state; a
     `schemaVersion` above 2 still shows the newer-version state. Unknown
     fields on entries and photos preserved.

2. **Byte-stable serialization with the new fields.** [AC1]
   - `orderEntry` includes `occasion` and `photos` in fixed order; a new
     `orderPhoto` gives photos a fixed key order, applied in `orderVault`.
   - `parseVault(serialize(v))` deep-equals `v` for vaults whose entries
     carry occasions and photos, including captions with `</script>`,
     `<!--`, unicode, quotes, and newlines.
   - Serializing the same vault twice is byte-identical, and everything
     outside the vault-data block stays byte-identical (spine guarantee
     preserved).

3. **Photo module: recompression + budget math.** [AC2]
   - `computeTargetDimensions` caps the longest edge to `MAX_EDGE`, preserves
     aspect ratio, and never upscales (landscape, portrait, square,
     already-small, exactly-at-bound all correct).
   - `recompressImage` decodes a real image, redraws to the target size, and
     re-encodes as a JPEG data URL; a large source image comes back at
     `<= MAX_EDGE` on its longest edge and smaller than the source.
   - Non-image input is rejected as a typed "not a photo" outcome, never a
     crash.
   - `vaultPhotoBytes`, `wouldExceedBudget`, `remainingBudget` are correct;
     the editor uses them to refuse an over-budget photo with the plain
     message.

4. **Editor: occasion, photos, captions, reorder, remove.** [AC1, AC2, AC6]
   - Occasion field added and labeled with an example placeholder.
   - Photos can be added (image files only), captioned, reordered (up/down),
     and removed. Each control is ~44px, keyboard reachable, and labeled.
   - Picking a photo shows feedback within 100ms; a large photo does not
     freeze the page; adding a typical phone photo yields a few-hundred-KB
     embed, not several MB.
   - An over-budget or non-image file shows the plain message and is not
     embedded; other valid files in the same selection are still added.
   - The draft carries all four fields; `canSave` accounts for photos.

5. **Archive: order, occasion, date, thumbnail.** [AC3, AC4]
   - Entries render newest-first (by `createdAt`, deterministic tiebreak),
     each showing occasion (when present), date, and a first-photo thumbnail
     (when present) with meaningful alt text.
   - The empty archive still names the product and offers the one action,
     with no blank region (unchanged from the spine, verified still true).
   - No horizontal scroll at 390px with thumbnails present.

6. **Edit preserves everything else.** [AC5]
   - Opening an existing entry, changing its fields and/or photos, and saving
     leaves every other entry and every other entry's photos exactly intact.

7. **Mobile, accessibility, and copy sweep.** [AC6, quality bar §2/§6/§8]
   - Editor and archive fully usable at 390px: no horizontal scroll, ~44px
     targets, readable text.
   - Every input labeled; reorder/remove controls have accessible names;
     photos have meaningful alt; focus states visible; keyboard reaches
     every control.
   - Mechanical copy sweep over every new/changed user-visible string (and
     the sample copy) passes: no `—`/`–`, no banned vocabulary, no negative
     empty-state phrasing.

8. **Demo + docs.** [quality bar §4/§9]
   - The sample letter carries an occasion and one tiny inlined photo, so the
     live demo shows a thumbnail and the photo feature within a minute; the
     downloaded starter file stays empty.
   - README module list and commands remain accurate.

---

## Test plan (automated tests prove each criterion)

**Unit / integration (Vitest):**
- **Migration & parse:** a v1 vault (entries without `occasion`/`photos`)
  migrates to v2 with `occasion: ""` and `photos: []` filled; a v2 vault with
  photos parses; a malformed `photos` element, a non-string `occasion`, and a
  `schemaVersion` of 3 each yield the right typed error (`VaultParseError` /
  newer-version); unknown fields on entries and photos preserved. [AC1, AC5]
- **Serialize round-trip & byte-stability:** `parseVault(serialize(v))`
  deep-equals `v` for entries with occasions and photos, including captions
  and bodies containing `</script>`, `<!--`, `-->`, unicode, quotes, and
  newlines; `serialize(v)` twice is identical; head/tail bytes outside the
  vault-data block unchanged when only entries differ. [AC1]
- **Dimension math:** `computeTargetDimensions` for landscape, portrait,
  square, already-within-bound (no upscale), and exactly-at-bound. [AC2]
- **Budget math:** `vaultPhotoBytes`, `wouldExceedBudget`, `remainingBudget`
  across empty, under-budget, at-budget, and over-budget vaults. [AC2]
- **Edit preservation (pure):** a helper that folds a draft into a vault by
  `editingId` leaves other entries and their photos identical; a new entry
  prepends without disturbing existing photos. [AC5]
- **Archive ordering (pure):** the sort produces newest-first with a
  deterministic tiebreak. [AC3]

**End-to-end (Playwright, real browser):**
- **Photo round-trip:** in the editor, attach a small fixture image, see it
  thumbnail, add a caption, save (download path on WebKit/Firefox), reopen
  the saved file, and assert the photo renders (an `<img>` with a `data:`
  src and non-zero natural size) and the caption is restored. [AC1]
- **Recompression cap:** attach a fixture larger than `MAX_EDGE`; assert the
  stored photo's `w`/`h` are `<= MAX_EDGE` on the longest edge and its
  `bytes` are well below the source size. [AC2]
- **Budget refusal:** with the vault near budget (seed via the vault-data
  block), attempt to add a photo that would exceed it; assert the plain
  budget message appears, the photo is not embedded, and the file does not
  grow past the budget. [AC2]
- **Archive:** an entry with an occasion and a photo shows the occasion, the
  date, and a thumbnail; an entry with no photo shows an intentional row with
  no broken image. Entries render newest-first. [AC3]
- **Empty state:** empty vault shows the designed empty state with the
  primary action and no blank region. [AC4]
- **Edit preserves others:** with two entries (each with a photo), edit one,
  save, reopen; assert the other entry and its photo are unchanged and the
  edited one reflects the change. [AC5]
- **Mobile 390px:** editor (with a photo, caption, reorder/remove controls)
  and archive (with a thumbnail) render with no horizontal scroll and
  tappable targets at a 390px viewport. [AC6]
- **Zero network preserved:** load the artifact from `file://` with request
  interception, add a photo, and save; assert no network request occurs at
  any point and the artifact source still contains no external URL. [quality
  bar §5]

**Copy sweep (mechanical, part of done):** grep every user-visible string in
the editor, archive, photo controls, alt text, the sample letter, and any
README copy for the characters `—` and `–`, the banned vocabulary, and
negative empty-state phrasing ("You don't have", "No … yet", "Nothing …
here", "Unable to", "Something went wrong"). Every hit in a shipped string is
a defect to fix in the same run. [quality bar §8]

---

## Risks and notes for the implementer
- **Silent photo loss is the cardinal sin here.** A photo shown in the editor
  must round-trip or the app must say plainly it could not add it. Prove the
  round-trip end to end; do not assume canvas re-encode "just works" across
  browsers without the e2e test.
- **Keep the recompression on canvas.** It is what bounds file size and, as a
  bonus, strips EXIF/GPS. Do not embed raw file bytes as a shortcut; that
  breaks the budget promise and leaks location metadata about a child.
- **Byte-stability is easy to break** by adding fields without fixing the key
  order. Update `orderEntry` and add `orderPhoto`, and keep the byte-stability
  test green.
- **The version bump is deliberate.** Filling defaults in `migrate` (not in
  `parseVault`'s validators) keeps the migration surface honest and
  forward-only. A file with photos opened by an older shell should hit the
  clear newer-version surface, not silently hide photos.
- **Do not cross EPIC boundaries.** No sealing, no book, no interview, no
  walkthrough, no rich text, no audio/video, no cloud import, no changes to
  the save mechanism or the deploy. If the quality bar seems to demand one of
  these, block with a precise question rather than building it.

---

## Notes on this spec's provenance
Built by expanding the planner's authoritative scope for EPIC 2 against the
shipped EPIC 1 codebase (the single-file artifact, `vault.ts`, `template.ts`,
`save/`, and the Preact UI). Concrete constants (`MAX_EDGE = 1600`,
`JPEG_QUALITY = 0.82`, `VAULT_PHOTO_BUDGET_BYTES = 20 MB`) and the JPEG
format choice are decisions the implementer can execute directly; they are
tunable in one place but the acceptance criteria are written to hold at these
defaults. No DEPLOY / STAGING DEPLOY CONTRACT block was present in this task's
context, and this EPIC does not change the deploy.
