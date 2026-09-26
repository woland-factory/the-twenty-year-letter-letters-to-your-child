# EPIC SPEC — The self-carrying file: shell, save/reopen, and staging scaffold

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This is the spine EPIC. It builds the single self-contained HTML artifact
(the file a family keeps), its self-carrying save-and-reopen mechanism on
both browser paths, the integrity readout and stale-copy detection, plus
the distribution site and the staging deploy scaffold. When this EPIC is
done, a parent can write one plain letter, save it into their own folder,
close the browser, and reopen the file with the letter intact, on any
browser.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The one dimension this product must win: the
felt safety and clarity of every step, above all *saving the file*, so a
sleep-deprived non-technical parent never fears loss across an eighteen-year
commitment.

What it demands of THIS EPIC's work: saving is the single most important
interaction here, and this EPIC owns it end to end. Every save path must end
in a plain, calm confirmation that the parent's file is safe and which copy
is now the real one. The parent must never be left guessing whether a save
worked, which file is canonical, or whether opening a copy could damage the
original. When any save-related choice is open, choose the option that makes
loss harder and the truth more obvious, even at the cost of a little more
on-screen text or one more confirmation. This is where the product wins or
dies.

---

## Scope

### In scope
- A build pipeline that produces **one** self-contained `.html` artifact
  with all JS and CSS inlined, opening from `file://` with zero network
  requests.
- An embedded `vault-data` JSON model (schema version 1), parsed on open,
  holding all app state.
- The **self-carrying save mechanism** on both paths:
  - Chromium (File System Access API): in-place overwrite of the same file.
  - Non-Chromium / API absent: a designed download-and-replace ritual.
- **Integrity readout** on open: entry count and last-saved date, rendered
  from the vault.
- **Generation-counter stale-copy detection** on the Chromium path
  (re-read the file on disk, compare `generation`, warn before overwriting
  a newer copy).
- **Canonical-copy guidance** on the download-and-replace path, so a parent
  who test-reads a copy is never unsure which file is real.
- A minimal writing surface sufficient to compose **one plain letter**
  (title and body) and an archive/home screen that lists entries and shows
  the integrity readout, with designed empty, loading, and error states.
- The **distribution site**: a landing page plus a working live copy of the
  artifact.
- The **staging deploy scaffold**: `Dockerfile` and
  `docker-compose.staging.yml` that build and serve the distribution site.
  `SENTRY_DSN` and `UMAMI_*`, when set, wire into the **site only**.
- `SEED_DEMO=true` makes the site's live artifact load one sample letter so
  a reviewer sees real content within a minute without typing.

### Out of scope (Non-Goals — do not build)
- **Photos** (EPIC 2). No image attach, recompress, or embed.
- **Sealing / encryption / paper keys** (EPIC 3). No Web Crypto, BIP39, or QR
  in this EPIC.
- **The interview ritual** (EPIC 5).
- **The printable book** (EPIC 4). No print CSS book view.
- **The first-run walkthrough** (EPIC 6). Do NOT build a guided multi-step
  tour. This EPIC ships a designed, self-explanatory first screen (see
  "First screen and the walkthrough boundary" below), not a walkthrough.
- **Any analytics or error tracking inside the artifact.** The artifact
  makes zero network requests, forever. `UMAMI_*` / `SENTRY_DSN` touch the
  distribution site only, never the file a family saves.
- The full writing room (occasion field, rich body, reorder, archive
  thumbnails) beyond what is needed to prove one plain letter round-trips —
  that is EPIC 2. Keep the editor minimal here.
- Settings screens for child name / birth date / reminders (later EPICs).
  The model may carry these fields as optional, but build no editing UI now.

---

## Quality bar as it applies here

The quality bar is binding spec. The clauses that bite in this EPIC:

- **Perceived speed (§1).** The artifact opens locally, so first render must
  be effectively instant. Show real content or a steady skeleton within
  ~1s while the vault parses. No blank white screen at any point.
  Save gives feedback within 100ms (a pressed / "Saving…" state) even though
  the write completes shortly after.
- **Mobile-first (§2).** Home, editor, and every save surface are fully
  usable at 390px: no horizontal scroll, ~44px touch targets, readable text.
