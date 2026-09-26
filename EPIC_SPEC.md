# EPIC SPEC — Sealed letters and paper keys (the signature moment)

*The Twenty-Year Letter: letters to your child that no company has to survive.*

This EPIC builds the product's signature moment: a parent seals a letter in
the browser and prints its paper key. The letter is encrypted with a random
key that never leaves the machine and is never saved in the file. Its key
prints as a 24-word list plus a QR code that goes into a birthday card or a
drawer at grandma's. Eighteen years later the grown child opens the file on
any offline computer, types the words or scans the QR, and reads the letter,
with no company, server, or account in between.

This EPIC builds on the shipped spine (EPIC 1) and the writing room (EPIC 2):
the single self-contained `.html` artifact, the self-carrying byte-stable
save on both browser paths, stale-copy detection, the letter+photo editor,
and the archive. Do not rebuild or re-architect any of that. A sealed vault
rides through the existing `serialize`/save path for free once the sealed
entry shape exists; this EPIC adds the crypto, the key sheet, the unseal
flow, and the archive placeholder on top.

---

## Quality differentiator (this EPIC is held to it)

**Trustworthy simplicity.** The felt safety and clarity of every step, above
all saving the file and sealing a letter, so a sleep-deprived non-technical
parent never fears loss across an eighteen-year commitment.

What it demands of THIS EPIC's work: sealing is the scariest step in the
whole product, because it is genuinely irreversible by design. The bar is to
make that step feel *calm and deliberate*, never frightening and never
accidental. Three failure modes matter above all.

1. **A seal that loses the letter.** If sealing encrypts the letter but the
   save then fails or is cancelled, the parent must end up with their letter
   exactly as it was, unsealed and intact. The seal is only real once the
   ciphertext is safely written to disk. Until then the letter stays open.
2. **A key the parent cannot trust or find later.** The key is shown once and
   never stored. The key sheet must make a parent confident they can open
   this letter in 2044 with only that slip of paper. It states plainly, in
   the product's voice, that the key is not in the file and must be kept.
3. **An unseal that feels like a locked door with no help.** In 2044 the
   child has only paper and an offline browser. Typing the words or scanning
   the QR must be obvious, and a wrong or mistyped key must fail calmly with a
   clear next step, never a scary error and never a corrupted file.

When any choice here is open, choose the option that makes loss harder, makes
the irreversibility honest without alarming, and keeps the 2044 open path
dead simple.

---

## Scope

### In scope
- **Per-letter client-side sealing.** Seal any composable letter (a new draft
  or an existing unsealed entry) with AES-GCM in the browser. A random 256-bit
  key is generated, the letter's content is encrypted, its plaintext and
  photos are stripped from the vault, and only `{iv, ciphertext, keyHint,
  sealedAt}` is stored on the entry.
- **The paper key.** The random key is encoded as a **24-word list** (BIP39
  English wordlist) and also as a **QR code**. Both are shown on one clean
  **printable key sheet** together with the parent's chosen key hint, once,
  immediately after the seal is saved. The key is never written into the
  vault.
- **The seal dialog.** Before confirming, it states plainly that a lost key
  means the letter cannot be opened and that the book holds only unsealed
  content. The parent chooses a key hint. Confirmation is **deliberate**: an
  acknowledgement gate, not a stray click.
- **The unseal flow.** Opening a sealed entry offers two ways to open it:
  type the 24 words, or open a photo of the QR (decoded offline). On success
  the letter is revealed **read-only, in memory only** (title, occasion,
  body, photos). It is never written back to the vault; the entry stays
  sealed.
- **Sealed entries in the archive.** A sealed entry renders as a locked
  placeholder showing its key hint and date, with no leaked title, occasion,
  body, or photo. A pure predicate marks sealed entries so the future book
  (EPIC 4) excludes them.
- **Schema forward-migration to version 3.** `Entry` gains an optional
  `sealed` blob. `migrate` adds a v2→v3 step. Forward-only, never mutating an
  existing field's meaning.
- **Designed states and mobile-first.** Seal dialog, sealing progress, key
  sheet, unseal entry, unseal error, and the revealed letter are all designed
  surfaces, fully usable at 390px.

### Out of scope (Non-Goals — do not build)
- **Key escrow or cloud key backup.** The key exists only on paper the family
  keeps. No copy of the key is stored anywhere in the file or sent anywhere.
- **Passphrase-derived keys.** The key is random bytes encoded as words. The
  words ARE the key material (a reversible encoding), never a passphrase run
  through a KDF. Do not add PBKDF2/scrypt/Argon2 or a "choose a password"
  field.
- **Automatic resealing of an opened letter.** Unsealing reveals the content
  in memory for reading only. Do not re-encrypt on close, do not write the
  decrypted plaintext back into the vault, and do not offer an "edit then
  reseal" path in this EPIC.
- **Remembering keys in the file.** The 24 words / raw key are never stored in
  the vault, never cached in the file, never logged. After the key sheet is
  dismissed the words are gone from memory.
- **Live camera QR scanning.** "Scan the QR" is implemented as decoding a
  photo/image of the QR offline (see Technical design). No `getUserMedia`
  live-camera viewfinder in this EPIC (permissions friction, no offline-safe
  test path, and bundle cost). On mobile the file input uses `capture` so the
  parent can snap the sheet directly.
