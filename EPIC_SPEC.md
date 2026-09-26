# EPIC SPEC — The yearly interview ritual

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This EPIC adds the ritual engine. Once a year the parent sits with their child
and answers a short set of age-aware prompts. A three-year-old's interview reads
differently from a twelve-year-old's, because the prompt set is chosen from the
child's current age. The answers are recorded verbatim, saved as an interview
entry that lives next to that year's letters, and shown in both the archive and
the printable book. A calm, dismissible nudge appears around the child's
birthday so the ritual is easy to keep for two decades, and it never nags.

This EPIC builds on the shipped spine (EPIC 1), the writing room (EPIC 2),
sealed letters (EPIC 3), and the printable book (EPIC 4): the single
self-contained `.html` artifact, the byte-stable self-carrying save on both
browser paths, the `Vault`/`Entry` model with forward-only migration in
`src/vault.ts`, the archive in `src/ui/Home.tsx`, the seal/unseal flow with
`isSealed`/`unsealedEntries` in `src/entries.ts`, and the live-derived book in
`src/ui/BookView.tsx`. Do not rebuild or re-architect any of that. The interview
is a new entry type that flows through the existing save, seal, archive, and
book machinery.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The felt safety and clarity of every step, above all
saving the file and sealing a letter, so a sleep-deprived non-technical parent
never fears loss across an eighteen-year commitment.

What it demands of THIS EPIC's work:

1. **A sealed interview must leak nothing.** An interview holds a child's own
   words. When the parent seals it, the answers and the child's age must be
   encrypted and removed from the file exactly like a sealed letter's body. A
   sealed interview that leaves any answer text or age readable in the saved
   JSON is a trust failure, not a cosmetic bug. This is the single riskiest line
   in the EPIC (see Technical design, `foldSealed`).
2. **Recording feels as safe as writing a letter.** The interview saves through
   the same save controller, the same stale-copy protection, and the same
   truthful "Saved" readout as a letter. Nothing about the ritual introduces a
   new way to lose work or a new fear.
3. **The nudge is a gentle tap, never a nag.** One calm, dismissible line around
   the birthday. It disappears the moment this year's interview is recorded, and
   it never shows outside the birthday window. A parent must never feel chased by
   their own keepsake.

When any choice here is open, choose the option that keeps the child's words
safe and the ritual calm.

---

## Scope

### In scope

- **A finite, age-aware prompt pack (`src/interview.ts`, new).** A fixed set of
  age bands, each with its own written-once prompts, covering the child's first
  year through the teens. The pack is plain data in the code. There is no runtime
  generation of prompts.
- **Age derivation from `child.birthDate`.** A pure `ageInYears(birthDate, now)`
  helper returns the child's whole-year age. Starting a new interview selects the
  prompt band for that age.
- **A birth-date capture step, shown only when it is missing.** No screen in the
  shipped app sets `child.birthDate` today. The interview cannot derive an age
  without it, and no other EPIC owns this. So the interview flow captures it: when
  `child.birthDate` is absent or unparseable, the first step of the interview asks
  for the child's birth date (required) and name (optional), and both are saved
  into `vault.child` together with the interview entry on the same save. When a
  birth date already exists, this step is skipped. This is a focused precondition
  of the ritual, not a general settings screen (see Non-Goals).
- **An interview flow (`src/ui/InterviewView.tsx`, new).** A `"interview"` route
  that presents the selected band's prompts, each with a text area for the child's
  answer. The parent records answers verbatim, then saves. The entry stores the
  child's age at the time and every prompt with its verbatim answer.
- **Interview entries in the model.** `Entry.type` gains `"interview"`.
  Interview entries carry `childAgeYears` and an `answers` array
  (`{promptId, promptText, answerText}`) when unsealed. Forward-only schema bump
  (v3 to v4).
- **Interviews in the archive.** `src/ui/Home.tsx` lists interview entries
  alongside letters, visibly labelled as interviews, opening back into the
  interview flow (in edit mode) so reopening restores every recorded answer.
- **Interviews in the book.** `src/ui/BookView.tsx` typesets each unsealed
  interview: its title, its date, and each prompt with its answer, alongside the
  letters. This completes the interview-rendering boundary EPIC 4 left open.
- **Sealing an interview.** An interview can be sealed like any letter, through
  the existing seal dialog and key-sheet flow. Sealing encrypts the answers and
  age, strips them from the file, and leaves only the `{iv, ciphertext, keyHint,
  sealedAt}` blob. Unsealing restores the answers on screen only.
- **A birthday-cadence nudge.** A pure `birthdayNudge(vault, now)` helper decides
  whether to show one calm, dismissible line on the archive around the child's
  birthday. It shows only inside a fixed window around the birthday, only when a
  birth date is known, and only when this year's interview has not been recorded
  yet. Its action opens the interview. Dismissing it hides it for the session.
- **Designed states, mobile-first, accessible, swept copy.** The interview flow,
  the capture step, the nudge, and the interview rendering in the archive and book
  are all designed surfaces, fully usable at 390px, keyboard reachable, and their
  copy passes the sweep.
- **A sample interview in the live demo (`src/sample.ts`).** So staging shows the
  new ritual within a minute without typing (QUALITY BAR §4), add one inert,
  unsealed sample interview entry to `sampleVault()`, consistent with the existing
  sample child.

### Out of scope (Non-Goals — do not build)

- **An LLM generating prompts at runtime.** The finite pack is the whole MVP.
  Prompt-variety via a BYOK model is a future garnish and explicitly out of scope
  here. Add no LLM client, no network call, no BYOK settings.