- **Designed states (§3).** Empty (no letters yet), loading (parsing the
  vault), and error (unreadable vault data, or a save that could not
  complete) are all designed surfaces in the product's voice, each with a
  clear next action. A parse failure must never dead-end or show a raw
  stack trace, and must reassure the parent their file on disk is unchanged.
- **First-run (§4) — boundary with EPIC 6.** The guided walkthrough is EPIC
  6 and out of scope. This EPIC still must not dead-end a new user: the
  empty home screen names what the product is and offers the one core action
  (write your first letter), and the save surfaces explain the save in plain
  words. A clear first screen here, the guided walk later.
- **Security hygiene (§5).** The artifact enforces zero network at the
  browser level via a strict Content-Security-Policy meta tag (see Technical
  design). Vault JSON is parsed defensively (malformed input yields the
  error state, never a crash or a silent overwrite). The distribution site
  serves static files only; set sensible security headers and do not expose
  any mutating endpoint. No secrets in tracked files or client bundles.
- **Accessibility (§6).** Every input labeled, visible focus states,
  semantic headings and landmarks, full keyboard reach, sufficient contrast.
- **Radically simple interface (§7).** One obvious primary action per screen
  (home: write; editor: save). Cut words. Show a real example over
  instructions where possible.
- **Copy (§8).** Every visible string reads like a thoughtful person wrote
  it. No em-dashes or dash-asides, positive and direct phrasing, no banned
  LLM vocabulary, no negative empty states. Sweep before done.
- **README (§9).** A stranger can understand, run (commands verified against
  the compose files), and contribute. No pipeline jargon.

---

## Technical design

### Stack
- **Build:** Vite with `vite-plugin-singlefile` so the artifact compiles to
  one HTML file with all JS and CSS inlined and zero external requests.
- **UI:** Preact + TypeScript (small runtime, JSX). Vanilla TypeScript is an
  acceptable alternative. Keep the dependency surface tiny; an 18-year file
  should be small and boring. No CSS framework, no icon-font CDN, no web
  fonts loaded over the network. Use system font stack and hand-written CSS.
- **Tests:** Vitest for unit/integration, Playwright for end-to-end
  (network assertions, both save paths, cross-browser).
- **Site + serving:** a static distribution site served by a small static
  file server in the container (nginx or an equivalent tiny static server).

### File / module layout (forward-looking, minimal now)
```
/                              repo root
  package.json
  tsconfig.json
  vite.config.ts               singlefile build → dist/artifact HTML
  index.html                   artifact shell: CSP meta, #app root, vault-data markers
  src/
    main.ts(x)                 entry: capture template FIRST, parse vault, mount
    template.ts                capture pristine template, split on markers, serialize(vault)
    vault.ts                   Vault/Entry types, SCHEMA_VERSION, emptyVault(), parseVault(), migrate()
    sample.ts                  inert sample vault used only for the live demo (?demo=1)
    save/
      capability.ts            detect File System Access support
      index.ts                 save orchestration, integrity/generation bookkeeping
      fsAccess.ts              Chromium in-place save; re-read + generation compare
      download.ts              download-and-replace ritual
    ui/
      App.tsx                  routes between Home and Editor (in-memory, no URL router)
      Home.tsx                 integrity readout, entry list, empty state, primary "Write" action
      Editor.tsx               minimal plain-letter compose (title + body), Save
      SaveStatus.tsx           save button states + confirmation
      BackupRitual.tsx         download-path canonical-copy guidance
      StaleCopyDialog.tsx      Chromium stale-copy warning
      states.tsx               loading skeleton, error surface
    styles.css
  site/
    index.html                 landing page (what it is, why, download your file, try it live)
    styles.css
    (build copies the artifact in as the downloadable + live file)
  scripts/
    prepare-site.mjs           assemble site/ dist: landing + artifact + demo wiring
    docker-entrypoint.sh       reads SEED_DEMO / SENTRY_DSN / UMAMI_* → configures site only
  Dockerfile
  docker-compose.staging.yml
  nginx.conf                   (or chosen static server config) with security headers
  tests/
    unit/                      vitest
    e2e/                       playwright
  README.md
  .env.example                 placeholders only (SEED_DEMO, SENTRY_DSN, UMAMI_URL, UMAMI_WEBSITE_ID)
```

### Data model (schema version 1, forward-only)