- **The printable book** (EPIC 4), **the interview ritual** (EPIC 5), and
  **the first-run walkthrough** (EPIC 6). Provide the `isSealed` /
  `unsealedEntries` predicate the book will consume, but do not build a book
  view. Do not build a guided tour.
- **Any change to the save mechanism, stale-copy detection, the CSP, the
  distribution site, or the staging deploy** beyond what carrying the sealed
  entry shape requires. The spine is done. Do not re-architect it.
- **Any network request from the artifact, ever.** All crypto, mnemonic
  encoding, QR encode, and QR decode run locally. Adding a library must not
  add a single fetch, CDN load, WASM fetch, or `eval`.

---

## Quality bar as it applies here

The quality bar is binding spec. The clauses that bite in this EPIC:

- **Perceived speed (§1).** Pressing "Seal and show my key" gives feedback
  within 100ms (a disabled control and an inline "Sealing your letter"
  state), even though encrypting a letter with several photos takes longer.
  Encrypt asynchronously; never freeze the page. Unsealing shows "Opening
  your letter" the moment the parent submits. No network on any hot path (the
  artifact has none).
- **Mobile-first (§2).** Seal dialog, key sheet (the 24 words wrap into a
  readable grid, the QR fits), unseal word entry, the QR-photo control, and
  the revealed letter are all fully usable at 390px: no horizontal scroll,
  ~44px touch targets, readable text.
- **Designed states (§3).** The seal dialog is a designed, deliberate
  surface. The key sheet is the once-shown surface with a print action. The
  unseal view has a clear entry state; a wrong/mistyped key produces a calm
  in-context error with a next step, never a raw exception or a dead end. A
  decrypt failure never corrupts the vault and never leaves the parent stuck.
- **First-run (§4) — boundary with EPIC 6.** No walkthrough here. The seal
  control and the unseal view must stand on their own: an obvious action, an
  example key-hint placeholder, and controls that teach by looking. On
  staging the differentiator must be reachable within a minute: the demo
  sample carries one sealed placeholder so the locked state is visible at a
  glance, and the unsealed sample letter can be sealed live to reach the
  signature moment (see Sample / live demo).
- **Security hygiene (§5).** The artifact has no server, so the server-side
  clauses (route authorization, rate limiting) are not applicable and must
  not be invented. The applicable parts are load-bearing here: validate the
  boundary (mnemonic checksum, QR decode result, sealed-blob shape on parse);
  encrypt entirely client-side; make zero network requests; keep no secrets
  in code; and **never log the key, the 24 words, the raw key bytes, the
  ciphertext, or any letter content** (no PII in logs). Encoding: rendered
  letter content is text (Preact escapes it); the QR renders as inline SVG or
  a `data:` image already permitted by the CSP.
- **Accessibility (§6).** The seal and unseal dialogs use `role="alertdialog"`
  / `role="dialog"` with `aria-modal`, labelled title and body, focus moved
  into the dialog on open and returned on close, and Escape to cancel (cancel,
  never confirm). Every input labelled (key hint, acknowledgement checkbox,
  word entry, QR file input). The QR carries an accessible label; the 24 words
  are the accessible, screen-reader-readable representation of the key.
  Visible focus states, sufficient contrast, keyboard reaches every control
  including Print.
- **Radically simple interface (§7).** One obvious action per surface: seal
  dialog → "Seal and show my key"; key sheet → "Print this key"; unseal →
  "Open this letter". The seal control in the editor is visibly subordinate to
  Save (sealing is rare and deliberate; saving is the everyday action). Cut
  words: the warning is two or three short sentences, not a paragraph.
- **Copy (§8).** Every new visible string reads like a person wrote it. No
  em-dashes or dash-asides, positive and direct phrasing, no banned LLM
  vocabulary, no negative empty-state phrasing. The irreversibility warning
  states the fact plainly ("a lost key means this letter cannot be opened")
  without alarming register. Sweep before done (see Example copy and Test
  plan).
- **README (§9).** Update the "Where the code lives" list with the new
  modules (`seal`, `mnemonic`, `qr`) and add one plain line to "What makes it
  different" about sealing with paper keys. Keep the run/test commands
  accurate. Note the artifact still makes zero network requests. No pipeline
  jargon.

---

## Technical design

### Web Crypto availability (the load-bearing assumption)

`crypto.subtle` (AES-GCM) and `crypto.getRandomValues` are the encryption
primitives. The whole app opens from `file://`, and modern Chromium, Firefox,
and WebKit all treat `file://` as a secure context where `crypto.subtle` is
available (the plan confirms this was validated). This EPIC depends on that,
so the seal/unseal e2e MUST run from `file://` on every engine to prove it.

Add a small capability check `sealingAvailable()` that returns whether
`globalThis.crypto?.subtle` exists. When it is missing, the editor's seal
control is disabled with a plain message and the rest of the app is
unaffected (graceful degradation, mirroring the save capability pattern). Do
NOT bundle a JS AES fallback in this EPIC: it is bundle weight and crypto risk
for a case the target engines do not hit. If a reviewer finds a target engine
where `file://` lacks `crypto.subtle`, that is a blocking finding, not a
license to add a fallback here.

No `index.html` / CSP change is needed or allowed. `crypto.subtle` is a JS API
(not a resource load), so the existing CSP permits it. The bundled libraries
must be pure JS with no WASM, no `eval`, and no dynamic import, so
`script-src 'unsafe-inline'` continues to cover everything and no CSP
directive changes.

