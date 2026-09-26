# EPIC SPEC — First-run walkthrough

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This EPIC adds the guided path that walks a brand-new parent through the core
loop once: write a letter, save it to their own file, understand which saved copy
to reopen, and seal a letter. The path points at the real controls one short
imperative step at a time, is skippable at every step, and appears only until the
parent's first success. Once the parent has saved or sealed, the walkthrough is
dismissed permanently by setting `firstRunDone` on the saved vault, and a
returning parent (a vault with content or `firstRunDone`) never sees it again.

This EPIC builds on the shipped product (EPIC 1 through EPIC 5): the single
self-contained `.html` artifact with byte-stable self-carrying save on both
browser paths, the `Vault`/`Entry` model with forward-only migration in
`src/vault.ts` (which already declares the unused `firstRunDone` field), the
archive in `src/ui/Home.tsx`, the writing room in `src/ui/Editor.tsx`, the seal
flow through `src/ui/SealDialog.tsx` and `src/ui/KeySheet.tsx`, the
download-path `src/ui/BackupRitual.tsx`, and the App controller in
`src/ui/App.tsx`. Do not rebuild or re-architect any of that. The walkthrough is
a thin, non-modal guide layered over the existing screens. It adds no new route,
no new save path, and no new data beyond finally consuming `firstRunDone`.

`firstRunDone` exists in the model (`src/vault.ts`), is serialized
(`src/template.ts`), and is set to `true` in several test fixtures already, but
no shipped screen reads or writes it. This EPIC is the first and only consumer.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The felt safety and clarity of every step, above all
saving the file and sealing a letter, so a sleep-deprived non-technical parent
never fears loss across an eighteen-year commitment.

What it demands of THIS EPIC's work:

1. **The walk builds trust in exactly the two fear points.** The whole reason a
   first-run guide exists here is to carry a nervous parent past the two moments
   the product lives or dies on: pressing Save for the first time (where does my
   file go, is it safe) and pressing Seal (is this really irreversible). The
   walkthrough must lead the parent through a real save and, if they choose, a
   real seal, so their first contact with both scary steps happens with a calm
   hand on their shoulder. A walk that stops before a real save has not done its
   job.
2. **The guide never becomes the thing to fear.** It must never block a control,
   trap focus, cover the button it is pointing at, hijack the keyboard, or make
   the parent feel chased. It is a quiet strip that points and then gets out of
   the way, skippable at every step. If the guide itself feels like software the
   parent could get stuck in, it has failed the differentiator.
3. **It disappears cleanly and stays gone.** After the first save or seal it is
   dismissed permanently through `firstRunDone`, persisted on that same save. A
   returning parent, and a reviewer opening the seeded demo, must never be trapped
   in it. The demo shows the sealed-letter differentiator within a minute with no
   walkthrough in the way.

When any choice here is open, choose the option that keeps the parent calm and
in control: point, do not block; suggest, do not trap; and make Skip always one
tap away.

---

## Scope

### In scope

- **A pure walkthrough model (`src/walkthrough.ts`, new).** The ordered step
  list, the one-sentence copy for each step, and the pure predicate that decides
  whether a brand-new parent should see the walk at boot. No Preact import; fully
  unit-tested.
- **A non-modal coach strip (`src/ui/Walkthrough.tsx`, new).** A small pinned
  region that shows the current step's single imperative sentence, a quiet step
  indicator, and a Skip control. It never covers or disables the control it points
  at, and it is not a focus trap.
- **Highlighting the real control for the current step.** The archive's "Write a
  letter" button, the editor's Save button, the save confirmation readout, and
  the editor's "Seal this letter" button are visibly emphasized when they are the
  current step's target, so the parent's eye goes straight to the real control.
- **Step progression driven by real actions.** Opening the editor advances past
  "write"; a successful save advances past "save"; acknowledging the backup
  guidance advances past "backup"; a successful seal completes the walk. No step
  advances on anything other than the parent doing (or acknowledging) the real
  thing.