There is no database and no migration table. The "migration" surface is the
in-file `schemaVersion` and a pure `migrate(raw)` function. This EPIC defines
version 1. Later EPICs bump the number and extend `migrate` forward only;
never mutate the meaning of an existing field.

```ts
type Vault = {
  schemaVersion: number   // = 1 in this EPIC
  generation: number      // starts at 0; increments by 1 on every successful save
  savedAt: string | null  // ISO timestamp of last save; null before first save
  fileId: string          // random id minted on first save, stable thereafter
  child: { name: string; birthDate: string | null } | null  // present in model; no editing UI this EPIC
  entries: Entry[]
  firstRunDone: boolean    // present in model; owned by EPIC 6, defaults false
}

type Entry = {
  id: string
  type: "letter"           // only "letter" is produced this EPIC
  createdAt: string        // ISO
  title: string
  body: string             // plain text
  // occasion, photos, interview fields, sealed{} are added by later EPICs; absent here
}
```

- `emptyVault()` returns `{ schemaVersion: 1, generation: 0, savedAt: null,
  fileId: "", child: null, entries: [], firstRunDone: false }`. `fileId` is
  minted on the first successful save.
- `parseVault(text)` JSON-parses, checks it is an object with a numeric
  `schemaVersion`, runs `migrate`, and validates shapes defensively. Any
  failure throws a typed `VaultParseError` that the UI turns into the
  designed error state. Unknown future fields are preserved, not dropped
  (so a file saved by a newer version and opened by an older shell does not
  lose data silently; if `schemaVersion` is newer than known, show the error
  state telling the parent to open with their newest copy rather than
  down-migrating).

### The artifact shell (`index.html`)
- A strict CSP meta tag that blocks all network by construction, making zero
  network a browser-enforced guarantee rather than a promise:
  ```
  default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
  img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none';
  form-action 'none'
  ```
  (`'unsafe-inline'` is required because the single-file build inlines JS and
  CSS; it is safe here precisely because `connect-src 'none'` and
  `default-src 'none'` forbid loading or contacting anything external.)
- An empty `<div id="app"></div>` mount root.
- The vault data block, wrapped in unique marker comments so the save
  mechanism can split the file unambiguously:
  ```html
  <!--TYL:VAULT-DATA:BEGIN-->
  <script id="vault-data" type="application/json">{"schemaVersion":1,"generation":0,"savedAt":null,"fileId":"","child":null,"entries":[],"firstRunDone":false}</script>
  <!--TYL:VAULT-DATA:END-->
  ```

### The self-carrying save mechanism (`template.ts`)

The heart of this EPIC. It must guarantee that the saved file is clean and
that the app code stays byte-stable across saves.

1. **Capture before mount.** The very first synchronous action in
   `main.ts(x)`, before any UI renders into `#app`, is:
   ```
   template = "<!DOCTYPE html>\n" + document.documentElement.outerHTML
   ```
   At this instant `#app` is empty and the DOM is the parsed built shell, so
   the captured template contains no app-injected DOM. Split `template` on
   the two marker comments into `head` (everything up to and including
   `TYL:VAULT-DATA:BEGIN`) and `tail` (everything from `TYL:VAULT-DATA:END`
   onward). If the markers are missing, fail loudly (throw), because saving
   would be unsafe.
2. **Serialize.** `serialize(vault)` returns:
   ```
   head
   + '\n<script id="vault-data" type="application/json">'
   + escapeForScript(JSON.stringify(vault))
   + '</script>\n'
   + tail
   ```
   `escapeForScript` replaces every `<` with `<` in the JSON string so
   no `</script>`, `<!--`, or `-->` sequence can break out of the script
   context. `JSON.stringify` uses a fixed, deterministic key order (build the
   vault object with a stable field order) so that, apart from the values
   that legitimately change (`generation`, `savedAt`, and the entries the
   user edited), byte output is deterministic.
3. **Byte-stability guarantee.** Because `head` and `tail` are captured once
   and never touched, everything outside the vault-data block is byte-
   identical on every save. Only the JSON inside the block changes. The live,
   mutated UI DOM is never serialized, so no DOM-leak bloat is possible.

### Capability detection and save orchestration (`save/`)
- `capability.ts`: `supportsFileSystemAccess()` returns whether
  `window.showSaveFilePicker` exists and is callable in this context.