### Data model (schema version 3, forward-only) — `src/vault.ts`

Bump `SCHEMA_VERSION` from 2 to 3. Add a `Sealed` type and make `sealed`
optional on `Entry`:

```ts
export type Sealed = {
  iv: string;         // base64, 12-byte AES-GCM nonce, fresh per seal
  ciphertext: string; // base64, AES-GCM output including the auth tag
  keyHint: string;    // parent-chosen reminder, plaintext (the only human label)
  sealedAt: string;   // ISO
};

export type Entry = {
  id: string;
  type: "letter";
  createdAt: string;      // ISO, kept in plaintext for ordering
  occasion: string;       // "" on a sealed entry
  title: string;          // "" on a sealed entry
  body: string;           // "" on a sealed entry
  photos: Photo[];        // [] on a sealed entry
  sealed?: Sealed;        // NEW: present iff the entry is sealed
  [extra: string]: unknown;
};
```

An entry is sealed **iff** `sealed` is present. By construction a sealed entry
carries empty content fields (`occasion`/`title`/`body` are `""`, `photos` is
`[]`) plus the `sealed` blob, so the existing `validateEntry` type checks
still pass with no relaxation.

- `emptyVault()` returns `schemaVersion: SCHEMA_VERSION` (now 3); no other
  vault-level change.
- **Migration.** Extend `migrate(raw)` to run the chain sequentially:
  ```ts
  if (data.schemaVersion === 1) data = migrateV1toV2(data);
  if (data.schemaVersion === 2) data = migrateV2toV3(data);
  ```
  `migrateV2toV3(data)` returns `{ ...data, schemaVersion: 3 }`. A v2 vault has
  no sealed entries, so no entry rewrite is needed; the version bump is the
  point. Keep the existing guards: `schemaVersion < 1` throws; a
  `schemaVersion` greater than the known `SCHEMA_VERSION` (now 3) yields the
  designed "newer-version" error state, unchanged. This is the trust-preserving
  choice: a file carrying sealed letters, if ever opened by an older shell,
  hits the clear "open with your newest copy" surface instead of silently
  showing a sealed entry as a blank letter.
- **Defensive validation.** Add `validateSealed(value)`: require object with
  string `iv`, string `ciphertext`, string `keyHint`, string `sealedAt`; a
  malformed sealed blob throws `VaultParseError` (the designed error state),
  never a silent drop and never a crash. In `validateEntry`, when `sealed` is
  present and not `null`, validate it with `validateSealed` and keep the
  object (so unknown extra fields on `sealed` survive, like every other
  unknown field). Content-field validation is unchanged.
- Unknown-field preservation and newer-than-known behaviour are unchanged from
  EPIC 1/2.

### Serialization key order (`src/template.ts`)

Byte-stability must survive the new field. Update `orderEntry`'s known key
order to include `sealed` in a fixed final position, and add an `orderSealed`
helper mapped over the entry's `sealed` when present:

```
orderEntry:  ["id", "type", "createdAt", "occasion", "title", "body", "photos", "sealed"]
orderSealed: ["iv", "ciphertext", "keyHint", "sealedAt"]
```

Mirror how `orderPhoto` is applied to `photos` today: after ordering the
entry, if `out.sealed` is an object, replace it with `orderSealed(out.sealed)`.
Base64 (`[A-Za-z0-9+/=]`) contains no `<`, so `escapeForScript` is a no-op on
`iv`/`ciphertext` and the round-trip stays lossless and byte-stable. Head/tail
capture and the byte-stability guarantee are unchanged.

### Crypto and encoding modules (new)

Keep three small, boring, single-purpose modules. Split pure encoding (unit
testable) from browser-only decode (e2e). The seal/unseal round-trip itself is
unit-testable because Node 22 exposes `globalThis.crypto.subtle`; write those
tests against Node's WebCrypto so the crypto is proven without a browser, then
prove the `file://` end-to-end path in e2e.

**`src/mnemonic.ts` — 24-word encoding (BIP39).**
- Use `@scure/bip39` with its bundled English wordlist. It is audited,
  dependency-light (`@noble/hashes`, `@scure/base`), pure JS, no Buffer, no
  WASM, and works in both Node and the browser. Do not hand-roll BIP39.
- `bytesToWords(bytes: Uint8Array): string[]` — 32 bytes (256 bits) →
  `entropyToMnemonic` → exactly 24 words. The final word carries the BIP39
  checksum, which is what lets a mistyped word be caught before any decryption
  attempt.
- `wordsToBytes(words: string[]): Uint8Array` — normalize (trim, lowercase,
  collapse internal whitespace, join with single spaces), validate with the
  wordlist + checksum, and return the 32 entropy bytes. Throw a typed error
  (see `UnsealError` below, reason `"bad-words"`) on any unknown word, wrong
  word count, or checksum mismatch.

**`src/seal.ts` — key generation, AES-GCM, orchestration.**
- Reuse `@scure/base`'s base64 for `bytes <-> base64` (avoids `btoa`/`atob`
  latin1 pitfalls on binary), or a small explicit helper. Pick one, keep it
  consistent.
- Types: `SealedPayload = { occasion: string; title: string; body: string;
  photos: Photo[] }` (exactly the content stripped from a sealed entry).