- **Permanent dismissal through `firstRunDone`.** The first successful save or
  seal writes `firstRunDone: true` into the saved vault, so the file itself
  records that first-run is done. The walkthrough is gated on `firstRunDone` and
  on whether the vault already holds entries, so a returning parent never sees it.
- **Skip at every step.** A single Skip control on the coach strip hides the walk
  for the rest of the session. Skipping before any save writes nothing (the app
  never saves without the parent's Save press), so a parent who skips an untouched
  starter file may see the walk again on the next open. That is correct: they have
  not yet had their first success.
- **The seeded demo is never trapped.** On staging with `SEED_DEMO`, the demo
  vault already carries entries, so the walkthrough does not show and the reviewer
  reaches the sealed-letter differentiator within a minute. To make the intent
  explicit and self-documenting, also set `firstRunDone: true` in `sampleVault()`.
- **Designed, mobile-first, accessible, swept.** The coach strip is a designed
  surface, fully usable at 390px, keyboard reachable with visible focus, announced
  politely to assistive tech, and every visible string passes the copy sweep. It
  carries `no-print` so it never appears in the printed book or key sheet.

### Out of scope (Non-Goals — do not build)

- **A tutorial video.** No video, no animation sequence, no media of any kind.
- **A multi-page onboarding wizard.** The walk is a strip over the real screens,
  not a full-screen takeover, not a carousel of instruction pages, not a modal
  the parent has to click through before reaching the app. The real controls are
  always visible and usable underneath.
- **A re-triggerable tour.** There is no "show me the walkthrough again" button,
  no help menu entry, no settings toggle, no replay. Once first-run is done it is
  done. Do not add a way to bring it back.
- **A new route, screen, or data model change.** The walk reuses the existing
  home, editor, seal, and backup surfaces. It adds no `Route`, no schema bump, no
  migration, and no vault field beyond consuming the existing `firstRunDone`.
- **Autosave or any save the parent did not press.** Permanent dismissal comes
  from a real Save or Seal that the parent performs. The walkthrough must never
  trigger a background write to persist its own state. Skip is session-only.
- **Changing the save mechanism, the seal or crypto primitives, the CSP,
  `index.html`, stale-copy detection, the interview flow, the book, the
  distribution site, the Dockerfile, or the staging deploy.** The only behavioral
  change to existing save/seal paths is that the outgoing vault now carries
  `firstRunDone: true`.
- **Any network request from the artifact, ever.** The walkthrough is pure client
  state. It adds no fetch, no CDN load, no `eval`.

---

## Quality bar as it applies here

The quality bar is binding spec. §4 (first-run) and §7 (radically simple
interface) are the load-bearing clauses for this EPIC and must be met together:
the walk points at controls one short step at a time and never lectures.

- **Perceived speed (§1).** The coach strip renders synchronously from in-memory
  state. Showing, advancing, and hiding it are instant with no network and no
  query. Highlighting a control is a class toggle. There is no perceptible delay
  between a real action and the step advancing.
- **Mobile-first (§2).** At 390px the coach strip fits with no horizontal scroll,
  does not cover the control it points at, and its Skip (and the "Got it" advance
  on the backup step) are ~44px tappable targets with readable text. The strip
  sits where it does not fight the on-screen primary action on a phone.
- **Designed states (§3).** The walk is itself a designed surface, not an
  accident: a clear current-step line, a quiet step indicator, an always-present
  Skip. There is no loading or error state to invent (it is pure local state).
- **First-run (§4) — this is the EPIC.** A brand-new parent is actively led
  through completing the core action once: a short guided path (2 to 4 steps)
  anchored to the real controls, each step one short imperative sentence, a
  highlighted next step. It is skippable at any step, appears only until the first
  success, and never again after. A clear layout alone does not satisfy this; the
  guide is what turns a curious visitor into a parent who has safely saved and
  sealed once. The example the parent finishes is their own real first letter, and
  it produces real output (a saved file, and if they seal, a printed key).
- **Radically simple interface (§7).** The walk must not add words to the screen
  or prop up a confusing layout. Each step is ONE short imperative sentence. The
  strip has exactly one obvious control to move forward at the manual step (the
  backup "Got it") and one quiet Skip. It never competes with the screen's own
  primary action. It points at a control instead of explaining it. If the walk
  needs a paragraph to make a screen usable, the screen is the bug, not the walk.
- **Security hygiene (§5).** The artifact has no server, so route-authorization
  and rate-limiting are not applicable and must not be invented. Applicable here:
  make zero network requests, log nothing (the walk sees no PII), and persist
  `firstRunDone` only through the existing, parent-initiated save.
- **Accessibility (§6).** The coach strip is a labelled region (for example
  `role="region"` with an `aria-label` such as "Getting started", or a heading it
  is labelled by). The current step line is announced politely via an
  `aria-live="polite"` region so a step change is spoken without stealing focus.
  The strip is NOT a focus trap and NOT `aria-modal`: keyboard users must still
  reach the highlighted real control and everything else on the page. Skip and the
  backup "Got it" are real buttons, keyboard reachable, with visible focus. The
  control highlight is a visible outline or ring, never color alone, and never
  relies on the highlight to convey meaning that the step line does not also state.
- **Copy (§8).** Every visible string reads like a person wrote it: no em-dashes
  or dash-asides, positive and direct phrasing, no banned LLM vocabulary, no
  negative empty-state phrasing. The step copy ships verbatim from
  `src/walkthrough.ts`; it is swept here and again by the implementer, and locked
  by an automated test (see Test plan).
- **README (§9).** Add `src/walkthrough.ts` and `src/ui/Walkthrough.tsx` to the
  "Where the code lives" module list, and add one plain line to "What makes it
  different" about the first-run guide that walks a new parent through their first
  save and seal. Keep the run/test commands accurate. No pipeline jargon.

---

## Technical design

### Walkthrough model (`src/walkthrough.ts`, new)

Pure, no Preact import, fully unit-tested. It owns the step order, the copy, and
the boot predicate.

```ts
import type { Vault } from "./vault";

export type WalkStep = "write" | "save" | "backup" | "seal";

// The ordered path. Four steps, mapping one-to-one to the planner's anchors:
// write a letter, save the file, understand the backup copy, seal once.
export const WALK_STEPS: WalkStep[] = ["write", "save", "backup", "seal"];

// One short imperative sentence per step. Ships verbatim; copy-swept.
export const WALK_COPY: Record<WalkStep, string> = {
  write: "Write your first letter.",
  save: "Save it to your own file.",
  backup: "Keep this saved copy as the one you reopen.",
  seal: "Seal a letter to lock it.",
};

// True only for a brand-new parent: no first-run success recorded and no
// content yet. This is the negation of the planner's "returning parent (a vault
// with content or firstRunDone) never sees it." Pure, so it is unit-testable and
// is the single source of truth for whether the walk starts.
export function firstRunPending(vault: Vault): boolean {
  return !vault.firstRunDone && vault.entries.length === 0;
}
```

- `firstRunPending` is used ONCE, at App mount, to seed the session's
  `walkActive` state. It is deliberately not re-read after saves flip
  `firstRunDone`, so the parent is not yanked out of the walk mid-session the
  instant they complete their first save (they still get the backup and seal
  steps). See App controller below.
- Do not add a "next step" helper that reaches into UI concerns here; step
  transitions live in the App controller as small, explicit handlers, because
  each transition is triggered by a different real event.

### Coach strip (`src/ui/Walkthrough.tsx`, new)

A pure function of its props. It renders the current step and nothing else.

Props:

```ts
{
  step: WalkStep;              // the current step
  stepNumber: number;          // 1-based, for the indicator
  totalSteps: number;          // WALK_STEPS.length
  canAdvance: boolean;         // true only on the manual "backup" step
  onAdvance: () => void;       // used only by the backup step's "Got it"
  onSkip: () => void;
}
```

Structure and behavior:

- A single fixed, non-modal region pinned to the bottom of the viewport (so it is
  reachable on a phone without covering the primary action, which sits in the
  page flow above it). It has a solid background, a top border, and a comfortable
  tap area. It must not use `role="dialog"`/`aria-modal` and must not trap focus.
- Inside: a quiet step indicator ("Step 2 of 4"), the current step's sentence from
  `WALK_COPY[step]` in an `aria-live="polite"` line so a step change is announced,
  a Skip button (`aria-label="Skip the walkthrough"`), and, only when
  `canAdvance` is true (the backup step), a single "Got it" button that calls
  `onAdvance`.
- The strip never renders the real controls. It points at them: the App highlights
  the on-screen control for the current step (see below). The strip carries the
  `no-print` class so it is hidden from the printed book and key sheet.
- Keep it to one line of guidance plus the two controls. No paragraph, no list of
  all steps, no illustrations.

### Highlighting the current control (`src/ui/Home.tsx`, `src/ui/Editor.tsx`)

Thread one optional prop through the two screens that own the walk's target
controls, so the App can point the parent at the right button without the strip
covering it.

- **`Home`** gains an optional `highlightWrite?: boolean` prop. When true, add a
  `walk-highlight` class to the archive's primary "Write a letter" button (both
  the empty-state button and the non-empty archive-actions button, whichever is
  rendered). No other change to Home.