- `save/index.ts` exposes `saveVault(vault)`:
  - Bumps a working copy: on a confirmed write, set
    `generation = baselineGeneration + 1` (or higher, see stale handling),
    `savedAt = <now ISO>`, mint `fileId` if empty.
  - Routes to `fsAccess` or `download` based on capability.
  - Tracks `baselineGeneration` in memory: the generation the app loaded, or
    the generation it last successfully wrote. Used for stale-copy compare.
  - Returns a typed result (`saved` / `staleAborted` / `error`) that drives
    the on-screen confirmation and error states.

### Chromium in-place save (`save/fsAccess.ts`)
- The app holds a `FileSystemFileHandle` in memory for the session.
- **First save of a session** (no handle yet): call `showSaveFilePicker`
  with a sensible `suggestedName` (`the-twenty-year-letter.html`). The parent
  can pick their existing file to overwrite or create a new one. Store the
  handle.
  - Because a parent double-clicks the HTML from disk (so the app has no
    handle on load), a re-pick on the first save each session is expected and
    acceptable. Explain it plainly the first time.
- **Before every write** (including the first), re-read the file the handle
  points at: `handle.getFile()` → text → `parseVault` → `diskGeneration`.
  - If `diskGeneration > baselineGeneration`: the file on disk is newer than
    what the parent has open (another copy or session advanced it). Show the
    **stale-copy dialog** and do not write until the parent chooses. On
    "replace with my open copy", set the outgoing
    `generation = max(baselineGeneration, diskGeneration) + 1` so the
    canonical generation always increases, then write. On "keep the disk
    copy", abort the save and return `staleAborted`.
  - Otherwise write via `handle.createWritable()` → `write(serialize(vault))`
    → `close()`. On success set `baselineGeneration` to the written
    generation and show the calm confirmation.
- If the disk file is empty or unparseable (e.g. the parent picked a brand
  new file), treat `diskGeneration` as `-1` (no stale warning) and write.

### Download-and-replace ritual (`save/download.ts` + `ui/BackupRitual.tsx`)
- On save, produce `serialize(vault)` as a `Blob` and trigger a download via
  a temporary `<a download="the-twenty-year-letter.html">`. Keep the filename
  constant so replacing the old file is a straight swap.