- `sealingAvailable(): boolean` — as above.
- `async seal(payload: SealedPayload, keyHint: string, sealedAtIso: string):
  Promise<{ sealed: Sealed; words: string[] }>`:
  1. Generate 32 random key bytes via `crypto.getRandomValues`.
  2. Import as an AES-GCM `CryptoKey` (`crypto.subtle.importKey`).
  3. Generate a fresh 12-byte `iv` via `getRandomValues`.
  4. Encrypt `TextEncoder().encode(JSON.stringify(payload))` with
     `crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)`.
  5. Return `sealed = { iv: b64(iv), ciphertext: b64(ct), keyHint,
     sealedAt: sealedAtIso }` and `words = bytesToWords(keyBytes)`.
  The raw key bytes and words are returned to the caller for the key sheet and
  then discarded; they are never put on the `sealed` blob or in the vault.
- `async unsealWithWords(sealed: Sealed, words: string[]):
  Promise<SealedPayload>`:
  1. `keyBytes = wordsToBytes(words)` (throws `UnsealError "bad-words"` on a
     bad checksum/word — caught before touching crypto).
  2. Import key, decrypt `base64->bytes(sealed.ciphertext)` with
     `iv = base64->bytes(sealed.iv)`. A decrypt failure (wrong key, tampered
     ciphertext) rejects; convert it to `UnsealError "wrong-key"`.
  3. `JSON.parse(TextDecoder().decode(plaintext))` → `SealedPayload`.
- `class UnsealError extends Error { reason: "bad-words" | "wrong-key" }`.
  Unsealing is a pure read: it takes the `sealed` blob and words, and returns
  or throws. It never touches the vault, so a failure cannot corrupt anything.

**`src/qr.ts` — QR encode (print) and decode (unseal).**
- Encode: use `qrcode-generator` (tiny, pure JS) to build the module matrix,
  then render an **inline SVG** string (crisp for print, no `data:` needed, no
  network). `qrSvg(text: string): string` is deterministic and unit-testable.
  The QR payload is the **24-word mnemonic string** (space-separated), so both
  unseal paths converge on one decode: words. A 24-word phrase (~180 chars)
  fits comfortably in a printable QR at a medium error-correction level.
- Decode: use `jsQR` (pure JS, `ImageData` in → `{ data }` out, no WASM, no
  network). `async decodeQrFromFile(file: File): Promise<string>`: draw the
  chosen image onto a `<canvas>` (via `createImageBitmap(file)`, falling back
  to `Image` + `URL.createObjectURL`), read `ImageData`, run `jsQR`, and return
  the decoded text. Throw a typed `QrDecodeError` when no code is found. The
  caller then feeds the decoded words to `unsealWithWords`, so the QR path and
  the typed-words path share exactly one decryption code path.
- All local: canvas and `createImageBitmap` make no network request; the CSP
  already permits `img-src data: blob:` for the object URL.

### Entry helpers (`src/entries.ts`)

Add pure, unit-tested helpers next to `sortedEntries`/`foldDraft`:
- `isSealed(entry: Entry): boolean` — `entry.sealed != null`.
- `unsealedEntries(entries: Entry[]): Entry[]` — the book-facing selection
  that excludes sealed entries. The book (EPIC 4) will consume this; here it
  proves AC6's "excluded from the book" as a tested predicate. Do not build a
  book view.
- `foldSealed(vault, sealed: Sealed, editingId: string | null, newId: string,
  createdAt: string): { next: Vault; entryId: string }` — mirror `foldDraft`:
  when `editingId` is set, replace that entry in place with a sealed entry that
  keeps its `id`/`type`/`createdAt` but has empty content fields plus the
  `sealed` blob, leaving every other entry untouched; otherwise prepend a new
  sealed entry (`{ id: newId, type: "letter", createdAt, occasion: "",
  title: "", body: "", photos: [], sealed }`). Pure: the caller supplies id and
  timestamp.

### App flow (`src/ui/App.tsx`)

Extend the existing controller; keep its save orchestration intact.

- **Routes.** Add an `"unseal"` route alongside `"home"` and `"editor"`.
  `openEntry(id)` branches: if the entry `isSealed`, route to `"unseal"` with
  that entry; otherwise load it into the editor as today.
- **Seal flow (`runSeal(keyHint)`), the trust-critical path:**
  1. Build `SealedPayload` from the current draft `{ occasion, title, body,
     photos }`.
  2. `const { sealed, words } = await seal(payload, keyHint, now.toISOString())`
     (show the "Sealing your letter" state during this).
  3. `const { next, entryId } = foldSealed(vault, sealed, editingId,
     randomId(), now.toISOString())`.
  4. Save via the existing controller (`controller.save(next)`), reusing
     `applyResult` and the stale-copy dialog exactly as the normal save does.
  5. **Only on `status: "saved"`** commit the sealed vault to state and show
     the key sheet with `words` + `keyHint`. On `stale`, resolve through the
     existing stale dialog and reveal the key sheet only after the replace
     save resolves to `saved` (hold `words` in memory across the prompt). On
     `cancelled` / `error`, **discard `words`, keep the original unsealed vault
     and the draft untouched**, and show the plain "Sealing did not finish.
     Your letter is unchanged." message. The letter is never lost to a failed
     seal.
  6. When the parent dismisses the key sheet ("I have saved the key"), clear
     `words` from state and return to the archive. The words are now gone from
     memory and were never in the vault.
