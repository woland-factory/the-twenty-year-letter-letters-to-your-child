# The Twenty-Year Letter

Write letters to your child and keep them in one HTML file you own. The file is
both the writing room and the archive: it opens in any browser, with no account
and no server, and it still opens years from now from a folder and a browser.
You keep the file, so you keep the backups. That is the point.

This repository holds two things: the **artifact** (the single self-contained
HTML file a family saves and reopens) and a small **distribution site** that
explains the product and lets someone download their own empty starter file or
try a live copy.

## What makes it different

- **One file, no company to outlive.** All the code, styles, letters, and the
  archive live inside a single `.html` file. Open it from your own folder.
- **Zero network, by construction.** The artifact declares a strict
  Content-Security-Policy that forbids every network request. Nothing is ever
  loaded or sent. No analytics, no error tracking, no fonts, no calls home.
- **Saving is the point.** Every save ends in a plain confirmation that your
  file is up to date, and the file always shows which copy is the real one, so
  you never fear losing a letter.

## Run it

You need [Node.js](https://nodejs.org) 22+ and [Docker](https://www.docker.com)
for the container path.

```bash
git clone <this-repo-url>
cd the-twenty-year-letter-letters-to-your-child
cp .env.example .env      # optional; placeholders only, no secrets
npm install
```

### Develop the artifact

```bash
npm run dev               # Vite dev server with hot reload
```

### Build the artifact and the site

```bash
npm run build             # type-check, build dist/index.html, assemble site/dist
```

`dist/index.html` is the standalone artifact. `site/dist` is the landing page
plus a copy of the artifact.

### Serve the site locally

```bash
npm run build
npm start -- -p 3100      # serves site/dist on http://127.0.0.1:3100
```

### Run the site in Docker (the staging shape)

```bash
docker compose -f docker-compose.staging.yml up --build
```

The container serves the site on port 80. Set `SEED_DEMO=1` (already set in the
staging compose) to make the "try it live" link load one sample letter so you
see real content without typing. `UMAMI_URL`, `UMAMI_WEBSITE_ID`, and
`SENTRY_DSN`, when provided, wire analytics and error tracking into the landing
page **only**. The artifact a family saves never contains any of them.

## Test

```bash
npm test                  # unit and integration tests (Vitest)
bash scripts/e2e.sh       # end-to-end tests (Playwright, in the pinned container)
```

The end-to-end suite runs inside the official Playwright container so browser
builds match the pinned version. It builds a production copy of the site, serves
it on a run-scoped port, and covers both save paths, the zero-network guarantee,
stale-copy protection, the designed states, mobile layout, and the site. The app
has no database, so each run is self-contained with nothing to clean up between
runs.

### One manual check

The Chromium in-place save uses the browser file picker, which cannot be fully
automated. To verify it by hand: build the artifact, double-click
`dist/index.html` in Chrome, write a letter, press Save, choose where to keep
the file, then reopen that file. Your letter and the correct copy number should
be there.

## Where the code lives

```
index.html            artifact shell: CSP, mount root, vault-data markers
src/
  main.tsx            entry: capture the template, parse the vault, mount
  vault.ts            data model, defensive parsing, forward-only migration
  template.ts         self-carrying serialize (byte-stable app code)
  save/               capability detection, both save paths, generation logic
  ui/                 Preact components: home, editor, save states, dialogs
site/                 landing page and its assembler
scripts/              site build, static server, e2e wrapper, container entry
tests/unit            Vitest unit and integration tests
tests/e2e             Playwright end-to-end tests
```

## Contribute

Fork the repo, make your change with a matching test, and confirm both
`npm test` and `bash scripts/e2e.sh` pass before opening a pull request. Keep the
artifact small and boring: it needs to open in a browser two decades from now.

## License

MIT. See [LICENSE](LICENSE).