- **`Editor`** gains an optional `highlight?: "save" | "backup" | "seal" | null`
  prop. When `"save"`, add `walk-highlight` to the Save button; when `"seal"`, add
  it to the "Seal this letter" button; when `"backup"`, add it to the save
  confirmation readout container (the `.save-status` region) so the parent's eye
  lands on the "Saved. Your file is up to date." line the backup step is talking
  about. When `null`/absent, nothing is highlighted.
- The highlight is a visible outline/ring drawn in CSS (see Styles). It changes
  appearance only; it never disables, moves, or wraps the control.

Do not restructure these components. The prop is read only to toggle one class.

### App controller (`src/ui/App.tsx`)

Extend the existing controller. Keep its save, seal, unseal, interview, and stale
orchestration intact and reuse it. The walk is layered on; it changes no existing
flow except to persist `firstRunDone` and to advance its own step.

Add session state:

```ts
const [walkActive, setWalkActive] = useState<boolean>(firstRunPending(initialVault));
const [walkStep, setWalkStep] = useState<WalkStep>("write");
```

- `walkActive` is seeded from `firstRunPending(initialVault)` at mount and is
  session-only. It is never recomputed from the vault after saves; only Skip and
  completing the seal turn it off.
- **Persist `firstRunDone` on the first success.** Before every
  `controller.save(next)` call in `runSave`, `saveInterview`, and `runSeal`,
  ensure the outgoing vault carries the flag: if `!next.firstRunDone`, set
  `next = { ...next, firstRunDone: true }`. This is idempotent (already-true
  vaults are unchanged) and applies on all three save paths, so a first letter
  save, a first interview save, or a first seal all record first-run as done in
  the file that gets written. Because `applyResult` sets `vault = result.vault`
  only on a saved outcome, the in-memory vault also gains the flag on success and
  keeps `false` on cancel/error (so a retried save still sets it). The
  stale-replace path (`replaceDiskCopy`) already saves the `pending` vault, which
  was built with the flag, so it is covered.