- **Unseal flow.** The unseal view (below) calls back with either typed words
  or a chosen QR image. App decrypts via `unsealWithWords` /
  `decodeQrFromFile` + `unsealWithWords`, holds the revealed `SealedPayload` in
  local state for display only, and never calls `setVault` or save. On
  `UnsealError` / `QrDecodeError`, set a calm message; the vault is untouched
  by construction.
- Never `console.log` `words`, key bytes, ciphertext, or any payload field.

### Editor (`src/ui/Editor.tsx`)

- Add a **subordinate** "Seal this letter" control (a secondary/tertiary
  button, visibly below and lighter than Save). It is enabled only when
  `canSave` is true (there is content to seal), `sealingAvailable()` is true,
  and no photo is processing and no save is in flight. When sealing is
  unavailable, disable it and show the plain "This browser cannot seal
  letters" message.
- Clicking it opens the **Seal dialog**; it does not itself encrypt.
- The editor never opens a sealed entry (App routes those to unseal), so no
  "edit a sealed letter" state exists.

### Seal dialog (`src/ui/SealDialog.tsx`, new)

Model on `StaleCopyDialog` (backdrop + `role="alertdialog"`, `aria-modal`,
labelled title/body, focus trapped, Escape cancels).
- States plainly, before confirming: sealing locks the letter, only the
  printed key opens it, a lost key means it cannot be opened, and the book
  prints only unsealed letters.
- A labelled **key hint** text field with an example placeholder (the hint is
  stored in plaintext and printed on the key sheet; it must not be the
  answer/key itself, just a reminder of where the key lives).