- **Audio (or video) recording of answers.** Answers are typed text only. Do not
  add a microphone, recorder, or media capture.
- **Scheduled email reminders.** The nudge is an in-app line driven by the clock
  and the vault. Do not add the mailer, any scheduled job, or any notification
  that leaves the file.
- **A general Settings screen.** The birth-date capture is a single focused step
  gating the interview. Do not build a settings hub, backup-reminder settings, a
  child-profile editor with avatars, multiple children, or any child field beyond
  the existing `{name, birthDate}`.
- **Editing the prompt pack from the UI.** The pack is fixed code. No prompt
  editor, no custom prompts, no reordering UI, no "add your own question" for MVP.
- **Any network request from the artifact, ever.** The interview renders and
  saves entirely offline, exactly like every other part of the file. Adding the
  pack or the nudge must not add a single fetch, CDN load, or `eval`.
- **Changing the save mechanism, the seal/crypto primitives, the CSP,
  `index.html`, stale-copy detection, the distribution site, the Dockerfile, or
  the staging deploy.** The interview reuses the shipped save and seal flows and
  changes none of these. The only model change is the additive v3-to-v4
  migration and the additive `SealedPayload` fields described below.
- **A first-run walkthrough.** The guided path is EPIC 6. The nudge is not a
  walkthrough and must not grow into one.

---

## Quality bar as it applies here

The quality bar is binding spec. The clauses that bite in this EPIC:

- **Perceived speed (§1).** The interview view, the prompt selection, and the
  nudge all render synchronously from in-memory state. Opening the interview is
  instant. Saving reuses the existing `SaveControls` feedback (pressed state,
  "Saving", "Saved") so the parent sees feedback within 100ms. There are no
  queries and no network on any path.
- **Mobile-first (§2).** The interview flow (capture step and prompts), the nudge
  banner, and the interview rows in the archive and pages in the book are fully
  usable at 390px: no horizontal scroll, ~44px touch targets, readable text,
  answer text areas comfortable to type in on a phone.
- **Designed states (§3).** The interview has designed surfaces, not accidents:
  the capture step explains why the birth date is needed in one plain line; the
  prompt form has a clear primary "Save this interview" action; an interview with
  every answer left blank still saves (recording nothing this year is allowed) and
  the archive/book render it without breaking. There is no network error path to
  invent; the only error surface is the shared save-error state, reused as-is.
- **First-run (§4) — boundary with EPIC 6.** No walkthrough here. The interview
  entry point and the nudge must teach by looking: a clearly labelled control and
  one plain nudge line. On staging the sample interview makes the ritual visible
  in the archive and the book within a minute without typing.
- **Security hygiene (§5).** The artifact has no server, so route-authorization
  and rate-limiting clauses are not applicable and must not be invented.
  Applicable here: make zero network requests; render every answer and prompt as
  text (Preact escapes it); never log answer text, the child's name, or the birth
  date; validate the new model fields at the parse boundary (`validateEntry`);
  and, above all, ensure a sealed interview carries no plaintext answers or age
  (§ differentiator point 1).
- **Accessibility (§6).** The interview view is a `<main>` landmark with one
  `<h1>`. Each prompt's answer field is a labelled control (the prompt text is the
  label). The birth-date and name inputs are labelled. The nudge is a region with
  its own heading and a real, keyboard-reachable dismiss button with an
  `aria-label`. In the book, each interview is an `<article>` with an `<h2>`
  title; prompts and answers use a semantic structure (a definition list, or a
  question heading followed by the answer). Visible focus on every control.
- **Radically simple interface (§7).** One obvious primary action per surface:
  in the interview, "Save this interview" is primary and "Back to letters" is the
  subordinate return; the seal action is visibly subordinate (mirror the editor's
  `seal-zone`). In the capture step, "Continue" is the single primary action. On
  the archive the primary action stays "Write a letter"; "Record an interview" and
  "Open the book" are subordinate. The nudge is a single calm line with one action
  and a quiet dismiss, never a modal that blocks the archive. Cut words: prompts
  are one short question each; the capture line is one sentence.
- **Copy (§8).** Every new visible string, and every prompt in the pack, reads
  like a person wrote it: no em-dashes or dash-asides, positive and direct
  phrasing, no banned LLM vocabulary, no negative empty-state phrasing. The pack
  ships verbatim, so it is swept here in this spec and again by the implementer,
  and guarded by an automated test (see Test plan). This is AC4.
- **README (§9).** Add `src/interview.ts` and `src/ui/InterviewView.tsx` to the
  "Where the code lives" module list, and add one plain line to "What makes it
  different" about the yearly age-aware interview. Keep the run/test commands
  accurate. No pipeline jargon.

---

## Technical design

### Data model (`src/vault.ts`)

Forward-only, additive. A v3 vault has no interview entries, so the migration
only raises the version; existing entries are untouched.

- Bump `SCHEMA_VERSION` from `3` to `4`.
- Add the answer type:
  ```ts
  export type InterviewAnswer = {
    promptId: string;   // stable id of the prompt as asked
    promptText: string; // the exact question text asked, stored verbatim
    answerText: string; // the child's answer, stored verbatim (may be "")
  };
  ```
  `promptText` is stored on the entry (not looked up from the pack at render
  time) so an interview recorded in 2030 always shows the 2030 wording, even if
  the pack is edited in a later version. This is the 20-year-artifact rule: the
  entry is self-describing.
