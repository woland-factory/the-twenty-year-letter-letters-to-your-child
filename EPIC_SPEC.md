# EPIC SPEC: Polish pass (UX, performance, quality bar)

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This EPIC is a refinement pass over the whole delivered product against the
QUALITY BAR and the trustworthy-simplicity differentiator. It ships NO new
features. It tightens what already exists: perceived speed on the hot path,
mobile layout at 390px, designed empty/loading/error states on every view,
accessibility basics, and a full copy sweep. Two surfaces get the closest
attention because the product lives or dies on them: the save ritual and the
seal warning.

The product is already strong. Most of the bar is met. This spec names the
genuine, verifiable gaps found by auditing the real screens, turns each into a
concrete testable criterion, and adds standing tests so the bar cannot silently
regress. Where a criterion is already met, the task is to PROVE it with a test,
not to change working code.

This EPIC builds on the shipped product (EPIC 1 through EPIC 6): the single
self-contained `.html` artifact, the archive home (`src/ui/Home.tsx`), the
writing room (`src/ui/Editor.tsx`) and its `SaveControls` (`src/ui/SaveStatus.tsx`),
the yearly interview (`src/ui/InterviewView.tsx`), the book (`src/ui/BookView.tsx`),
the unseal view (`src/ui/UnsealView.tsx`), the seal surfaces
(`src/ui/SealDialog.tsx`, `src/ui/KeySheet.tsx`), the save/stale/backup dialogs
(`src/ui/StaleCopyDialog.tsx`, `src/ui/BackupRitual.tsx`), the first-run coach
strip (`src/ui/Walkthrough.tsx`), the designed boot and error surfaces
(`src/ui/states.tsx`, `index.html`), the pure prompt pack (`src/interview.ts`),
the phrasing helpers (`src/format.ts`), and the distribution site (`site/`). Do
not rebuild or re-architect any of it.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The felt safety and clarity of every step, above all
saving the file and sealing a letter, so a sleep-deprived non-technical parent
never fears loss across an eighteen-year commitment.

What it demands of THIS EPIC's work:

1. **The save ritual must feel unmistakably safe.** The "Saving" state, the
   "Saved. Your file is up to date." confirmation, the copy-number readout, the
   first-save file-pick hint, and the download-path backup ritual are the
   product's whole answer to "did I just lose my letter." This pass verifies each
   gives feedback within 100ms and reads calm and certain, on a phone and on a
   desktop, and locks that with tests.
2. **The seal warning must be impossible to miss.** Sealing is the one
   irreversible action in the product. Its consequence sentence must read as a
   real warning, not muted fine print, and the deliberate acknowledgement gate
   must stay in place. If a tired parent can seal a letter without registering
   that a lost key means it can never be opened, the differentiator has failed.
3. **Polish never adds fear.** Every change here makes an existing step clearer,
   faster, or more legible. It adds no new surface the parent could get lost in,
   no motion that distracts, and no words that were not already needed. When a
   choice is open, pick the calmer, quieter option.

---

## Scope

### In scope

- **Perceived speed on the hot path.** Keep the existing non-blank boot skeleton.
  Make the archive (the one unbounded list) render progressively so a vault with
  many photos never shows a blank screen: archive thumbnails load lazily and
  decode asynchronously, so off-screen photos never block first meaningful render.
- **Interaction feedback within 100ms.** Verify and, where missing, add immediate
  pressed feedback on every tappable control (buttons already have it; the archive
  entry rows do not), and prove the Save and Seal actions show their progress
  state synchronously before the async work resolves.
- **Mobile at 390px on every view.** Existing coverage: home, editor, the archive
  with a thumbnail, and all seal surfaces. Add the missing views: the book (empty
  and typeset), the interview (birth-date capture and the prompt form), the
  stale-copy dialog, the download backup ritual, and the landing site. Every one:
  no horizontal scroll, ~44px targets, readable text.
- **Designed states on every view.** Audit confirms empty, loading, and error
  states exist and are designed. This pass verifies each with a test and gives the
  boot `ErrorState` a `main` landmark so it matches the rest.
