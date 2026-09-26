# VALIDATION — The Twenty-Year Letter

**Verdict: VIABLE.**

## Core value proposition

A parent writes letters, adds photos, and records a yearly interview with
their growing child inside one self-contained HTML file that is both the
writing room and the archive. The file continuously typesets everything
into a printable book. Individual letters can be sealed with client-side
encryption whose key exists only as a printed paper artifact. Opening day
in 2044 needs no company, no server, no account, and no login: only the
family's own file and a slip of paper from a drawer. Every competing
product is a bet that a startup survives twenty years; this product
removes the bet.

## Why it clears the value tests

- **Would anyone's life be genuinely better?** Yes, and the evidence is
  unusually direct: parents are already building worse versions by hand
  (a father running a personal mail server to keep his child's letters
  safe). The wish is real, current tools betray it, and the failure mode
  of every alternative (provider death, Google's 2-year inactive-account
  deletion) is documented fact, not speculation.
- **Chatbot test:** passes trivially. There is no LLM in the core loop.
  The value is eighteen years of accumulated state, sealed ciphertext
  bound to physical keys, and a regenerating typeset book. A chat window
  structurally cannot hold any of it.
- **Free-tool test:** passes on the load-bearing half. Word docs in
  Dropbox keep text; they cannot express "sealed but carried," have no
  ritual engine, and produce no book. TiddlyWiki, the strongest free
  incumbent, encrypts only the whole file (per-entry sealing has been an
  open request since 2013) and demands tinkering the target parent will
  not do.
- **Durable artifact:** the artifact IS the product, in three layers:
  the file, the printable book, and the paper keys. Value compounds
  every year of use. This is the strongest compounding shape the
  ambition bar asks for.
- **Agent-deliverable at the quality bar:** yes. A static single-page
  artifact: Web Crypto AES-GCM, client-side image recompression, print
  CSS, no server, no accounts, no database, no moderation, no runtime
  LLM, near-zero running cost.
- **Signature moment:** sealing a letter and printing its paper key to
  tuck into a birthday card. Nameable in one sentence, reachable in the
  first fifteen minutes.

## Technical claim resolved during validation

The premortem asserted that `crypto.subtle` is unavailable on `file://`
pages, which would have gutted the sealing mechanic. This is false: the
Secure Contexts spec classifies the `file` scheme as a potentially
trustworthy origin, and MDN explicitly lists `file:///...html` as a
secure context, so the Web Crypto API is available in locally opened
files in the major browsers (verified 2026-09-26 against MDN). Cheap
insurance for odd embedded browsers is bundling a small audited JS
AES-GCM fallback; that is a planning decision, not a viability issue.

## Minimal feature set (the probe, nothing more)

1. **The writing room:** open the file in a browser, write a letter,
   attach photos (recompressed client-side against a hard size budget),
   save the file back to disk. Chromium gets in-place save via the File
   System Access API; everyone else gets a carefully designed
   download-and-replace ritual.
2. **The save ritual as a designed surface:** clear canonical-copy
   guidance, a visible "this file contains N letters, last saved <date>"
   integrity readout on open, and stale-copy detection. This is the
   probe's known friction hot-spot and must be treated as a core
   feature, not plumbing.
3. **The yearly interview:** a small, age-aware prompt pack (a finite
   corpus written once) that makes year seven's entry different from
   year two's.
4. **The book:** print-CSS typesetting of all unsealed content,
   regenerated on every save, so the family always owns a paper
   fallback.
5. **Sealed letters:** per-letter AES-GCM encryption in the browser,
   key rendered as a printable short word list plus QR, with the
   irreversibility warning stated plainly at sealing time, every time.
6. **First-run walkthrough** meeting the quality bar: guide a new parent
   through writing, saving, reopening, and sealing once.

Out of the minimal set: any server component, accounts, sync, mobile
apps, LLM prompt generation, multi-child support beyond trivial
labeling, and the Hundred-Year generational variant.

## Main risks

1. **Retention is the real bet.** A local file cannot nudge, and
   un-nudged memory keeping is the historically failing model. The
   strongest objection stands: the file may survive while the letters
   never get written. Mitigations exist and are local-first-compatible
   (an exportable yearly calendar reminder, the visibly growing book as
   its own motivator, a ritual anchored to birthdays rather than
   willpower), but this is a bet on behavior, not a solvable bug. It is
   also survivable: a family that writes five letters and stops still
   owns five letters, which beats every abandoned delivery-service
   account, and no competitor solves retention either.
2. **Save/reopen friction outside Chromium.** No browser lets a page
   silently overwrite the file it was opened from; Firefox and Safari
   force download-and-replace, which risks version litter and lost
   canonical copies. TiddlyWiki has fought this for twenty years. This
   is the single most likely place the probe fails and deserves the
   largest share of design effort.
3. **File growth vs. carryability.** Embedded photos push toward
   hundreds of megabytes over eighteen years unless recompression is
   aggressive and budgeted. The plan must set a hard per-photo and
   whole-file budget and surface the running total to the user.
4. **A lost paper key is a permanently unopenable letter.** By design,
   but the family will remember it as the product's fault. The sealing
   flow must state it unmissably, and the unsealed book is the only
   fallback.
5. **Phone/desktop mismatch.** Photos and spare minutes live on phones;
   a file-as-app lives most comfortably on a desktop. An honest
   desktop-first MVP narrows the audience and the plan should say so
   rather than pretend otherwise.

## What would make me reject it

- Cold-hands testing showing the dossier's "premise false" outcome:
  non-technical parents losing the canonical file, or refusing the seal
  as too frightening. Either kills the whole vision cheaply.
- Any drift toward a companion server, sync service, or reminder
  backend "just for retention." That rebuilds the twenty-year custody
  bet the product exists to remove; if the team cannot hold that line,
  the product has no reason to exist.
- Discovery that per-letter Web Crypto sealing cannot be made to work
  in a self-contained file across the major browsers. Checked during
  this validation: it can.
- The probe artifact failing its own round-trip (write, save, reopen,
  unseal on a different offline machine). That is the entire promise;
  if agents cannot make it robust, ship nothing.

## Verdict, restated bluntly

The skeptic's 0.8 kill probability is priced against market success,
which is not the factory's bar. Against the factory's actual bar,
durable user value, originality, and honest substance, this is one of
the strongest shapes available: evidence-backed wish, a signature
mechanic no free tool has, a triple-layered artifact the family keeps
forever, zero running cost, and full agent-buildability in one pass.
The two real risks (retention, save friction) are design problems to
attack, not reasons to refuse. Build it.