- **Deliberate confirmation:** an acknowledgement checkbox ("I have a safe
  place for the key.") that must be checked to enable the confirm button. The
  confirm button ("Seal and show my key") is not the default-focused control
  and cannot be triggered by an outside click or Escape; only Cancel ("Keep it
  open") is reachable by Escape/backdrop. This satisfies "confirmation is
  deliberate, not a stray click."

### Key sheet (`src/ui/KeySheet.tsx`, new)

The once-shown surface after a saved seal.
- Heading, one short line that the key is not saved in the file and to print
  and keep this page, the parent's key hint, the **24 numbered words** in a
  readable grid, and the **QR** (inline SVG) with an accessible label.
- A "Print this key" button calling `window.print()`.
- A "I have saved the key" button that dismisses it (clearing `words`).
- **Print CSS** in `src/styles.css` (`@media print`): show only `.key-sheet`,
  hide app chrome (topbar, buttons that are not part of the sheet), fit on one
  page (`@page` margins; the 24 words + QR + hint fit comfortably). The QR
  must remain crisp and scannable in print. Verify one-page output.

### Unseal view (`src/ui/UnsealView.tsx`, new)

- Header naming the action and the entry's **key hint** ("Where the key
  lives: <keyHint>").
- **Type the words:** one labelled multiline input that accepts the 24 words
  space- or newline-separated (paste-friendly), with a live "<n> of 24 words"
  counter, and an "Open this letter" button. Normalize and validate on submit.
- **Use the QR:** an "Open with the QR photo" control backed by a hidden
  `<input type="file" accept="image/*" capture="environment">`. Selecting an
  image decodes the QR offline and runs the same unseal.
- **On success:** reveal the letter **read-only** (title, occasion, date, body
  with preserved line breaks, photos as images) with a plain note that the
  letter is open only on this screen and stays sealed in the file, and a
  "Close" back to the archive. Nothing is written back.
- **On failure:** a calm in-context message keyed to the reason (bad words vs
  wrong key vs unreadable QR). The vault is untouched.
- Immediate feedback ("Opening your letter") on submit.

### Archive home (`src/ui/Home.tsx`)

- Keep the integrity readout and the empty state exactly as shipped. Sealed
  entries still count toward the entry total (honest); no change to
  `formatEntryCount`.
- For each entry, branch on `isSealed`:
  - **Unsealed:** render exactly as today (thumbnail, title, occasion, date).
  - **Sealed:** render a **locked placeholder** row: a lock indicator (with an
    accessible label such as "Sealed"), the text "Sealed letter", the **key
    hint** in place of the occasion, and the date. No title, occasion, body,
    or photo is shown (there is none in the vault). The row stays a single
    tappable target that opens the unseal view. No leaked content, no broken
    image, no horizontal scroll at 390px.

### Sample / live demo (`src/sample.ts`)

- Add **one sealed placeholder entry** to `sampleVault()` so the demo archive
  shows the locked state at a glance (a real, small sealed blob: encrypt a
  short body with no photos using a throwaway key generated at authoring time,
  paste the resulting `iv`/`ciphertext`, and discard the key; `keyHint` such
  as the swept example below). Keep the unsealed sample letter so a reviewer
  can seal it live and reach the signature moment within a minute.
- The downloaded starter file is still the empty vault and never carries the
  sample (unchanged mechanism: `?demo=1` + empty vault only).
- Keep the sample small; the sealed blob must be tiny (short text, no photos).

### Files to touch (summary)
```
src/vault.ts          SCHEMA_VERSION=3; Sealed type; Entry.sealed?; migrate v2->v3;
                      validateSealed; extend validateEntry
src/template.ts       orderEntry key order += sealed; add orderSealed
src/seal.ts           NEW: sealingAvailable, seal(), unsealWithWords(), base64,
                      UnsealError, key gen + AES-GCM
src/mnemonic.ts       NEW: bytesToWords / wordsToBytes via @scure/bip39
src/qr.ts             NEW: qrSvg() encode + decodeQrFromFile() decode (jsQR)
src/entries.ts        add isSealed(), unsealedEntries(), foldSealed()
src/ui/App.tsx        seal flow (runSeal, discard-on-failure), unseal route, reveal
src/ui/Editor.tsx     subordinate "Seal this letter" control + availability gate
src/ui/SealDialog.tsx NEW: warning + key hint + deliberate confirm
src/ui/KeySheet.tsx   NEW: printable key sheet (24 words + QR + hint + print)
src/ui/UnsealView.tsx NEW: unseal (words + QR photo) + read-only reveal
src/ui/Home.tsx       sealed entries render as locked placeholders (hint, date)
src/styles.css        seal dialog, key sheet + print CSS, unseal, sealed row, words grid
src/sample.ts         one small sealed placeholder entry for the demo
package.json          add @scure/bip39, qrcode-generator, jsqr (bundled runtime deps)
README.md             module list; one line on sealing; keep commands accurate
tests/unit/...        seal/unseal, mnemonic, vault v3, serialize, entry seal helpers, qr encode
tests/e2e/...         seal->save->reopen->unseal (words + QR), no-plaintext, zero-network,
                      dialog deliberateness, key sheet print, wrong key, mobile
```
Do NOT touch `index.html`, the CSP, `src/save/`, `scripts/`, the Dockerfile,
or the staging compose file. The spine and the save mechanism are done; a
sealed vault rides through `serialize`/`save` unchanged.

---

## Example copy (ships verbatim downstream; already copy-swept)

- Editor seal control: `Seal this letter`
- Seal control disabled note (no crypto): `This browser cannot seal letters. Open your file in an up-to-date browser to seal it.`
- Seal dialog title: `Seal this letter?`
- Seal dialog body: `Sealing locks this letter. Only the printed key opens it. A lost key means this letter cannot be opened, and the book prints only unsealed letters.`
- Key hint field label: `Where will you keep the key?`
- Key hint placeholder (example, not instruction): `In your 18th birthday card`
- Acknowledgement checkbox: `I have a safe place for the key.`
- Confirm button: `Seal and show my key`
- Cancel button: `Keep it open`
- Sealing progress (inline): `Sealing your letter`
- Seal failed (save cancelled or errored): `Sealing did not finish. Your letter is unchanged.`
- Key sheet heading: `Your key for this letter`
- Key sheet note: `Print this page and keep it safe. This key is not saved in your file.`
- Key sheet hint line: `Where the key lives: <keyHint>`
- Key sheet words label: `Your 24 words`
- Key sheet QR label: `Or scan this code`
- Print button: `Print this key`
- Dismiss button: `I have saved the key`
- Archive sealed row: `Sealed letter` with the key hint shown in place of the occasion; lock accessible label `Sealed`
- Unseal heading: `Open a sealed letter`
- Unseal hint line: `Where the key lives: <keyHint>`
- Word entry label: `Type your 24 words`
- Word entry placeholder: `Type or paste the 24 words from your key sheet`
- Word count: `<n> of 24 words`
- Open button: `Open this letter`
- QR control: `Open with the QR photo`
- Opening progress (inline): `Opening your letter`
- Revealed letter note: `This letter is open only on this screen. It stays sealed in your file.`
- Close revealed: `Close`
- Bad-words error: `Those words do not match. Check each word and try again.`
- Wrong-key error: `That key does not open this letter. Check you have the right key sheet.`
- QR-not-found error: `The code did not scan. Try a clearer photo of your key sheet.`
- Demo sealed placeholder key hint: `In Mira's first birthday card`

Copy sweep for the strings above: no `—` or `–`; none of the banned
vocabulary ("seamlessly", "effortlessly", "unlock", "elevate", "empower",
"leverage", "robust", "dive in", and kin); error messages use positive,
direct phrasing that says what happened and what to do next; the
irreversibility statement is factual, not alarmist. The implementer repeats
this sweep over every string they add, including accessible labels,
placeholders, the demo hint, and README copy.

---

## Ordered task list (each with acceptance criteria)

Brackets map to the planner's acceptance criteria: [AC1] seal encrypts, strips
plaintext/photos, stores only iv/ciphertext/keyHint/sealedAt, no readable text;
[AC2] deliberate irreversibility warning; [AC3] printable one-page key sheet
with words + QR + hint; [AC4] cross-machine open via words and via QR; [AC5]
wrong/mistyped key fails calmly, never corrupts; [AC6] sealed archive
placeholders with key hint, excluded from the book.

1. **Schema v3: model, migration, defensive parse.** [AC1, AC6]
   - `SCHEMA_VERSION = 3`; `Sealed` type; `Entry.sealed?`. `emptyVault()` still
     valid at v3.
   - `migrate` runs v1→v2→v3; `migrateV2toV3` only bumps the version. Guards
     unchanged: below-1 throws; above-3 yields the newer-version state.
   - `parseVault` validates `sealed` via `validateSealed` when present, turning
     a malformed sealed blob into the typed error state; unknown fields on
     `sealed` preserved.

2. **Byte-stable serialization with the sealed field.** [AC1]
   - `orderEntry` includes `sealed` in fixed final order; `orderSealed` fixes
     the blob's key order and is applied in `orderVault`/`orderEntry`.
   - `parseVault(serialize(v))` deep-equals `v` for vaults containing sealed
     entries; serializing twice is byte-identical; bytes outside the vault-data
     block are unchanged.

3. **Crypto + encoding modules.** [AC1, AC4, AC5]
   - `mnemonic`: `bytesToWords`/`wordsToBytes` round-trip for random 32-byte
     keys (exactly 24 words); a single altered/unknown word or wrong count
     fails via `UnsealError "bad-words"`; whitespace/case normalized.
   - `seal`: `seal()` produces a `Sealed` blob and 24 words;
     `unsealWithWords(sealed, words)` returns the exact `SealedPayload` (incl.
     photos); a valid-but-wrong mnemonic or tampered ciphertext fails via
     `UnsealError "wrong-key"`; inputs and any vault are untouched on failure.
   - `qr`: `qrSvg()` is deterministic and encodes the mnemonic; decode is
     covered by e2e. No network, no WASM, no eval.

4. **Entry seal helpers.** [AC1, AC6]
   - `isSealed`, `unsealedEntries` (excludes sealed), and `foldSealed` (in-place
     replace by id keeping `createdAt`, or prepend new; other entries and their
     photos untouched; content fields emptied; `sealed` set).

5. **Seal dialog + editor control + seal flow.** [AC1, AC2]
   - The editor's subordinate seal control opens a dialog that states the
     irreversibility and the book-only-unsealed fact before confirming, takes a
     key hint, and gates confirm behind a deliberate acknowledgement (not a
     stray click, not the default focus, not triggerable by Escape/backdrop).
   - Confirming encrypts the draft, folds a sealed entry, and saves; the sealed
     vault is committed and the key sheet shown **only** after the save
     succeeds. A cancelled/errored save leaves the letter unsealed and intact
     with the plain "Sealing did not finish" message.
   - No key/words/ciphertext/content is ever logged.

6. **Key sheet (printable).** [AC3]
   - After a saved seal, the key sheet shows the chosen key hint, 24 numbered
     words, and a scannable QR, states the key is not saved in the file, and
     prints cleanly on one page with app chrome hidden. Dismissing it clears
     the words from memory.

7. **Unseal flow + archive placeholders.** [AC4, AC5, AC6]
   - A sealed entry in the archive is a locked placeholder showing its key hint
     and date, with no leaked content, and opens the unseal view.
   - The unseal view opens the letter from the typed 24 words, and separately
     from a photo of the QR, revealing it read-only in memory without writing
     back. A wrong or mistyped key (bad words or wrong key or unreadable QR)
     shows the calm keyed message and leaves the vault untouched.

8. **Mobile, accessibility, copy sweep, demo, docs.** [AC2, AC4, quality §2/§6/§8/§9]
   - Seal dialog, key sheet, unseal view, and revealed letter are fully usable
     at 390px: no horizontal scroll, ~44px targets, readable text.
   - Dialog roles/focus management correct; every input labelled; QR has an
     accessible label with the 24 words as the readable key; focus states
     visible; keyboard reaches every control including Print.
   - Mechanical copy sweep over every new/changed string (and the demo hint)
     passes.
   - The demo sample carries one sealed placeholder so the locked state is
     visible within a minute; the downloaded starter file stays empty.
   - README module list and the one sealing line are accurate; commands still
     correct.

---

## Test plan (automated tests prove each criterion)

**Unit / integration (Vitest; Node WebCrypto available):**
- **Migration & parse:** a v1 and a v2 vault migrate to v3 (version bumped,
  entries intact); a v3 vault with a sealed entry parses; a malformed `sealed`
  blob (missing `iv`, non-string `ciphertext`) yields `VaultParseError`; a
  `schemaVersion` of 4 yields the newer-version state; unknown fields on
  `sealed` preserved. [AC1, AC6]
- **Serialize round-trip & byte-stability:** `parseVault(serialize(v))`
  deep-equals `v` for vaults with sealed entries; `serialize(v)` twice is
  identical; `orderSealed` fixes key order; head/tail bytes unchanged when only
  entries differ. [AC1]
- **Mnemonic:** `bytesToWords`/`wordsToBytes` round-trip over many random
  32-byte keys (always 24 words); a one-word alteration, an unknown word, and a
  wrong word count each throw `UnsealError "bad-words"`; case/whitespace
  normalized. [AC4, AC5]
- **Seal/unseal round-trip:** `seal()` then `unsealWithWords()` returns the
  exact payload including photos and unicode/newlines in the body; a different
  valid mnemonic and a byte-flipped ciphertext each throw `UnsealError
  "wrong-key"`; the `sealed` blob contains only `iv`/`ciphertext`/`keyHint`/
  `sealedAt` and no plaintext substring of the payload. [AC1, AC5]
- **Entry seal helpers:** `foldSealed` empties content and sets `sealed` on the
  target entry, keeps `createdAt`, and leaves other entries and their photos
  byte-identical; `isSealed` and `unsealedEntries` (book exclusion) correct.
  [AC1, AC6]
- **QR encode:** `qrSvg` returns a stable, non-empty SVG for a known mnemonic
  (deterministic). [AC3, AC4]

**End-to-end (Playwright, real browser, loaded from `file://`):**
- **Seal round-trip, cross-machine, words path:** write a letter with a photo,
  seal it (acknowledge, confirm), capture the 24 words from the key sheet, save
  (download path on WebKit/Firefox), open the saved file in a **fresh browser
  context** (a different machine), confirm the archive shows a locked
  placeholder with the key hint and no leaked title, open it, type the captured
  words, and assert the letter body, title, and photo are revealed. [AC1, AC4]
- **Cross-machine, QR path:** in the page, render the captured mnemonic to a QR
  image using the bundled encoder (canvas → PNG), feed it to the unseal QR file
  input on the reopened file, and assert the same reveal. [AC4]
- **No readable plaintext in the file:** after sealing, read the saved
  vault-data JSON and assert the sealed entry has empty content fields plus
  only `iv`/`ciphertext`/`keyHint`/`sealedAt`, and that the letter's title and
  body strings do not appear anywhere in the JSON. [AC1]
- **Zero network on seal and unseal:** with request interception, seal a letter
  and unseal it (words and QR) and assert no network request occurs at any
  point; the artifact source still contains no external URL. [AC1, quality §5]
- **Deliberate warning:** the seal dialog shows the lost-key statement and the
  book-only-unsealed statement, the confirm button is disabled until the
  acknowledgement is checked, and Escape/backdrop cancels rather than confirms.
  [AC2]
- **Key sheet, one page + hint:** the key sheet shows the chosen key hint, 24
  words, and the QR; under print emulation (`emulateMedia({ media: "print" })`)
  the app chrome is hidden, the key sheet is visible, and its content fits one
  page. [AC3]
- **Seal does not lose the letter:** trigger a cancelled save during a seal and
  assert the letter is still present and unsealed and the "Sealing did not
  finish" message shows; the file on disk is unchanged. [AC1, differentiator]
- **Wrong / mistyped key:** on a sealed entry, enter altered words (bad
  checksum) and assert the calm bad-words message with no reveal; enter a
  different valid mnemonic and assert the wrong-key message; feed an image with
  no QR and assert the QR-not-found message. In every case assert the saved
  file and the sealed entry are unchanged. [AC5]
- **Archive placeholder + book exclusion:** the sealed row shows "Sealed" and
  the key hint and no title/photo; the `unsealedEntries` selection excludes it
  (unit-covered) and the archive shows the sealed entry only as a locked
  placeholder. [AC6]
- **Mobile 390px:** seal dialog, key sheet (words + QR), unseal entry, and the
  revealed letter render with no horizontal scroll and tappable targets at a
  390px viewport. [quality §2]

**Copy sweep (mechanical, part of done):** grep every user-visible string in
the seal dialog, key sheet, unseal view, archive placeholder, accessible
labels, the demo sealed hint, and any README copy for the characters `—` and
`–`, the banned vocabulary, and negative empty-state phrasing ("You don't
have", "No ... yet", "Nothing ... here", "Unable to", "Something went wrong").
Every hit in a shipped string is a defect to fix in the same run. [quality §8]

---

## Risks and notes for the implementer
- **A failed seal must never lose the letter.** This is the cardinal sin here.
  Commit the sealed vault and reveal the key sheet only after the save resolves
  to `saved`; on any other outcome keep the unsealed letter and draft intact.
  Prove it with the cancelled-save e2e.
- **The key is shown once and is never in the file.** Do not store the words or
  key bytes in the vault, do not cache them, do not log them. The key sheet is
  the only moment they exist for the parent. Say so on the sheet.
- **`crypto.subtle` on `file://` is the load-bearing assumption.** Run the
  seal/unseal e2e from `file://` on all three engines. If any target engine
  lacks it there, block with a precise question rather than bundling a JS
  fallback.
- **Byte-stability breaks silently** if `sealed` is added without fixing the
  key order. Update `orderEntry` and add `orderSealed`, and keep the
  byte-stability test green.
- **One decrypt path for both unseal routes.** The QR encodes the 24 words, so
  scanning and typing both feed `unsealWithWords`. Do not build a second
  key-decoding path for the QR.
- **Keep the dependencies pure JS.** `@scure/bip39`, `qrcode-generator`, and
  `jsQR` must add no network call, no WASM, and no `eval`, so the CSP stays
  untouched and the zero-network guarantee holds. Verify with the zero-network
  e2e.
- **Do not cross EPIC boundaries.** No book view, no interview, no walkthrough,
  no key escrow, no passphrase-derived keys, no reseal-on-close, no live-camera
  scanning, no change to the save mechanism, CSP, or deploy. If the quality bar
  seems to demand one of these, block with a precise question rather than
  building it.

---

## Notes on this spec's provenance
Built by expanding the planner's authoritative scope for EPIC 3 against the
shipped EPIC 1 + EPIC 2 codebase (the single-file artifact, `vault.ts`,
`template.ts`, `entries.ts`, `photos.ts`, `save/`, and the Preact UI). Concrete
choices the implementer can execute directly: schema bump to v3 with an
optional `sealed` blob; AES-GCM with a random 256-bit key and a 12-byte IV;
the key encoded as 24 BIP39 words carried by the QR so both unseal paths share
one decryption; `@scure/bip39` + `qrcode-generator` + `jsQR` as pure-JS bundled
libraries; and the QR "scan" implemented as offline image decode (with mobile
`capture`) rather than a live camera, for testability and bundle discipline.
No DEPLOY / STAGING DEPLOY CONTRACT block was present in this task's context,
and this EPIC does not change the deploy.
