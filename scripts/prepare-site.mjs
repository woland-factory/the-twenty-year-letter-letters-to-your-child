// Assembles the distribution site into site/dist from the built artifact and
// the landing template. Reads site-only env (SEED_DEMO, UMAMI_*, SENTRY_DSN)
// and wires it into the landing page ONLY. The artifact bytes are copied
// untouched, so a family's file never carries analytics, error tracking, or a
// demo flag.

import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Pure landing-page assembly: wire site-only env into the template. Exported so
// the wiring is unit-tested without touching the filesystem.
export function renderLanding(template, env) {
  const seedDemo = /^(1|true|yes)$/i.test(env.SEED_DEMO ?? "");
  const umamiUrl = env.UMAMI_URL ?? "";
  const umamiId = env.UMAMI_WEBSITE_ID ?? "";
  const sentryDsn = env.SENTRY_DSN ?? "";

  const headParts = [];
  if (umamiUrl && umamiId) {
    headParts.push(
      `<script defer src="${escapeAttr(umamiUrl)}" data-website-id="${escapeAttr(umamiId)}"></script>`,
    );
  }
  if (sentryDsn) {
    headParts.push(`<meta name="sentry-dsn" content="${escapeAttr(sentryDsn)}" />`);
  }

  return template
    .replace("<!--TYL:SITE-HEAD-->", headParts.join("\n    "))
    .replace("<!--TYL:DEMO-QUERY-->", seedDemo ? "?demo=1" : "");
}

// When imported (tests), skip the build side effects.
if (process.argv[1] !== fileURLToPath(import.meta.url)) {
  // module import: expose helpers only
} else {
  assembleSite();
}

function assembleSite() {
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifact = join(root, "dist", "index.html");
const siteSrc = join(root, "site");
const outDir = join(root, "site", "dist");

if (!existsSync(artifact)) {
  console.error("Build the artifact first: dist/index.html is missing.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// The downloadable and live file are the same built artifact. It is always the
// empty starter; the demo only ever affects the live LINK, never the bytes.
copyFileSync(artifact, join(outDir, "the-twenty-year-letter.html"));
copyFileSync(join(siteSrc, "styles.css"), join(outDir, "styles.css"));

  const template = readFileSync(join(siteSrc, "index.html"), "utf8");
  const html = renderLanding(template, process.env);
  writeFileSync(join(outDir, "index.html"), html);

  const seedDemo = /^(1|true|yes)$/i.test(process.env.SEED_DEMO ?? "");
  console.log(`Site assembled in site/dist (demo=${seedDemo}).`);
}