- Immediately show the **backup ritual surface** with plain guidance:
  - State that the copy that just downloaded is now the real one.
  - Tell the parent to replace the older copy in their folder with it.
  - Show a copy identity the parent can read on the file itself: the
    generation number and the saved date and time (for example, "Copy 4,
    saved March 3, 2026 at 9:14 PM"). This is the anchor that keeps a parent
    from confusing copies.
- Because a browser may append `(1)` to a downloaded filename, the guidance
  never relies on the filename alone. The canonical copy is always the one
  with the highest copy number and the latest saved time, both shown in the
  app and both visible again in the integrity readout when the file is
  reopened.

### Integrity readout and the archive home (`ui/Home.tsx`)
- On open, render from the parsed vault:
  - Entry count as a human phrase: "1 letter" / "3 letters".
  - Last saved date: "Saved March 3, 2026" (or "Saved today at 9:14 PM" when
    same day). Before the first save, show a first-save prompt instead of a
    date.
  - The copy number (generation) so a parent test-reading a copy sees at a
    glance which copy this file is.
- A list of entries (title + date) sufficient to confirm reopen restored
  them. Rich archive styling and thumbnails are EPIC 2; keep this simple.
- **Empty state** (no entries): name the product in one line and offer the
  one primary action to write the first letter. No blank region, no
  walkthrough.
- One obvious primary action: **Write a letter**.

### Minimal editor (`ui/Editor.tsx`)
- Compose a plain letter: a **title** field and a **body** textarea, both
  labeled, both keyboard reachable. Save adds/updates the entry in the vault
  and triggers `saveVault`.
- This is intentionally minimal: enough to prove one plain letter round-trips.
  The occasion field, richer body, photos, reordering, and the designed
  writing room are EPIC 2. Do not build them here.

### First screen and the walkthrough boundary
- Ship a designed, self-explanatory first screen (empty state) that satisfies
  quality bar §3 and §7 without a guided tour. The multi-step guided
  walkthrough is EPIC 6 and must NOT be built here. If while building this
  screen it appears the quality bar cannot be met without the walkthrough,
  do not build the walkthrough and do not silently degrade: raise it (block)
  rather than crossing into EPIC 6.

### Distribution site (`site/` + `scripts/prepare-site.mjs`)
- A landing page: two or three plain sentences on what the product is and why
  it exists, a primary **download your file** action (serves the built empty
  artifact), and a **try it live** action (opens the live artifact).
- The live artifact is the same built file. When `SEED_DEMO=true`, the live
  route loads it seeded (see below). The downloadable starter file is always
  the empty artifact so a parent never downloads someone else's sample.
- The site is where `UMAMI_*` and `SENTRY_DSN` may be wired, and only here.
  The artifact HTML must contain no reference to Umami, Sentry, or any URL.
- Landing page and site assets are self-hosted (no CDN fonts/scripts) to keep
  the story consistent and the deploy self-contained.

### SEED_DEMO (sample letter for the live artifact)
- `src/sample.ts` holds one inert sample vault with a single sample letter
  (title + body). It is inlined in every build but inert: the app loads it
  only when the current vault is empty **and** the page URL carries the demo
  flag (`?demo=1`). A downloaded artifact has no such URL flag, so it never
  auto-seeds.
- The container entrypoint reads `SEED_DEMO`. When `true`, the site's "try it
  live" link/route points at the artifact with `?demo=1`; when unset/false,
  it points at the plain artifact. This is site-side wiring only; the
  artifact bytes are identical either way and still make zero network
  requests (reading `location.search` is local).
- The sample letter demonstrates real content (a readable letter and a
  correct integrity readout) within a minute, with no typing.

### Staging deploy scaffold
- `Dockerfile`: multi-stage. Stage 1 installs deps and runs the Vite
  single-file build plus `prepare-site.mjs` to assemble `site/` dist. Stage 2
  is a small static server image serving the assembled site.
- `docker-compose.staging.yml`: one service building from the `Dockerfile`,
  exposing the site on a port, passing `SEED_DEMO`, `SENTRY_DSN`,
  `UMAMI_URL`, `UMAMI_WEBSITE_ID` from the environment. `docker compose -f
  docker-compose.staging.yml up` yields a reachable site.
- `docker-entrypoint.sh` injects the site-only env (analytics/error tracking
  into the landing page, demo wiring) at container start. It must never
  inject anything into the artifact HTML.
- Security headers on the static server (at least a restrictive CSP for the
  site, `X-Content-Type-Options: nosniff`, `Referrer-Policy`). Serve
  `.html` with correct content type.
- `.env.example` carries placeholders only. No real secrets in any tracked
  file.

---

## Example copy (ships verbatim downstream; already copy-swept)

- Home empty state heading: `Write your first letter.`
- Home empty state line: `It saves to your own file and stays with you.`
- Primary action: `Write a letter`
- Editor title label: `Title`
- Editor body label: `Your letter`
- Save button (idle): `Save`
- Save button (in progress): `Saving`
- Chromium first-save hint: `Choose where to keep your file. After that, Save writes straight to it.`
- Save confirmation: `Saved. Your file is up to date.`
- Integrity readout examples: `1 letter. Saved today at 9:14 PM.` /
  `3 letters. Saved March 3, 2026.` / copy line: `This is copy 4.`
- Download ritual heading: `Your newest copy just downloaded.`
- Download ritual body: `Keep this one as your real file. Replace the older
  copy in your folder with it.`
- Download ritual copy identity: `Copy 4, saved March 3, 2026 at 9:14 PM.`
- Stale-copy dialog heading: `The file on disk is newer than this one.`
- Stale-copy dialog body: `The copy on disk is copy 6. The copy you have open
  is copy 5. You can replace the disk copy with your open one, or keep the
  disk copy and start again from it.`
- Stale-copy actions: `Replace with my open copy` / `Keep the disk copy`
- Vault error state heading: `We can't read the letters in this file.`
- Vault error state body: `Your file on disk is unchanged. Open your most
  recent copy to keep going.`
- Loading state: `Opening your file` (with a steady skeleton, layout held).

Copy sweep for the strings above: no `—` or `–`; no banned vocabulary
("seamlessly", "effortlessly", "unlock", "elevate", "empower", "leverage",
"robust", "dive in", and kin); empty and error states use positive, direct
phrasing with a clear next action. The implementer repeats this sweep over
every string they add, including landing-page and README copy.

---

## Ordered task list (each with acceptance criteria)

Numbers in brackets map to the planner's acceptance criteria this task helps
satisfy.

1. **Build pipeline → single self-contained artifact.** [AC1]
   - Vite + `vite-plugin-singlefile` produces exactly one `.html` file with
     all JS and CSS inlined.
   - The artifact opens from `file://` and issues **zero** network requests
     on load and on save (DevTools network tab empty).
   - The artifact HTML contains no external URL and no reference to Umami,
     Sentry, or any CDN; it carries the strict CSP meta that forbids network.

2. **Vault model, parse, and defensive validation.** [AC2, AC4]
   - `Vault`/`Entry` types, `SCHEMA_VERSION = 1`, `emptyVault()`,
     `parseVault()`, and forward-only `migrate()` exist as specified.
   - `parseVault` turns malformed or newer-than-known data into a typed error
     (never a crash) and preserves unknown fields on valid parse.

3. **Self-carrying serialize with byte-stable template.** [AC2, AC3]
   - Template captured before mount; split on markers into head/tail.
   - `serialize(vault)` reinserts only the vault-data block; `<` is escaped so
     the JSON can never break out of the script context.
   - Saving the same vault twice yields output where everything outside the
     vault-data block is byte-identical, and the mounted UI never leaks into
     the saved file.

4. **Chromium in-place save + stale-copy detection.** [AC2, AC5]
   - File System Access save writes to the held handle; the first save each
     session picks/confirms the file.
   - Before every write, the file on disk is re-read and its `generation`
     compared to `baselineGeneration`; a higher disk generation shows the
     stale-copy dialog and blocks the write until the parent chooses.
   - Round-trip: write a letter, save, close, reopen the saved file, the
     letter is restored exactly and the integrity readout is correct.

5. **Download-and-replace ritual + canonical-copy guidance.** [AC2, AC6]
   - Non-Chromium / no-API save downloads the serialized file with a constant
     filename and shows the backup ritual surface.
   - The surface states which copy is canonical and shows the copy number and
     saved time, so a parent test-reading a copy cannot end up unsure which
     file is real.
   - Round-trip on this path: the downloaded file reopens with the letter
     restored exactly.

6. **Integrity readout + archive home + minimal editor + designed states.**
   [AC2, AC4]
   - Home shows entry count, last-saved date, and the copy number from the
     vault, plus a simple entry list.
   - Empty, loading, and error states are designed, in the product's voice,
     each with a clear next action and no blank/dead-end screen.
   - The minimal editor composes one plain letter (title + body) and saves it.
   - Fully usable at 390px; accessibility basics met; copy swept.

7. **Distribution site: landing + live artifact.** [AC7, AC9]
   - Landing page explains the product in plain language and offers download
     (empty artifact) and try-it-live actions.
   - The live artifact works in-browser. With `SEED_DEMO=true` it loads the
     sample letter and shows real content within a minute with no typing.
   - The downloadable starter file is always empty (never seeded).

8. **Staging deploy scaffold.** [AC8, AC9]
   - `Dockerfile` builds the artifact and assembles the site; the static
     server serves it.
   - `docker compose -f docker-compose.staging.yml up` yields a reachable
     site.
   - `SENTRY_DSN` / `UMAMI_*`, when set, wire into the site only; the artifact
     contains no trace of them. `SEED_DEMO` drives the live-artifact seeding.
   - Security headers set on the site; `.env.example` has placeholders only.

9. **README for strangers.** [Quality bar §9]
   - Explains what the app is and why (two or three plain sentences), the
     exact commands to build and run (verified against the compose files),
     and where the code and tests live. No pipeline jargon.

---

## Test plan (automated tests prove each criterion)

**Unit / integration (Vitest):**
- `parseVault`: valid vault parses; malformed JSON, non-object, missing
  `schemaVersion`, and newer-than-known `schemaVersion` each yield the typed
  error; unknown fields preserved. [AC2, AC4]
- `serialize` round-trip: `parseVault(serialize(v))` deep-equals `v` for
  vaults with zero, one, and several letters, including bodies containing
  `</script>`, `<!--`, `-->`, unicode, quotes, and newlines. [AC2, AC3]
- **Byte-stability**: `serialize(v)` twice for the same `v` is identical;
  serializing two vaults that differ only in entries changes only the bytes
  between the vault-data markers (head/tail byte-identical). [AC3]
- Generation/stale logic: given `baselineGeneration` and a re-read
  `diskGeneration`, the decision (`write` vs `warn`) and the outgoing
  generation are correct across cases (disk lower, equal, higher, empty
  file). [AC5]
- Integrity readout formatting: entry count phrasing and date/copy strings
  render correctly from a vault, including the pre-first-save state. [AC4]

**End-to-end (Playwright):**
- **Zero network:** load the built artifact from `file://` with request
  interception; assert no network requests on load and after a save. Also a
  static check that the artifact source contains no `http://`/`https://` URL
  and no `umami`/`sentry` reference. [AC1]
- **Download path round-trip (WebKit/Firefox):** write a letter, save, capture
  the download, reopen it, assert the letter and integrity readout are
  restored; assert the backup ritual surface shows the canonical-copy
  guidance with copy number and saved time. [AC2, AC6]
- **Chromium in-place path:** exercise the save orchestration against an
  injected/mock `FileSystemFileHandle` so the write, re-read, and generation
  compare run headlessly; assert (a) a normal save writes and confirms, (b) a
  higher disk generation triggers the stale-copy dialog and blocks the write
  until a choice is made, (c) round-trip restores the letter. Document the one
  real-browser manual check (double-click file, pick target, save) that the
  file-picker step cannot fully automate. [AC2, AC5]
- **Empty / loading / error states:** empty vault shows the designed empty
  state with the primary action; a deliberately corrupted vault-data block
  shows the designed error state (no stack trace) and states the disk file is
  unchanged. [Quality bar §3]
- **Mobile 390px:** home and editor render with no horizontal scroll and
  tappable targets at a 390px viewport. [Quality bar §2]
- **Site smoke:** landing page serves and links work; the live artifact loads;
  with `SEED_DEMO=true` the live artifact shows the sample letter and a
  correct readout without typing; the download serves the empty artifact.
  [AC7, AC9]
- **Deploy smoke:** `docker compose -f docker-compose.staging.yml up` (built
  image) serves a reachable site; a request to the served artifact returns
  HTML with no analytics/error-tracking references; with `SENTRY_DSN`/`UMAMI_*`
  set, those appear only in the site's landing page, never in the artifact.
  [AC8]

**Copy sweep (mechanical, part of done):** grep every user-visible string in
components, the landing page, the sample letter, the README, and this spec's
example copy for the characters `—` and `–`, the banned vocabulary, and
negative empty-state phrasing ("You don't have", "No … yet", "Nothing …
here", "Unable to", "Something went wrong"). Every hit in a shipped string is
a defect to fix in the same run. [Quality bar §8]

---

## Risks and notes for the implementer
- **Template capture must be the first thing that runs.** If any UI mounts
  before capture, the saved file will carry app DOM. Capture in `main`
  before the render call, and assert the markers exist.
- **Deterministic serialization** is what makes the byte-stability test pass.
  Build the vault object with a fixed key order and rely on `JSON.stringify`
  preserving insertion order.
- **File System Access needs a user gesture and cannot silently grab the
  current file's handle.** The first-save re-pick is expected; explain it
  once, calmly. Persisting a handle across reloads is not required and is out
  of scope.
- **The stale-copy re-read is a trust feature, not an edge case.** It also
  guards the first save against overwriting a real vault with a fresh empty
  one when the parent picks the wrong file. Keep it on the first save too.
- **Do not cross EPIC boundaries.** No photos, sealing, interview, book, or
  walkthrough. If the quality bar seems to demand one of these, block with a
  precise question rather than building it.

---

## Notes on this spec's provenance
No authoritative DEPLOY CONTRACT or STAGING DEPLOY CONTRACT block was present
in this EPIC's build context, so the staging-deploy criteria were expanded
from the planner's acceptance criteria and the standard `SEED_DEMO` /
`SENTRY_DSN` / `UMAMI_*` conventions. If such a block is supplied to the
implementer, follow it exactly where it differs.