- Extend `Entry`:
  ```ts
  export type Entry = {
    id: string;
    type: "letter" | "interview";
    createdAt: string;
    occasion: string;
    title: string;
    body: string;              // "" on an interview and on a sealed entry
    photos: Photo[];           // [] on an interview and on a sealed entry
    childAgeYears?: number;    // interview-only, present iff unsealed
    answers?: InterviewAnswer[]; // interview-only, present iff unsealed
    sealed?: Sealed;
    [extra: string]: unknown;
  };
  ```
  Interview entries keep `occasion`, `title`, `body`, and `photos` present (with
  `body: ""`, `photos: []`) so they satisfy the existing `validateEntry` shape
  and the existing archive/book renderers never see an undefined field.
- Add `migrateV2toV3`'s sibling `migrateV3toV4(data)`: return
  `{ ...data, schemaVersion: 4 }`. Wire it into `migrate()` with
  `if (data.schemaVersion === 3) data = migrateV3toV4(data);`.
- Extend `validateEntry`:
  - Accept `value.type === "letter" || value.type === "interview"` (reject any
    other type with the existing "An entry has an unknown type." message).
  - When `value.answers !== undefined`: it must be an array; each item must be an
    object with string `promptId`, `promptText`, and `answerText`. Throw a
    `VaultParseError` with a plain message ("An interview answer is not
    readable.") otherwise. Preserve the entry's own object so unknown fields
    survive (same pattern as photos/sealed).
  - When `value.childAgeYears !== undefined`: it must be a finite number
    (reuse `isFiniteNumber`), else throw ("An interview age is not readable.").
  - Do not require `answers`/`childAgeYears` (a sealed interview has neither).
- `emptyVault()` already uses `SCHEMA_VERSION`, so it becomes v4 automatically.

### Serialization order (`src/template.ts`)

`ordered()` already appends unknown keys in sorted order, so new fields are never
dropped. For deterministic, intentional ordering, add the two fields to the
`orderEntry` known-order list, placed before `sealed`:
```
["id", "type", "createdAt", "occasion", "title", "body", "photos",
 "childAgeYears", "answers", "sealed"]
```
No other change to `template.ts`.

### Prompt pack, age, and nudge (`src/interview.ts`, new)

All pure and unit-tested. No Preact import.

```ts
export type Prompt = { id: string; text: string };
export type PromptBand = { id: string; minAge: number; maxAge: number; prompts: Prompt[] };
```

- **`AGE_BANDS: PromptBand[]`** — the finite pack, covering the first year
  through the teens (see "The prompt pack" below). Bands are contiguous and
  non-overlapping.
- **`ageInYears(birthDateIso: string, now: Date): number | null`** — whole years
  from birth date to `now` (calendar-correct: not yet had this year's birthday
  means one year younger). Returns `null` for an unparseable or future date so
  callers can guard. Never negative.
- **`promptsForAge(ageYears: number): PromptBand`** — the band whose
  `[minAge, maxAge]` contains `ageYears`. Clamp below the youngest band to the
  youngest, and at or above the oldest band's `minAge` to the oldest, so every
  non-negative age resolves to a non-empty band.
- **`interviewTitle(ageYears: number): string`** — the entry's derived title.
  Age `0` returns `"Interview in the first year"`; age `n >= 1` returns
  `` `Interview at age ${n}` ``. Swept, plain.
- **`birthdayNudge(vault: Vault, now: Date): { age: number } | null`** — returns
  `{ age }` when the nudge should show, else `null`. It shows only when:
  - `vault.child?.birthDate` parses to a real date, AND
  - `now` is within `NUDGE_WINDOW_DAYS` (14) before or after the birthday
    anniversary in `now`'s vicinity, AND
  - no unsealed interview entry already has `childAgeYears === age`, where `age`
    is the age the child reaches at that anniversary
    (`anniversaryYear - birthYear`).
  A birthday of Feb 29 is matched on Feb 28 in non-leap years. The helper is pure
  and takes `now` explicitly so it is fully unit-testable. (A sealed interview has
  no readable age, so it does not count as "recorded"; this is an accepted edge,
  and the nudge is dismissible.)

Keep every string in this module swept: it is user-visible copy shipped verbatim.

### The prompt pack (ships verbatim — already copy-swept)

Seven contiguous bands. Prompt `id`s are stable (`<bandId>-<n>`). Each prompt is
one short question. For the first-year band the parent answers on the child's
behalf; from there the child answers in their own words. All strings below
contain no `—`/`–`, no banned vocabulary, positive phrasing.

- **Band `first-year` (minAge 0, maxAge 0):**
  1. `first-year-1` — "What makes you laugh right now?"
  2. `first-year-2` — "What are you learning to do this month?"
  3. `first-year-3` — "How do you like to be held and comforted?"
  4. `first-year-4` — "What sound or song calms you down?"
  5. `first-year-5` — "What do I want to remember about you at this age?"

- **Band `toddler` (minAge 1, maxAge 2):**
  1. `toddler-1` — "What is your favorite thing to play with?"
  2. `toddler-2` — "What word do you say all the time?"
  3. `toddler-3` — "What food do you ask for again and again?"
  4. `toddler-4` — "Who do you run to first in the morning?"
  5. `toddler-5` — "What makes you laugh the hardest?"

- **Band `little-kid` (minAge 3, maxAge 4):**
  1. `little-kid-1` — "What do you want to be when you grow up?"
  2. `little-kid-2` — "What is your favorite game right now?"
  3. `little-kid-3` — "Who is your best friend, and what do you do together?"
  4. `little-kid-4` — "What is the best food in the whole world?"
  5. `little-kid-5` — "What makes you feel brave?"

- **Band `early-school` (minAge 5, maxAge 7):**
  1. `early-school-1` — "What did you learn this year that you are proud of?"
  2. `early-school-2` — "What do you love about your friends?"
  3. `early-school-3` — "What is the funniest thing that happened this year?"
  4. `early-school-4` — "If you could go anywhere, where would you go?"
  5. `early-school-5` — "What are you a little scared of, and what helps?"

- **Band `middle-childhood` (minAge 8, maxAge 10):**
  1. `middle-childhood-1` — "What are you really good at right now?"
  2. `middle-childhood-2` — "What is something you changed your mind about this year?"
  3. `middle-childhood-3` — "What do you and your friends laugh about?"
  4. `middle-childhood-4` — "What is a dream you have for next year?"
  5. `middle-childhood-5` — "When were you the happiest this year?"

- **Band `tween` (minAge 11, maxAge 13):**
  1. `tween-1` — "What matters most to you right now?"
  2. `tween-2` — "What is something grown-ups get wrong about your age?"
  3. `tween-3` — "What are you most proud of this year?"
  4. `tween-4` — "Who do you look up to, and why?"
  5. `tween-5` — "What do you want more time for?"

- **Band `teen` (minAge 14, maxAge 200):** covers the teens and clamps every
  older age.
  1. `teen-1` — "What are you figuring out about who you are?"
  2. `teen-2` — "What do you want your future self to remember about this year?"
  3. `teen-3` — "What is a belief you hold strongly right now?"
  4. `teen-4` — "What are you excited about after this year?"
  5. `teen-5` — "What do you wish I understood better?"

The dash characters used above in this document are Markdown list punctuation and
`—` separators for the reviewer's convenience. The strings that ship are only the
quoted questions; none of them contains a dash character. The implementer stores
exactly the quoted text.

### Fold helpers (`src/entries.ts`)

Add a `foldInterview`, mirroring `foldDraft`, and harden `foldSealed`.

- **`InterviewDraft` type:**
  ```ts
  export type InterviewDraft = {
    title: string;
    childAgeYears: number;
    answers: InterviewAnswer[];
  };
  ```
- **`foldInterview(vault, draft, editingId, newId, createdAt)`** — pure, same
  contract as `foldDraft`. Editing maps in place by id, preserving `createdAt`
  and every other entry; a new interview is prepended. The entry is:
  ```ts
  {
    id, type: "interview", createdAt,
    occasion: "", title: draft.title, body: "", photos: [],
    childAgeYears: draft.childAgeYears, answers: draft.answers,
  }
  ```
  When editing, keep the existing `createdAt` and `childAgeYears` (do not
  recompute the age; the recorded age is a fact of that year), and replace
  `title`/`answers` from the draft.
- **`foldSealed` (harden — trust-critical).** Today it spreads `...e` then blanks
  the letter fields, which would leave an interview's `answers` and
  `childAgeYears` in the sealed entry as readable plaintext. Fix it so no
  plaintext survives, while still preserving `id`, `createdAt`, `type`, and any
  unknown future fields:
  ```ts
  const { answers, childAgeYears, ...rest } = e;
  return {
    ...rest,
    occasion: "", title: "", body: "", photos: [],
    sealed,
  };
  ```
  Apply the same destructuring drop in both the edit-in-place branch and the
  new-entry branch. For a letter (`e` has no `answers`/`childAgeYears`) this is a
  no-op, so the existing `foldSealed` tests still pass unchanged.

### Seal payload (`src/seal.ts`)

Additive. `seal()` and `unsealWithWords()` only JSON-serialize/parse the payload,
so optional fields flow through with no crypto change.

```ts
export type SealedPayload = {
  occasion: string;
  title: string;
  body: string;
  photos: Photo[];
  childAgeYears?: number;      // present when the sealed entry was an interview
  answers?: InterviewAnswer[]; // present when the sealed entry was an interview
};
```

No other change in `seal.ts`. Sealing an interview builds a payload with
`occasion: ""`, `body: ""`, `photos: []`, the interview `title`, and the
`childAgeYears`/`answers`. Unsealing returns them for display only.

### App controller (`src/ui/App.tsx`)

Extend the existing controller; keep its save, seal, unseal, and stale
orchestration intact and reuse it.

- Add `"interview"` to the `Route` union.
- Add interview draft state (kept separate from the letter draft so the two flows
  never interfere): the active interview's `title`, `childAgeYears`, the working
  `answers` (an array the view edits by `promptId`), an `interviewEditingId`, and
  the capture-step fields `childName` and `birthDate` plus a `needsBirthDate`
  flag derived from `vault.child?.birthDate`.
- **`openInterview()`** — start a new interview. If `vault.child?.birthDate` is
  missing/unparseable, enter the capture step (`needsBirthDate = true`).
  Otherwise compute `age = ageInYears(birthDate, now)`, seed `answers` from
  `promptsForAge(age).prompts` (each `{promptId, promptText, answerText: ""}`),
  set `title = interviewTitle(age)`, `childAgeYears = age`, `interviewEditingId =
  null`, and `setRoute("interview")`.
- **Capture-step continue** — validate the entered birth date (a real, non-future
  date). On success, hold `childName`/`birthDate` in state, compute the age from
  the entered date, seed the prompts as above, clear `needsBirthDate`, and show
  the prompts. The date is written to `vault.child` only on save.
- **`openInterviewEntry(id)`** — reached from the archive for an unsealed
  interview. Load `title`, `childAgeYears`, and `answers` from the entry into
  state (verbatim, so reopening restores them), set `interviewEditingId = id`,
  and `setRoute("interview")`.
- **`openEntry(id)`** — branch: sealed → unseal (unchanged); unsealed interview →
  `openInterviewEntry(id)`; unsealed letter → editor (unchanged).
- **`saveInterview()`** — build the next vault and save through the existing
  controller so stale-copy detection, the download ritual, and the "Saved"
  readout all apply:
  ```ts
  const childNext = needsBirthDate || childChanged
    ? { name: childName.trim(), birthDate }   // birthDate from the capture step
    : vault.child;
  const base = { ...vault, child: childNext };
  const { next, entryId } = foldInterview(base, draft, interviewEditingId, randomId(), now.toISOString());
  const result = await controller.save(next);
  applyResult(result, next, entryId, null);
  ```
  Reuse `applyResult` (the `seal: null` branch) so a successful save shows
  "Saved", a stale disk prompts the existing dialog, and a download save shows the
  backup ritual. `applyResult` already sets `editingId`; also set
  `interviewEditingId = entryId` on success so a follow-up save edits in place.
- **Sealing an interview** — reuse the existing seal dialog and key-sheet flow.
  Add a seal path that builds the interview payload (`{occasion: "", title,
  body: "", photos: [], childAgeYears, answers}`), calls `seal(...)`, folds with
  `foldSealed` on the interview's vault (including any captured child), saves, and
  routes through `applyResult` with the seal context, exactly like `runSeal`.
  Factor the shared seal-then-save body so letters and interviews share one code
  path with different payloads; do not duplicate the trust-critical logic. The
  stale-replace path (`replaceDiskCopy`) must carry the correct editing id for an
  interview seal too.
- **Nudge** — compute `const nudge = birthdayNudge(vault, now)` and pass it (plus
  an in-memory `nudgeDismissed` flag and `onStartInterview`/`onDismissNudge`) to
  `Home`. Dismiss sets `nudgeDismissed = true` for the session. Recording this
  year's interview updates `vault`, after which `birthdayNudge` returns `null`
  structurally, so the nudge does not reappear.
- Render `InterviewView` when `route === "interview"`, and pass
  `onOpenInterview`/`onOpenEntry`/the nudge props to `Home`.

### Interview view (`src/ui/InterviewView.tsx`, new)

A component with two surfaces controlled by props: the capture step (only when the
birth date is unknown) and the prompt form.

- **Capture step** — one plain heading, one line explaining that the birth date
  chooses the right questions, a labelled `<input type="date">` for the birth date
  (required), a labelled optional name input, a primary "Continue" button, and a
  subordinate "Back to letters". No date entered yet disables "Continue".
- **Prompt form** — a `<main>` with an `<h1>` (the derived title, e.g.
  "Interview at age 3"), then for each answer in state a labelled block: the
  prompt text as the field label and a `<textarea>` bound to that prompt's
  `answerText`. Below the prompts: a primary "Save this interview" (reuse
  `SaveControls` for the phase/hint/"Saved" feedback and the "Back to letters"
  return) and a subordinate seal zone mirroring the editor's "Seal this letter"
  (labelled "Seal this interview", disabled when sealing is unavailable or a save
  is in flight, with the same `sealingReady` note).
- The view is a pure function of its props. It never writes the vault directly;
  it calls the App handlers.

Answers are stored exactly as typed. Do not trim, reflow, or transform answer
text (verbatim is an acceptance criterion). An empty answer is allowed and saves
as `""`.

### Archive (`src/ui/Home.tsx`)

- Add an `onOpenInterview: () => void` prop and a `nudge` surface.
- **Interview entry point.** In the non-empty archive actions, add a subordinate
  "Record an interview" button (`btn btn-secondary btn-block`) next to "Open the
  book". The primary "Write a letter" stays the one obvious action. The empty
  archive branch is unchanged (there is no birth date and nothing to interview
  against yet).
- **Interview rows.** In the entries list, an unsealed interview entry renders as
  a row showing its title and a subtitle line that marks it an interview (for
  example the derived title already reads "Interview at age 3"; add a short
  `entry-occasion`-style label such as "Yearly interview" so it is unmistakable),
  plus its date. It has no thumbnail. Clicking it calls `onOpenEntry(id)`, which
  routes to the interview flow in edit mode. Sealed interview entries render
  through the existing sealed placeholder unchanged (lock, keyHint, date).
- **The nudge.** When `nudge` is present and not dismissed, render one calm line
  above the entries: a short heading, one plain sentence, a primary-styled
  "Record this year's interview" button (calls `onOpenInterview`), and a quiet
  "Not now" dismiss (calls `onDismissNudge`). It is an inline region, never a
  modal, and never blocks the archive. Keep the integrity readout and existing
  ordering intact.

### Unseal view (`src/ui/UnsealView.tsx`)

When the revealed payload carries `answers` (a sealed interview), render them:
the title, the date, and each `promptText` with its `answerText`, using the same
read-only, in-memory-only pattern as a revealed letter. A revealed letter (no
`answers`) renders exactly as today.

### Book (`src/ui/BookView.tsx`)

`bookEntries` already returns unsealed interviews (it filters on sealed only), so
they appear in book order with no selector change. In the entries map, branch on
`entry.type === "interview"`: render an `<article class="book-entry
book-interview">` with the `<h2>` title, the `Written <date>` line, and each
answer as a question (`promptText`) followed by its answer (`answerText`) in a
semantic structure. A letter renders exactly as today. Do not render photos or
body for an interview (it has none).

### Sample demo (`src/sample.ts`)

Add one inert, unsealed interview entry to `sampleVault()` so the staging demo
shows the ritual in the archive and the book. Use the existing sample child
(`Mira`, `birthDate: "2026-01-08"`). Give it a fixed `createdAt`, a
`childAgeYears` consistent with a plausible interview, a title from
`interviewTitle`, and two or three short, swept answers keyed to real prompt ids
from the matching band. Keep it tiny and clearly a sample. If any existing test
asserts the exact demo entry count, update it in the same run.

### Styles and print CSS (`src/styles.css`)

Add screen styles for: the interview capture step and prompt form (reuse the
`.field`/`.input`/`.textarea`/`.btn` vocabulary already in the file), the nudge
banner (a calm inset region, clearly subordinate), the archive interview label,
and the book interview answers (question emphasized, answer in the reading
measure). Extend the existing `@media print` block only additively: the book
interview answers must print cleanly with the same break discipline as letters
(keep a question with its answer via `break-after: avoid` on the question;
`orphans`/`widows` on answer text). The nudge, the interview toolbar, and all app
chrome carry `no-print` / are already hidden by the existing `body *` print rule;
verify the book still prints only `.book`. Do not restyle existing surfaces.

### Files to touch (summary)

```
src/interview.ts        NEW: prompt pack, ageInYears, promptsForAge, interviewTitle, birthdayNudge
src/ui/InterviewView.tsx NEW: capture step + prompt form + seal zone
src/vault.ts            SCHEMA_VERSION 3->4, migrateV3toV4, InterviewAnswer, Entry.type/childAgeYears/answers, validateEntry
src/entries.ts          add foldInterview + InterviewDraft; harden foldSealed to strip interview plaintext
src/seal.ts             SealedPayload gains optional childAgeYears/answers
src/template.ts         add childAgeYears/answers to orderEntry known order
src/ui/App.tsx          "interview" route, interview state + handlers, seal path, nudge, openEntry branch
src/ui/Home.tsx         "Record an interview" action, interview rows, birthday nudge banner
src/ui/UnsealView.tsx   render revealed interview answers
src/ui/BookView.tsx     render interview entries alongside letters
src/sample.ts           one inert sample interview for the demo
src/styles.css          interview view, nudge, archive label, book answers + additive print rules
README.md               module list entries; one "What makes it different" line
tests/unit/...          interview.ts (age/bands/title/nudge/pack-sweep), entries (foldInterview, foldSealed strip), vault (v4 migrate/parse/round-trip), seal (interview round-trip)
tests/e2e/interview.spec.ts  NEW: age-appropriate prompts, verbatim save+reopen, birth-date capture, archive+book render, seal (no leak) + unseal, nudge show/dismiss/opens, mobile
```

Do NOT touch `src/save/`, `src/photos.ts`, `src/mnemonic.ts`, `src/qr.ts`,
`index.html`, the CSP, `scripts/`, the Dockerfile, or the staging compose file.
No new dependency.

---

## Example copy (ships verbatim downstream; already copy-swept)

- Archive interview action: `Record an interview`
- Archive interview row label: `Yearly interview`
- Interview title, first year: `Interview in the first year`
- Interview title, age n: `Interview at age <n>` (for example `Interview at age 3`)
- Interview save button: `Save this interview`
- Interview seal button: `Seal this interview`
- Interview back button: `Back to letters`
- Capture heading: `First, your child's birth date.`
- Capture line: `The birth date picks the right questions for your child's age.`
- Capture name label: `Child's name`
- Capture birth-date label: `Birth date`
- Capture continue button: `Continue`
- Nudge heading: `Time for this year's interview.`
- Nudge line: `A few questions with your child, kept next to this year's letters.`
- Nudge action: `Record this year's interview`
- Nudge dismiss: `Not now`
- The prompt pack: exactly the quoted questions in "The prompt pack" above.

Copy sweep for every string above and every prompt: no `—` or `–`; none of the
banned vocabulary ("seamlessly", "effortlessly", "unlock", "elevate", "empower",
"leverage", "robust", "dive in", and kin); positive, direct phrasing; no negative
empty-state phrasing ("You have no...", "No ... yet", "Nothing ... here", "Unable
to", "Something went wrong"). The implementer repeats this sweep over every string
they add, including any README copy and the sample interview answers.

---

## Ordered task list (each with acceptance criteria)

Brackets map to the planner's acceptance criteria: [AC1] age-appropriate prompt
selection, bands infancy through teens; [AC2] verbatim answers saved with the
child's age, reopening restores them; [AC3] interviews in the archive and book,
sealable like any entry; [AC4] prompt-pack copy passes the sweep; [AC5] one calm,
dismissible birthday nudge that never nags.

1. **Prompt pack, age, title, and nudge helpers.** [AC1, AC4, AC5]
   - `src/interview.ts` exports `AGE_BANDS` covering ages 0 through the teens in
     contiguous bands, `ageInYears`, `promptsForAge` (clamped so every
     non-negative age resolves to a non-empty band), `interviewTitle`, and
     `birthdayNudge`. All pure. Unit-tested.
   - The infancy band and the teen band return different prompt sets (AC1).

2. **Model, migration, serialization.** [AC2, AC3]
   - `SCHEMA_VERSION` is 4; `migrateV3toV4` raises the version without touching
     entries; `validateEntry` accepts `"interview"`, validates `answers` and
     `childAgeYears` when present, and rejects malformed ones. `orderEntry`
     serializes the new fields deterministically. A v4 file opened by a v3 shell
     still hits the newer-version error state.

3. **Fold helpers.** [AC2, AC3]
   - `foldInterview` prepends a new interview entry and edits one in place by id
     (preserving `createdAt` and `childAgeYears`), leaving other entries
     untouched.
   - `foldSealed` strips `answers` and `childAgeYears` (and the letter content
     fields) so a sealed interview carries no readable plaintext; existing letter
     seal behavior is unchanged.

4. **Interview flow.** [AC1, AC2]
   - `InterviewView` shows the capture step only when the birth date is unknown,
     then the age-appropriate prompt form. The parent records answers verbatim and
     saves through the existing controller; the entry stores `childAgeYears` and
     every prompt with its verbatim answer. Reopening an interview restores every
     answer exactly as typed. Entering a birth date in the capture step persists
     it to `vault.child` on the same save.

5. **Archive, book, and unseal rendering.** [AC3]
   - The archive lists unsealed interviews, labelled as interviews, opening back
     into the edit flow; sealed interviews show the existing locked placeholder.
   - The book typesets each unsealed interview (title, date, each prompt and
     answer) alongside letters, in book order.
   - Unsealing a sealed interview reveals its answers read-only, in memory only.

6. **Sealing an interview.** [AC3, differentiator]
   - Sealing an interview runs through the existing seal dialog and key-sheet
     flow, encrypts the answers and age, and removes them from the saved file so
     the vault JSON holds no readable answer text or age for that entry. Unsealing
     with the 24 words (and, separately, the QR) restores the answers.

7. **Birthday nudge.** [AC5]
   - Around the birthday (within the fixed window, birth date known, this year's
     interview not yet recorded) the archive shows one calm, dismissible line whose
     action opens the interview. It is hidden outside the window, hidden once this
     year's interview exists, and never a blocking modal. Dismissing hides it for
     the session.

8. **Demo, mobile, accessibility, copy sweep, docs.** [AC4, quality §2/§4/§6/§8/§9]
   - `sampleVault()` carries one inert unsealed sample interview so staging shows
     the ritual within a minute.
   - The interview flow, capture step, nudge, archive rows, and book pages are
     fully usable at 390px with ~44px targets and no horizontal scroll.
   - Semantic structure and labels as described; keyboard reaches every control;
     visible focus.
   - Mechanical copy sweep over every new/changed string and the prompt pack
     passes. README module list and the one differentiator line are accurate;
     commands unchanged.

---

## Test plan (automated tests prove each criterion)

**Unit / integration (Vitest):**

- **`ageInYears`:** whole years for a birthday already passed this year and one
  not yet reached (boundary), Feb 29 birth date in a non-leap `now`, and `null`
  for an unparseable or future date. [AC1]
- **`promptsForAge`:** returns the correct band across every band boundary;
  clamps age 0 to the first-year band and a large age (e.g. 40) to the teen band;
  the first-year band and the teen band have different prompt sets. [AC1]
- **`interviewTitle`:** `"Interview in the first year"` at 0, `"Interview at age
  5"` at 5. [AC1]
- **Prompt-pack sweep (mechanical, automated):** import `AGE_BANDS`, flatten all
  prompt `text` values, and assert none contains `"—"` or `"–"` and none matches
  the banned-vocabulary list (case-insensitive). This makes AC4 a standing test,
  not a one-time check. [AC4]
- **`birthdayNudge`:** returns `null` with no birth date; returns `{age}` when
  `now` is inside the window and no interview for that age exists; returns `null`
  when an unsealed interview with that `childAgeYears` already exists; returns
  `null` when `now` is well outside the window; Feb 29 birthday resolves on Feb 28
  in a non-leap year. All with explicit `now`. [AC5]
- **`foldInterview`:** a new interview is prepended with `type: "interview"`,
  `childAgeYears`, `answers`, and empty letter fields; editing maps in place by id,
  preserves `createdAt` and `childAgeYears`, and leaves other entries and their
  photos byte-identical. [AC2]
- **`foldSealed` on an interview:** the resulting sealed entry has no `answers`
  and no `childAgeYears` and empty letter fields, and carries the sealed blob;
  a sealed letter is unchanged from today's behavior. [AC3, differentiator]
- **`vault` v4:** `migrateV3toV4` bumps the version and preserves entries; parsing
  a vault with an interview entry validates and preserves `answers`/`childAgeYears`;
  a malformed `answers` item throws `VaultParseError`; a serialize-then-parse
  round-trip of an interview entry preserves every field (proves `orderEntry`
  keeps them). Update any test that used `4` as the "newer version" sentinel to
  `5`. [AC2, AC3]
- **`seal` interview round-trip:** `seal({occasion:"", title, body:"", photos:[],
  childAgeYears, answers}, hint, iso)` then `unsealWithWords(sealed, words)`
  returns the same `answers` and `childAgeYears`. [AC3]

**End-to-end (Playwright, real browser, loaded from `file://`, all engines) —
`tests/e2e/interview.spec.ts`:**

- **Age-appropriate prompts:** seed a vault with a `child.birthDate` making the
  child a specific age (for example age 3), open "Record an interview", and assert
  the visible questions are the age-3 band's questions and not the infancy band's.
  Seed a second vault at a teen age and assert its distinct questions appear.
  [AC1]
- **Verbatim save and reopen:** with a birth date known, record answers to two
  prompts, save (mock FSA on Chromium), assert the "Saved" readout, go back, open
  the interview from the archive, and assert both answers are restored exactly as
  typed. Also assert the saved vault JSON (via `extractVaultJson`) holds an
  interview entry with `childAgeYears` and the two `answers`. [AC2]
- **Birth-date capture:** seed a vault with `child: null` and one letter, open
  "Record an interview", assert the capture step appears, enter a birth date,
  continue, assert the age-appropriate prompts appear, record and save, and assert
  the saved vault JSON has `child.birthDate` set and the interview entry present.
  [AC1, AC2]
- **Archive and book render:** seed a vault with a letter and an unsealed
  interview; assert the archive shows the interview labelled as an interview;
  open the book and assert the interview's title, a prompt question, and its
  answer all appear alongside the letter, in book order. [AC3]
- **Seal an interview leaks nothing, then unseals:** record an interview with a
  distinctive answer string, seal it through the dialog, capture the 24 words from
  the key sheet, and assert (a) the archive now shows the sealed placeholder, and
  (b) the saved vault JSON contains the sealed blob and does NOT contain the
  distinctive answer string or the age. Then open the sealed entry, enter the 24
  words, and assert the answer is revealed on screen. [AC3, differentiator]
- **Birthday nudge shows, opens, and dismisses:** seed a vault whose
  `child.birthDate` is set to today's month and day in a past year (computed at
  test time from the runtime clock, since the app uses the real `now`), with no
  interview yet. Assert the nudge line is visible; click its action and assert the
  interview opens; reload, assert it shows again, click "Not now" and assert it is
  gone for the session. Seed a second vault additionally carrying an interview for
  the current age and assert the nudge is absent. [AC5]
- **Mobile 390px:** at a 390px viewport, open the interview and the archive with
  the nudge; assert no horizontal scroll (`scrollWidth <= clientWidth`) and that
  the primary actions and the dismiss are tappable (~44px). [quality §2]

**Copy sweep (mechanical, part of done):** grep every user-visible string added in
this EPIC (the prompt pack, `InterviewView`, the nudge, the archive label, the
sample answers, and any README copy) for the characters `—` and `–`, the banned
vocabulary, and negative empty-state phrasing. Every hit in a shipped string is a
defect to fix in the same run. The prompt-pack sweep is additionally locked by the
unit test above. [AC4, quality §8]

---

## Risks and notes for the implementer

- **A sealed interview must never leak (top risk).** `foldSealed` currently
  spreads the whole entry, which would carry an interview's `answers` and
  `childAgeYears` into the sealed blob as plaintext. The destructuring-drop fix
  above is mandatory, and the e2e "seal leaks nothing" test is the proof. Do not
  ship the seal path without it. This is the differentiator line of the EPIC.
- **Store `promptText` on the entry, not a lookup.** Render interviews from the
  entry's own `answers` (which include `promptText`), never by re-reading the pack
  by `promptId`. A future pack edit must not rewrite the questions a family
  already answered.
- **Age is a fact of the year, recorded once.** Compute `childAgeYears` when the
  interview is first created and preserve it on every edit. Do not recompute it
  from `now` when reopening an old interview.
- **Verbatim means verbatim.** Do not trim, collapse whitespace, or reformat
  answer text. Save exactly what was typed. Empty answers are allowed.
- **The nudge never nags and never saves on dismiss.** Dismissal is in-memory for
  the session only. Recording this year's interview is the real, permanent
  dismissal, because `birthdayNudge` then returns `null`. Do not add a vault field
  that must be persisted with a file write just to remember a dismissal.
- **Birth-date capture is a precondition, not a settings screen.** Capture only
  the birth date (required) and name (optional), only when the birth date is
  missing, and only inside the interview flow. Do not grow it into a settings hub
  or add any other child field. If a stakeholder wants a real Settings screen,
  request it as a follow-up rather than building it here.
- **Reuse the save and seal machinery.** Route interview saves and seals through
  the existing `SaveController`, `applyResult`, stale-copy dialog, and key sheet.
  Do not fork a second save path. The felt safety of saving comes from reusing the
  exact ritual letters already use.
- **No network, no LLM, no audio, no schema drift beyond v4.** The prompt pack is
  static code; the interview renders and saves offline. Adding an LLM, a recorder,
  a mailer, or a second migration is out of scope and, for the first three, a
  Non-Goal. If a criterion appears to need one of these, block with a precise
  question rather than building it.

---

## Notes on this spec's provenance

Built by expanding the planner's authoritative scope for EPIC 5 against the
shipped EPIC 1 through EPIC 4 codebase (`src/vault.ts` with `SCHEMA_VERSION` 3 and
forward-only `migrate`; `src/entries.ts` with `foldDraft`/`foldSealed`/`isSealed`/
`unsealedEntries`/`bookEntries`; `src/seal.ts` with `SealedPayload`; `src/format.ts`;
`src/template.ts` serialization; and the Preact UI in `src/ui/` with `App`, `Home`,
`Editor`, `UnsealView`, `BookView`, and the existing `@media print` rules).

One planning gap was found and resolved inside this EPIC's scope: no shipped
screen sets `child.birthDate` (it exists only in the model and the demo sample),
and the plan's "Settings" screen has no owning EPIC. Because the interview cannot
derive an age or fire a birthday nudge without a birth date, this spec folds a
minimal birth-date capture into the interview flow (birth date required, name
optional, shown only when missing). This is the smallest change that makes AC1,
AC2, and AC5 provable, and it stays inside the ritual unit rather than building a
general settings surface (a Non-Goal). This is reported to the owner as factory
feedback so a future Settings EPIC, if desired, is a deliberate decision rather
than an accident. No DEPLOY / STAGING DEPLOY CONTRACT block was present in this
task's context, and this EPIC does not change the deploy.