- **Advance the walk on real events.** Add small, explicit transitions:
  - In `openWrite()`: if `walkActive && walkStep === "write"`, set
    `walkStep = "save"`. (The parent acted on "Write a letter".)
  - In `applyResult`, in the `status === "saved"` branch for a non-seal save
    (`seal === null`): if `walkActive && walkStep === "save"`, set
    `walkStep = "backup"`. (The first save just succeeded.)
  - Backup acknowledgement: advance `walkStep` from `"backup"` to `"seal"` when
    the parent presses the strip's "Got it" (`onAdvance`) on the Chromium path,
    or when they press "Got it" on the existing `BackupRitual` dialog (download
    path); wire both to the same `advanceFromBackup()` that sets
    `walkStep = "seal"` when `walkActive && walkStep === "backup"`. (Do not change
    BackupRitual's own behavior; just also advance the walk when it closes.)
  - In `applyResult`, in the `status === "saved"` branch for a seal
    (`seal !== null`, the branch that shows the key sheet): if `walkActive`, set
    `walkActive = false`. (The first seal completed; the walk is done and the key
    sheet is the payoff.)
- **Skip.** `onSkip` sets `walkActive = false`. Nothing is persisted.
- **Compute the render inputs.** Derive the current highlight target and the
  strip props from `walkActive`/`walkStep`/`route`:
  - Show the strip only when `walkActive` is true.
  - `highlightWrite` for `Home` is `walkActive && walkStep === "write" && route === "home"`.
  - `Editor`'s `highlight` is: `"save"` when `walkStep === "save"`, `"backup"`
    when `walkStep === "backup"`, `"seal"` when `walkStep === "seal"`, else
    `null`, and only while `walkActive && route === "editor"`.
  - `canAdvance` (the strip's "Got it") is `walkStep === "backup"`.
- **Do not show the strip over a blocking dialog it would fight.** While
  `SealDialog`, `KeySheet`, or `StaleCopyDialog` is open, hide the coach strip
  (render it only when none of those is open). The `BackupRitual` dialog is the
  one exception: on the backup step the parent may advance by closing that dialog,
  so either surface may satisfy the acknowledgement. Keep this simple: gate the
  strip's render on `!sealDialog && !keySheet && !stale`.

No change to `Route`, to the interview handlers beyond the `firstRunDone` line in
`saveInterview`, or to the unseal flow.

### Styles (`src/styles.css`)

Add, additively:

- **`.walk`** — the coach strip: `position: fixed; left/right: 0; bottom: 0;`
  full width, centered inner content constrained to `--maxw`, solid
  `--paper-raised` background, a top `1px solid var(--line)` border, comfortable
  padding, and a `z-index` below the dialog backdrop's `10` (for example `5`) so
  any real dialog still sits above it. Lay out the indicator, the step line, and
  the buttons so they wrap gracefully at 390px with ~44px targets and no
  horizontal scroll. Reserve bottom space so the strip does not hide the page's
  own primary action (for example add bottom padding to `.page` while the walk is
  active, or ensure the strip's height is modest and the page already has
  `padding-bottom: 4rem`).
- **`.walk-step`** — the indicator, quiet (`--ink-soft`, small).
- **`.walk-line`** — the imperative sentence, `--ink`, readable weight.
- **`.walk-actions`** — the Skip and optional "Got it", using the existing `.btn`
  vocabulary (`btn-secondary` for Skip, `btn-primary` for "Got it").
- **`.walk-highlight`** — the control ring: a visible `outline`/`box-shadow` in
  `--accent` (or `--focus`) with offset, high enough contrast to read as
  "look here", applied on top of the control's own styles without changing its
  size or position. Keep `:focus-visible` working (do not override it).
- Under `@media print`, ensure `.walk` is not painted (it carries `no-print`, and
  the existing `body *` visibility rule already hides everything but `.book`/
  `.key-sheet`; add `.walk { display: none; }` inside the print block for
  belt-and-suspenders).
- Respect `@media (prefers-reduced-motion: reduce)`: if the highlight or strip
  uses any transition/animation, disable it there (mirror the existing
  `.boot-skeleton` treatment).

Do not restyle existing surfaces.

### Sample demo (`src/sample.ts`)

Set `firstRunDone: true` on the object returned by `sampleVault()`. The demo
already carries entries, so the walk would not show regardless, but making the
flag true states the intent plainly and guards the "reviewer is never trapped"
criterion directly. No other change to the sample.

### Files to touch (summary)

```
src/walkthrough.ts       NEW: WalkStep, WALK_STEPS, WALK_COPY, firstRunPending (pure)
src/ui/Walkthrough.tsx   NEW: the non-modal coach strip
src/ui/App.tsx           walkActive/walkStep state, step transitions, persist firstRunDone,
                         render the strip and pass highlight props
src/ui/Home.tsx          optional highlightWrite prop -> walk-highlight on "Write a letter"
src/ui/Editor.tsx        optional highlight prop -> walk-highlight on Save / save-status / Seal
src/sample.ts            firstRunDone: true (explicit, self-documenting)
src/styles.css           .walk strip, .walk-highlight ring, print + reduced-motion rules
README.md                module list entries; one "What makes it different" line
tests/unit/walkthrough.test.ts  NEW: firstRunPending truth table + copy sweep
tests/e2e/walkthrough.spec.ts   NEW: full walk, skip, persistence, returning parent, demo, mobile
```

Do NOT touch `src/vault.ts` (the field already exists), `src/template.ts` (the
field already serializes), `src/save/`, `src/seal.ts`, `src/entries.ts`,
`src/interview.ts`, `src/photos.ts`, `src/qr.ts`, `src/mnemonic.ts`,
`index.html`, the CSP, `scripts/`, the Dockerfile, or the staging compose file.
No new dependency.

---

## Example copy (ships verbatim downstream; already copy-swept)

- Write step line: `Write your first letter.`
- Save step line: `Save it to your own file.`
- Backup step line: `Keep this saved copy as the one you reopen.`
- Seal step line: `Seal a letter to lock it.`
- Step indicator: `Step 1 of 4` (and `2`, `3`, `4`)
- Skip button: `Skip` (accessible name `Skip the walkthrough`)
- Backup advance button: `Got it`
- Region label (accessible name for the strip): `Getting started`

Copy sweep for every string above: no `—` or `–`; none of the banned vocabulary
("seamlessly", "effortlessly", "unlock", "elevate", "empower", "leverage",
"robust", "dive in", and kin); positive, direct phrasing; no negative
empty-state phrasing ("You have no...", "No ... yet", "Nothing ... here", "Unable
to", "Something went wrong"). The implementer repeats this sweep over every
string they add, including the README line.

---

## Ordered task list (each with acceptance criteria)

Brackets map to the planner's acceptance criteria: [AC1] 2 to 4 steps on first
open, anchored to real controls, each one short imperative sentence; [AC2]
skippable at every step and permanently dismissed on first save/seal
(`firstRunDone` set); [AC3] a returning parent (content or `firstRunDone`) never
sees it; [AC4] points at controls, never an essay (§4 and §7 met together); [AC5]
the seeded demo does not trap a reviewer; the differentiator is reachable within
a minute.

1. **Walkthrough model.** [AC1, AC3, AC4]
   - `src/walkthrough.ts` exports `WalkStep`, `WALK_STEPS` (the four ordered
     steps), `WALK_COPY` (one short imperative sentence per step), and
     `firstRunPending(vault)` returning true only when `!firstRunDone` and there
     are no entries. Pure, unit-tested.

2. **Coach strip component.** [AC1, AC4]
   - `src/ui/Walkthrough.tsx` renders the current step's single sentence, a step
     indicator, an always-present Skip, and a "Got it" only on the backup step. It
     is non-modal, not a focus trap, `aria-live="polite"` on the step line, and
     carries `no-print`. It never renders or covers the real controls.

3. **Control highlighting.** [AC1, AC4]
   - `Home` highlights "Write a letter" when `highlightWrite` is set; `Editor`
     highlights the Save button, the save confirmation, or the "Seal this letter"
     button per its `highlight` prop. The highlight is a visible ring that does
     not change the control's size, position, or behavior.

4. **App wiring and progression.** [AC1, AC2, AC3]
   - `walkActive` is seeded from `firstRunPending(initialVault)` at mount.
   - Steps advance only on real events: opening the editor (write to save), a
     successful non-seal save (save to backup), acknowledging the backup guidance
     (backup to seal), and a successful seal (walk ends).
   - Skip hides the walk for the session and persists nothing.
   - The strip is hidden while a seal dialog, key sheet, or stale-copy dialog is
     open.

5. **Persist `firstRunDone`.** [AC2, AC3]
   - The first successful save or seal writes `firstRunDone: true` into the saved
     vault on all three save paths (letter, interview, seal), so the saved file
     records first-run as done. Reopening that file starts with `walkActive`
     false.

6. **Demo, docs, mobile, accessibility, copy sweep.** [AC4, AC5, quality §2/§6/§8/§9]
   - `sampleVault()` sets `firstRunDone: true`; with `?demo=1` no walkthrough
     shows and the sealed sample entry is reachable within a minute.
   - The strip is fully usable at 390px (no horizontal scroll, ~44px targets),
     keyboard reachable with visible focus, and does not trap focus or block the
     highlighted control.
   - README module list and the one differentiator line are accurate; commands
     unchanged. Mechanical copy sweep over every new string passes.

---

## Test plan (automated tests prove each criterion)

**Unit (Vitest) — `tests/unit/walkthrough.test.ts`:**

- **`firstRunPending` truth table:** true for `emptyVault()`; false when
  `firstRunDone` is true (even with no entries); false when there is at least one
  entry (even with `firstRunDone` false); false for a vault that has both. [AC3]
- **Step model:** `WALK_STEPS` is exactly `["write","save","backup","seal"]` and
  `WALK_COPY` has a non-empty one-sentence string for each. [AC1]
- **Copy sweep (mechanical, automated):** flatten every value in `WALK_COPY` plus
  the fixed strings ("Skip", "Got it", "Getting started", and the "Step N of 4"
  template) and assert none contains `"—"` or `"–"`, none matches the
  banned-vocabulary list (case-insensitive), and none matches the negative
  empty-state patterns. This makes the sweep a standing test, not a one-time
  check. [AC4, quality §8]

**End-to-end (Playwright, real browser, loaded from `file://`, all engines) —
`tests/e2e/walkthrough.spec.ts`:** (use `MOCK_FSA` for the Chromium save path and
`writeSeededArtifact`/`extractVaultJson` from `tests/e2e/helpers.ts`)

- **First open shows the guided path anchored to real controls.** Open the built
  artifact (empty starter vault). Assert the coach strip is visible showing step 1
  of 4 and the "Write your first letter." line, that the "Write a letter" button
  carries the highlight class, and that a Skip control is present. [AC1]
- **The walk advances through the real core loop.** With `MOCK_FSA` installed,
  click "Write a letter" and assert the strip advances to the save step and the
  Save button is highlighted. Type a letter, press Save, and assert (a) the
  "Saved" confirmation appears, (b) the strip advances to the backup step, and
  (c) the saved vault JSON (`extractVaultJson(window.__tylDisk)`) has
  `firstRunDone: true`. Press the backup "Got it" and assert the strip advances to
  the seal step with the "Seal this letter" button highlighted. [AC1, AC2]
- **Skippable at every step.** In a fresh open, click Skip on step 1 and assert
  the strip is gone. In a second run, advance to the save step, click Skip, and
  assert the strip is gone. (Skip is reachable and hides the walk at each step.)
  [AC2]
- **Permanent dismissal after first save.** After the save in the progression
  test, take the saved HTML from `window.__tylDisk`, write it to a file with
  `writeSeededArtifact` (or reuse the on-disk bytes), reopen it, and assert the
  coach strip does not appear (the vault now has an entry and `firstRunDone`).
  [AC2, AC3]
- **A returning parent never sees it.** Seed an artifact whose vault has one
  letter and `firstRunDone: false`; assert no strip (content suppresses it). Seed
  another with no entries and `firstRunDone: true`; assert no strip (the flag
  suppresses it). [AC3]
- **The seeded demo is not trapped.** Open the artifact with `?demo=1`; assert no
  coach strip appears and that a sealed entry (the demo's locked placeholder) is
  visible and openable, so the differentiator is reachable immediately. [AC5]
- **Not a focus trap; control stays usable.** On first open, assert the
  highlighted "Write a letter" button is clickable and that keyboard focus can
  move to it and to Skip (Tab reaches both; the strip does not trap focus). [AC4,
  quality §6]
- **Mobile 390px.** At a 390px viewport on first open, assert no horizontal
  scroll (`scrollWidth <= clientWidth`), the coach strip is visible, and Skip is a
  tappable ~44px target. Assert the page's primary "Write a letter" action is not
  covered by the strip (it is reachable and clickable). [quality §2]

**Copy sweep (mechanical, part of done):** grep every user-visible string added in
this EPIC (`WALK_COPY`, the strip's fixed labels, and the README line) for the
characters `—` and `–`, the banned vocabulary, and negative empty-state phrasing.
Every hit in a shipped string is a defect to fix in the same run. The unit test
above locks the walkthrough strings permanently. [AC4, quality §8]

---

## Risks and notes for the implementer

- **The walk must reach a real save (top value).** The point of this EPIC is to
  carry a nervous parent through the two fear points. Do not build a walk that
  only labels the write step and stops. The save step must lead to a real Save
  press and the seal step to a real Seal, so the parent's first contact with both
  scary actions happens inside the guide. This is the differentiator line.
- **Never block or cover the control you point at.** The strip is non-modal, is
  not a focus trap, and must not sit on top of the button it highlights. On a
  phone the primary action stays reachable with the strip pinned at the bottom.
  Reserve space so the strip does not hide the action. A guide the parent can get
  stuck in is worse than no guide.
- **`walkActive` is session state, seeded once.** Seed it from
  `firstRunPending(initialVault)` at mount and do not recompute it after saves. If
  you gate the strip directly on `firstRunPending(vault)` instead, the parent is
  thrown out of the walk the instant their first save sets `firstRunDone`, before
  they ever reach the backup and seal steps. Gate the strip on the session flag;
  gate whether the session starts on the pure predicate.
- **Persist `firstRunDone` on the save, not on Skip.** The flag is written into
  the vault the parent actually saves, on all three save paths. Skip writes
  nothing: the app never saves without a Save press, and inventing a background
  write to remember a dismissal would break the trust model (no surprise writes).
  A parent who skips an untouched starter file may see the walk again next open;
  that is correct, because they have not had their first success.
- **Do not touch the model or serialization.** `firstRunDone` already exists in
  `Vault`, is defaulted in `emptyVault()` and `parseVault`, and is already in
  `orderVault`'s known-key order. This EPIC only consumes it. No schema bump, no
  migration.
- **Reuse the existing save, seal, and backup surfaces.** Route everything through
  the current `SaveController`, `applyResult`, `SealDialog`, `KeySheet`, and
  `BackupRitual`. The felt safety of the first save and seal comes from them being
  the exact same flows a returning parent uses. The walk points; it does not fork
  a parallel path.
- **No re-trigger, no wizard, no video.** These are Non-Goals. Do not add a way to
  replay the walk, do not turn the strip into a multi-page takeover, and add no
  media. If a stakeholder wants a help/replay affordance later, request it as a
  follow-up rather than building it here.
- **Print and reduced motion.** The strip must never appear in the printed book or
  key sheet (carry `no-print` and add a print-block `display: none`), and any
  motion must be disabled under `prefers-reduced-motion`, matching the existing
  skeleton treatment.

---

## Notes on this spec's provenance

Built by expanding the planner's authoritative scope for EPIC 6 against the
shipped EPIC 1 through EPIC 5 codebase: `src/vault.ts` (which already declares
`firstRunDone` and defaults it in `emptyVault`/`parseVault`), `src/template.ts`
(which already serializes it via `orderVault`), the App controller in
`src/ui/App.tsx` with `runSave`/`saveInterview`/`runSeal`/`applyResult`, the
archive in `src/ui/Home.tsx`, the writing room in `src/ui/Editor.tsx` with its
`SaveControls` and seal zone, the download-path `src/ui/BackupRitual.tsx`, and the
seal surfaces `src/ui/SealDialog.tsx`/`src/ui/KeySheet.tsx`. The existing test
fixtures already set `firstRunDone: true` to suppress a walkthrough that had not
been built; this EPIC is what those fixtures were anticipating.

No planning gap required resolving inside this EPIC. `firstRunDone` was left in
the model by an earlier EPIC precisely for this consumer, and the seeded demo
already carries content, so the "reviewer not trapped" criterion is met
structurally (this spec additionally sets the flag on the sample to make the
intent explicit). No DEPLOY / STAGING DEPLOY CONTRACT block was present in this
task's context, and this EPIC does not change the deploy.