- **Accessibility basics.** Fix the real gaps found: three views render no `<h1>`
  (the editor, the populated archive, and the sealed-letter entry form), which
  also leaves an `<h2>` with no `<h1>` above it on two of them. Give every route
  exactly one top-level heading, keep landmarks and labels intact, and prove
  keyboard reach and visible focus.
- **Seal warning felt-safety tightening.** The seal consequence sentence is
  currently rendered in the muted dialog text color. Give it a clear warning
  treatment (full-strength ink, a visible warning affordance) so it reads as
  unmistakable. No change to the seal mechanism, the acknowledgement gate, or the
  crypto.
- **Full copy sweep.** Mechanically sweep every user-visible string (components,
  the site, the interview prompt pack, and this EPIC's own new strings) for
  em-dashes, banned LLM vocabulary, and negative empty-state phrasing. Add a
  standing unit test over the pure string modules (`src/interview.ts` prompt pack,
  `src/format.ts` phrases) so the sweep cannot regress.
- **README verification.** Confirm the README still lets a stranger understand,
  run (commands verified against `package.json`, the `Dockerfile`, and the compose
  file), and contribute, with no pipeline jargon. Change only what is inaccurate.

### Out of scope (Non-Goals, do not build)

- **Any new feature.** No new screen, route, control, setting, or data field. No
  schema change and no migration.
- **A redesign.** The layout, palette, type scale, and component vocabulary stay.
  Promoting a title to a real heading and emphasizing one warning paragraph are
  semantic and felt-safety fixes required by the bar, not a visual redesign. Do
  not restyle surfaces beyond the specific elements named here.
- **Pagination or capping of the archive.** The planner frames the large-vault
  concern as progressive render, not pagination. Do NOT add pagination, infinite
  scroll, virtualization, or an entry cap. Lazy image loading is the whole
  perceived-speed change.
- **An animation system.** Add no new animation. The existing boot shimmer and the
  walkthrough highlight pulse stay as they are, both already disabled under
  `prefers-reduced-motion`.
- **Optimization beyond the stated budgets.** No bundle splitting, no service
  worker, no image pipeline rework, no premature micro-optimization. The artifact
  stays one self-contained file with the same dependencies.
- **Touching the save mechanism, the seal/crypto primitives, the CSP,
  stale-copy detection, the interview age logic, the book typesetting, the
  walkthrough logic, the Dockerfile, or the staging deploy.** This pass changes
  presentation, semantics, and tests only.
- **Any network request from the artifact, ever.** The CSP forbids it and this
  pass keeps it that way. Add no fetch, font load, CDN, or analytics into the
  saved artifact.

---

## Quality bar as it applies here

The quality bar is binding spec. Each clause below is mapped to concrete,
testable criteria for this app's actual screens.

- **§1 Perceived speed.** First paint is the static boot skeleton in
  `index.html`, already non-blank. First meaningful render is the archive. The one
  unbounded list is the archive entries, and its cost is the cover thumbnails
  (base64 photos). Making those thumbnails `loading="lazy"` and `decoding="async"`
  keeps a many-photo vault from blocking the first screen. Interaction feedback:
  buttons already have an `:active` press; the archive entry rows need one; Save
  and Seal already set their progress state synchronously before awaiting.
- **§2 Mobile-first.** Baseline is 390px. Buttons are already `min-height: 44px`.
  This pass extends the 390px no-horizontal-scroll checks to the book, the
  interview, the stale and backup dialogs, and the site.
- **§3 Designed states.** Empty (home, book), loading (boot skeleton, and the
  inline "Saving" / "Sealing your letter" / "Opening your letter" / "Adding your
  photo" readouts), and error (boot `ErrorState`, save error, seal-failed message,
  photo error, unseal error, capture error) states all exist and are designed.
  This pass proves them with tests and gives the boot `ErrorState` a `main`
  landmark.
- **§4 First-run.** The first-run walkthrough already ships (EPIC 6) and is out of
  scope to change. This pass must not break it: the walkthrough e2e suite stays
  green.
- **§5 Security hygiene.** The artifact has no server, so route auth and rate
  limiting are not applicable and must not be invented. Applicable and preserved
  here: zero network requests (CSP unchanged), no secrets, no PII in logs (there
  are no logs), and no new inline event handlers or `eval`.
- **§6 Accessibility.** Fix the missing headings (see Technical design), keep the
  skip link and the `main` landmarks, keep every input labeled, keep visible
  `:focus-visible` rings, and keep keyboard reach. The seal warning must not rely
  on color alone: its emphasis pairs a visible affordance with the text.
- **§7 Radically simple interface.** Add no words to any screen. The only copy this
  EPIC introduces is one screen-reader-only heading on the populated archive
  ("Your letters"), which is invisible and additive. Every other change is
  semantic or stylistic. Do not add helper text, tooltips, or onboarding copy.
- **§8 Copy.** Sweep every user-visible string plus the prompt pack for `—`, `–`,
  the banned vocabulary, and negative empty-state phrasing. The audit found no
  violations in the shipped strings; the task is to run the mechanical sweep, fix
  any hit, and add the standing test so it stays clean.
- **§9 README for strangers.** Verify understand / run / contribute against the
  real `package.json` scripts and compose files. No pipeline jargon.

---

## Technical design

Every change is small and additive. Files touched:

```
src/ui/Home.tsx        lazy+async archive thumbnails; screen-reader h1 on the populated archive
src/ui/Editor.tsx      promote the topbar title to an <h1>
src/ui/UnsealView.tsx  promote the topbar title to an <h1> on the word-entry screen
src/ui/SealDialog.tsx  give the consequence sentence a warning class (not muted)
src/ui/states.tsx      ErrorState renders inside a <main> landmark
src/styles.css         .seal-warning treatment; .entry:active press; .brand-as-h1 margin reset
README.md              verify only; edit only if a command or claim is inaccurate
tests/unit/copy.test.ts        NEW: standing copy sweep over the prompt pack and format phrases
tests/e2e/polish.spec.ts       NEW: one-h1-per-route, main landmarks, lazy thumbnails, large-vault render, seal warning
tests/e2e/mobile.spec.ts       extend: book, interview, stale dialog, backup ritual at 390px
tests/e2e/site.spec.ts         extend: landing page at 390px has no horizontal scroll
```

Do NOT touch: `src/vault.ts`, `src/template.ts`, `src/save/`, `src/seal.ts`,
`src/qr.ts`, `src/mnemonic.ts`, `src/entries.ts`, `src/photos.ts`,
`src/walkthrough.ts`, `src/ui/Walkthrough.tsx`, `src/ui/KeySheet.tsx`,
`src/ui/BookView.tsx`, `src/ui/BackupRitual.tsx`, `src/ui/StaleCopyDialog.tsx`,
`index.html`, the CSP, `scripts/`, the Dockerfile, or the compose file. No new
dependency.

### Perceived speed: progressive archive render (`src/ui/Home.tsx`)

The archive is the hot path and the only unbounded list. Its cost is the cover
thumbnails, each an inline base64 photo.

- On the archive cover `<img class="entry-thumb">`, add `loading="lazy"` and
  `decoding="async"`. The image keeps its explicit `width`/`height` (already
  present), so the row height is reserved and lazy loading causes no layout shift.
- Do NOT change `src/ui/BookView.tsx`. The book is a deliberate single-view render
  and prints; lazy loading there risks blank images in print. Leave book photos
  eager.
- The editor photo thumbnails and the revealed-letter photos are bounded by the
  photo budget and are not a hot list. Adding `decoding="async"` there is
  optional and consistent; it is not required and must not change layout.

This is the entire perceived-speed change. The boot skeleton already prevents a
blank first paint and stays untouched.

### Interaction feedback (`src/styles.css`)

- Add `.entry:active { transform: translateY(1px); }` (mirroring `.btn:active`)
  so tapping an archive row gives an immediate pressed response. Keep it inside no
  new media query; it is one rule.
- No change to Save or Seal: `runSave` sets `phase = "saving"` and `runSeal` sets
  `sealing = true` synchronously before awaiting, and the button label and
  disabled state react immediately. This is verified by test, not changed.

### Accessibility: one heading per route

Audit result. Every route renders a `<main class="page" id="main">` landmark
(good), but three views render no `<h1>`:

- **Editor** (`src/ui/Editor.tsx`): the topbar shows `<span class="brand">Write a
  letter</span>` and the photos section is an `<h2>`, so there is an `<h2>` with
  no `<h1>`. Promote the topbar brand to `<h1 class="brand">Write a letter</h1>`.
- **Populated archive** (`src/ui/Home.tsx`): the shared topbar brand is the
  product name and the birthday nudge is an `<h2>`, so the populated branch has an
  `<h2>` with no `<h1>`. The empty branch already has a visible `<h1>` ("Write your
  first letter.") and must keep it. Add a screen-reader-only heading to the
  populated branch only: `<h1 class="visually-hidden">Your letters</h1>` as the
  first child of the populated content. This keeps the visual design unchanged
  (the readout stays the first visible element) while giving the archive a
  programmatic title. Keep the shared topbar brand a `<span>` on Home.
- **Sealed-letter entry form** (`src/ui/UnsealView.tsx`, the non-revealed return):
  the topbar shows `<span class="brand">Open a sealed letter</span>` and there is
  no heading. Promote that brand to `<h1 class="brand">Open a sealed letter</h1>`.
  The two revealed branches already render a `<h1 class="reveal-title">`; keep
  their topbar brand a `<span>` so each has exactly one `<h1>`.

Views already correct (leave unchanged): the interview capture step (`<h1>First,
your child's birth date.</h1>`), the interview prompt form (`<h1>{title}</h1>`),
the book cover (`<h1 class="book-cover-title">`), the book empty state
(`<h1>Your book fills as you write.</h1>`), and both revealed unseal views.

When a `<span class="brand">` becomes an `<h1 class="brand">`, it must look
identical. The `.brand` rule already sets `font-size` and `font-weight`; add
`margin: 0` to the `.brand` rule (or a scoped `.topbar h1.brand { margin: 0; }`)
so the default `h1` margin does not shift the topbar. No other visual change.

### Accessibility: boot error landmark (`src/ui/states.tsx`)

`ErrorState` renders `<div class="page">`. Change it to
`<main class="page" id="main">` so the boot error screen has the same landmark as
every other view. Keep the existing `role="alert"` heading and body. No copy
change.

### Seal warning felt-safety (`src/ui/SealDialog.tsx`, `src/styles.css`)

The consequence sentence in `SealDialog` currently renders as a `<p id="seal-body">`
styled by `.dialog p { color: var(--ink-soft); }` (muted). For the one
irreversible action, that reads as fine print.

- Give the consequence paragraph a dedicated class, for example
  `<p id="seal-body" class="seal-warning">`, keeping the exact same text:
  "Sealing locks this letter. Only the printed key opens it. A lost key means this
  letter cannot be opened, and the book prints only unsealed letters."
- Add a `.seal-warning` rule in `src/styles.css`: full-strength `color: var(--ink)`
  (not muted), a readable weight, and a clear warning affordance that does not rely
  on color alone (for example a left accent border in `--danger` with padding, in
  the same restrained visual vocabulary as the existing `.nudge` inset). It must
  meet AA contrast on the dialog background. Keep it one paragraph.
- Do not change the acknowledgement checkbox, the button labels ("Seal and show my
  key", "Keep it open"), the Escape/backdrop cancel behavior, or the focus trap.
  The warning stays a warning; it just becomes unmistakable.

### Copy sweep (`tests/unit/copy.test.ts`, new)

The audit read every user-visible string in the components, the site, the prompt
pack, and `src/format.ts`, and found no em-dashes, no banned vocabulary, and no
banned negative empty-state phrasing. The task is to run the mechanical sweep once
more over everything this pass touches, fix any hit, and lock the pure string
modules with a standing test:

- Flatten every prompt text in `AGE_BANDS` (`src/interview.ts`), the outputs of
  `interviewTitle(0)` and `interviewTitle(5)`, and the phrase outputs of
  `src/format.ts` (`formatEntryCount`, `formatCopyLine`, `formatSavedMoment`,
  `formatFullMoment`, `formatBookDate` for a sample date, and their fallback
  strings).
- Assert none contains `"—"` or `"–"`, none matches the banned-vocabulary list
  (case-insensitive: "seamlessly", "effortlessly", "unlock", "elevate", "empower",
  "leverage", "robust", "dive in", "in today's fast-paced world", "we've got you
  covered", and kin), and none matches the negative empty-state patterns ("You
  don't have", "No ... yet", "Nothing ... here", "Unable to", "Something went
  wrong").
- The existing `tests/unit/walkthrough.test.ts` already locks the walkthrough
  strings; do not duplicate that.
- Component and site strings are not exported as data, so their sweep is the
  mechanical grep documented in the Test plan, run and confirmed clean in this run.

### README (`README.md`)

Verify, do not rewrite:

- Every command runs and matches `package.json`: `npm install`, `npm run dev`,
  `npm run build`, `npm start -- -p 3100`, `npm test`, `bash scripts/e2e.sh`, and
  the `docker build` / `docker run -e SEED_DEMO=1` lines against the `Dockerfile`.
- The "Where the code lives" module list still matches `src/`. This EPIC adds no
  module, so it should already match; correct any drift.
- No App Factory paths, agents, task types, or internal services appear.

Edit only what is inaccurate. If everything is accurate, README is unchanged and
that is a pass.

---

## Ordered task list (each with acceptance criteria)

Brackets map to the planner's acceptance criteria: [AC1] fast first meaningful
render and non-blank large-vault open; [AC2] 100ms feedback including save and
seal progress; [AC3] every view usable at 390px; [AC4] designed empty/loading/
error states everywhere; [AC5] accessibility basics; [AC6] copy sweep incl. the
prompt pack; [AC7] save ritual and seal warning felt safety; [AC8] README.

1. **Progressive archive render.** [AC1]
   - Archive cover thumbnails carry `loading="lazy"` and `decoding="async"` and
     keep their explicit `width`/`height`. Opening a seeded vault with many photo
     entries shows the integrity readout and the first entries with no blank
     screen; off-screen thumbnails are lazy. The book is unchanged.

2. **Immediate interaction feedback.** [AC2, AC7]
   - Archive entry rows show a pressed state on `:active`. The Save button shows
     "Saving" and is disabled the moment it is pressed, before the save resolves.
     The Seal flow shows "Sealing your letter" the moment it starts. All proven by
     test.

3. **Mobile at 390px on every view.** [AC3]
   - At 390px with no horizontal scroll and ~44px targets: the book (empty and
     typeset), the interview birth-date capture step and the prompt form, the
     stale-copy dialog, the download backup ritual, and the landing site. (Home,
     editor, archive, and all seal surfaces are already covered; keep them green.)

4. **One heading per route, landmarks intact.** [AC5]
   - Every route's `<main>` contains exactly one `<h1>` naming the screen: the
     editor, the populated archive (screen-reader-only "Your letters"), and the
     sealed-letter entry form gain one; all other views keep their single existing
     one. Heading order is valid (no `<h2>` without an `<h1>`). The boot
     `ErrorState` renders inside a `<main>` landmark. The skip link still targets a
     landmark, every input stays labeled, and keyboard focus reaches every control
     with a visible ring. Promoted headings look identical to the prior spans.

5. **Designed states proven.** [AC4]
   - Automated coverage exists for: the home empty state, the book empty state,
     the boot error state (corrupted vault and the newer-version message), the save
     error, the photo error, and the unseal error, each showing product-voice copy
     and no raw error text. (The corrupted-vault error is already covered; add the
     book empty state and the newer-version boot error if not yet covered.)

6. **Seal warning unmistakable, save ritual calm.** [AC7]
   - The seal consequence sentence renders with the warning treatment (full-strength
     ink, a color-independent affordance, AA contrast), not the muted dialog color,
     and sealing still requires the acknowledgement checkbox. The save confirmation
     "Saved. Your file is up to date." and the copy-number readout are present and
     legible at 390px. Proven by test.

7. **Copy sweep clean and locked.** [AC6]
   - The mechanical sweep over every user-visible string, the interview prompt
     pack, the site, and this EPIC's new strings finds no em-dash, no banned
     vocabulary, and no negative empty-state phrasing (fix any hit). A standing unit
     test sweeps the prompt pack and `src/format.ts` phrases and fails on any hit.

8. **README verified.** [AC8]
   - Every documented command matches `package.json` and the compose files, the
     module list matches `src/`, and no pipeline jargon appears. Edited only where
     inaccurate.

---

## Test plan (automated tests prove each criterion)

**Unit (Vitest), `tests/unit/copy.test.ts` (new):**

- Sweep `AGE_BANDS` prompt texts, `interviewTitle(0)`/`interviewTitle(5)`, and the
  `src/format.ts` phrase outputs (including the "at an unknown time", "an unknown
  time", and "an undated day" fallbacks) for `—`/`–`, the banned vocabulary
  (case-insensitive), and the negative empty-state patterns. Every string passes.
  [AC6]

**End-to-end (Playwright, `file://`, all engines), `tests/e2e/polish.spec.ts`
(new):** (reuse `writeSeededArtifact`, `ARTIFACT_URL`, `MOCK_FSA`,
`VALID_JPEG_DATA_URL`, `attachGeneratedImage` from `tests/e2e/helpers.ts`)

- **One h1 per route.** For each state, assert `main h1` count is exactly 1: the
  empty archive, the populated archive (seed one letter; the single h1 is the
  screen-reader "Your letters"), the editor (open it), the interview capture step,
  the interview prompt form, the book (empty and, seeded, typeset), the
  sealed-letter entry form (seed a sealed entry, open it), and a revealed letter.
  [AC5]
- **Main landmark on the boot error.** Corrupt the vault block (as
  `states.spec.ts` does) and assert the error screen is inside a `main` landmark
  and shows product-voice copy with no "stack"/"undefined". [AC4, AC5]
- **Lazy archive thumbnails.** Seed a vault with a photo letter and assert
  `.entry-thumb` carries `loading="lazy"` and `decoding="async"`. [AC1]
- **Large-vault progressive open.** Seed a vault with roughly 40 letters, each
  with a `VALID_JPEG_DATA_URL` photo, plus `firstRunDone: true`. Open it and assert
  the boot skeleton (`.boot`) is gone, the integrity readout and the first entry
  are visible, and at least one below-the-fold `.entry-thumb` is
  `loading="lazy"`. No blank screen. [AC1]
- **Seal warning is emphasized, not muted.** Open the seal dialog and assert the
  consequence sentence element carries the `seal-warning` class and its computed
  `color` is not the muted `--ink-soft` value (compare against the resolved
  `--ink`/`--ink-soft` custom properties). Assert the Seal confirm button is
  disabled until the acknowledgement checkbox is checked. [AC7]
- **Immediate save/seal feedback.** With `MOCK_FSA`, in the editor type a letter,
  press Save, and assert the button reads "Saving" and is disabled; then the
  "Saved. Your file is up to date." confirmation appears. Start a seal and assert
  "Sealing your letter" shows. [AC2, AC7]
- **Entry press affordance.** Assert `.entry:active` yields a nonzero transform (or
  that the rule exists) so a tapped row responds. (A light check; the main proof of
  §1 feedback is the save/seal test above.) [AC2]

**End-to-end mobile, `tests/e2e/mobile.spec.ts` (extend, `viewport 390x800`):**

- The book empty state and a seeded typeset book: visible and no horizontal
  scroll. [AC3]
- The interview birth-date capture step and the prompt form (open via "Record an
  interview" from a seeded vault that has a child birth date, and from one without,
  to hit both): no horizontal scroll, Continue/Save reachable. [AC3]
- The stale-copy dialog (Chromium, `MOCK_FSA` with `window.__tylDisk` preloaded
  with a higher-generation copy so a save triggers the stale prompt) and the
  download backup ritual (non-Chromium path, or a stubbed download): each visible
  with no horizontal scroll and ~44px buttons. [AC3]

**End-to-end site, `tests/e2e/site.spec.ts` (extend):**

- At a 390px viewport, the landing page shows the heading and both action links
  with no horizontal scroll. [AC3]

**Copy sweep (mechanical, part of done):** grep every user-visible string across
`src/ui/`, `src/interview.ts`, `src/format.ts`, `site/index.html`, and the README
line touched here for the characters `—` and `–`, the banned vocabulary, and the
negative empty-state phrasing. Fix any hit in the same run. The unit test locks the
pure string modules permanently. [AC6]

**Regression:** the full existing suite (`npm test` and `bash scripts/e2e.sh`,
including the walkthrough, seal, book, interview, photos, states, and mobile specs)
stays green. This pass must not change any shipped behavior beyond presentation,
semantics, and the lazy-thumbnail attributes. [all]

---

## Risks and notes for the implementer

- **This is polish, not a rebuild.** The single biggest failure mode here is
  drift: "improving" working code, restyling surfaces, or adding features. Change
  only the elements named above. When a criterion is already met, prove it with a
  test and move on.
- **Do not add pagination or virtualization.** The planner's large-vault criterion
  is progressive render via lazy thumbnails, and capping the archive is a redesign
  and a Non-Goal. Lazy `loading`/`decoding` on the archive thumbnails is the entire
  perceived-speed change.
- **Do not lazy-load the book's photos.** The book prints, and a lazy image that
  has not scrolled into view can print blank. Leave `src/ui/BookView.tsx`
  untouched.
- **Keep promoted headings visually identical.** Turning a `.brand` span into an
  `<h1 class="brand">` must not change how the topbar looks. Reset the default h1
  margin on `.brand`. The mobile no-scroll tests and a visual glance guard this.
- **The seal warning stays a warning, not a redesign.** Emphasize the one
  consequence paragraph. Do not restructure the dialog, change its copy, or weaken
  the acknowledgement gate. The affordance must not rely on color alone.
- **The screen-reader "Your letters" heading is the only new copy.** It is
  `visually-hidden` and additive. Add no other words to any screen. Sweep it: no
  dash, no banned vocabulary, positive phrasing.
- **Preserve the zero-network guarantee.** Add no fetch, font, CDN, analytics, or
  inline handler to the artifact. The CSP is unchanged and the artifact tests that
  prove zero network stay green.
- **The walkthrough must survive.** This pass touches Home, Editor, and UnsealView,
  which the walkthrough highlights. Keep the `walk-highlight` class threading and
  the existing walkthrough e2e green.

---

## Notes on this spec's provenance

Built by expanding the planner's authoritative scope for this polish EPIC against
the shipped EPIC 1 through EPIC 6 codebase, read screen by screen: `index.html`
(the static boot skeleton), `src/main.tsx` (synchronous boot), `src/ui/states.tsx`
(boot loading and error), `src/ui/Home.tsx`, `src/ui/Editor.tsx` and
`src/ui/SaveStatus.tsx`, `src/ui/InterviewView.tsx`, `src/ui/BookView.tsx`,
`src/ui/UnsealView.tsx`, `src/ui/SealDialog.tsx`, `src/ui/KeySheet.tsx`,
`src/ui/BackupRitual.tsx`, `src/ui/StaleCopyDialog.tsx`, `src/ui/Walkthrough.tsx`,
`src/styles.css`, `src/interview.ts`, `src/format.ts`, `src/sample.ts`, the save
paths under `src/save/`, the site (`site/index.html`, `site/styles.css`), and the
existing test suites under `tests/`.

The audit found a strong product already meeting most of the bar. The genuine gaps
turned into criteria here: three views with no `<h1>` (two with an `<h2>` above no
`<h1>`), the seal warning rendered in muted text, the archive thumbnails not lazy,
missing 390px coverage for the book, interview, and dialog surfaces, the boot
`ErrorState` lacking a `main` landmark, and the absence of a standing copy-sweep
test over the prompt pack. Color contrast was measured for the muted text pair and
passes AA, so no contrast change is specified. No planning gap required resolving,
and no DEPLOY / STAGING DEPLOY CONTRACT block was present in this task's context;
this EPIC does not change the deploy.
