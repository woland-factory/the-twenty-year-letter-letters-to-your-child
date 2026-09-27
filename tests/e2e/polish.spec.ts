import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  ARTIFACT_PATH,
  ARTIFACT_URL,
  MOCK_FSA,
  VALID_JPEG_DATA_URL,
  writeSeededArtifact,
} from "./helpers";

// A polish audit against the quality bar: one h1 per route, landmarks on the
// boot error, lazy archive thumbnails, a non-blank large-vault open, the seal
// warning read as a warning, and immediate save/seal feedback.

// A sealed letter fixture (the same real ciphertext the book suite uses), so a
// sealed entry can be seeded without running the seal path.
const SEALED_ENTRY = {
  id: "sealed-1",
  type: "letter",
  createdAt: "2026-03-14T09:00:00.000Z",
  occasion: "",
  title: "",
  body: "",
  photos: [],
  sealed: {
    iv: "U2fTvI4/n2MwNKVE",
    ciphertext: "+8VDyPyGfLUQdFzrVpv93i9w1+QlyfOMRzDGSR6JLolZ3a7tOrWgjICeFqsYwbz5o9Lnpgf",
    keyHint: "In the birthday card",
    sealedAt: "2026-03-14T09:00:00.000Z",
  },
};

function letter(id: string, title: string, withPhoto = false) {
  return {
    id,
    type: "letter",
    createdAt: "2026-02-01T09:00:00.000Z",
    occasion: "First birthday",
    title,
    body: "A short letter to you.",
    photos: withPhoto
      ? [{ id: `${id}-p`, dataUrl: VALID_JPEG_DATA_URL, caption: "", w: 160, h: 108, bytes: 1617 }]
      : [],
  };
}

function seed(extra: Record<string, unknown>, entries: unknown[]): Record<string, unknown> {
  return {
    schemaVersion: 4,
    generation: 2,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "seed-polish",
    child: null,
    firstRunDone: true,
    entries,
    ...extra,
  };
}

function countMainH1(page: Page) {
  return page.locator("main h1").count();
}

test("every route renders exactly one h1 inside its main landmark", async ({ page }) => {
  // Empty archive: the visible "Write your first letter." heading.
  await page.goto(writeSeededArtifact(seed({}, []), "h1-empty"));
  await expect(page.getByRole("heading", { name: "Write your first letter." })).toBeVisible();
  expect(await countMainH1(page), "empty archive").toBe(1);

  // Editor.
  await page.getByRole("button", { name: "Write a letter" }).click();
  await expect(page.getByRole("heading", { name: "Write a letter" })).toBeVisible();
  expect(await countMainH1(page), "editor").toBe(1);

  // Populated archive: the single h1 is the screen-reader "Your letters".
  await page.goto(writeSeededArtifact(seed({}, [letter("l1", "A letter")]), "h1-populated"));
  await expect(page.getByRole("heading", { name: "Your letters" })).toBeAttached();
  expect(await countMainH1(page), "populated archive").toBe(1);

  // Interview capture step (no birth date known).
  await page.getByRole("button", { name: "Record an interview" }).click();
  await expect(
    page.getByRole("heading", { name: "First, your child's birth date." }),
  ).toBeVisible();
  expect(await countMainH1(page), "interview capture").toBe(1);

  // Interview prompt form (birth date known).
  await page.goto(
    writeSeededArtifact(
      seed({ child: { name: "Mira", birthDate: "2020-01-08" } }, [letter("l1", "A letter")]),
      "h1-interview-form",
    ),
  );
  await page.getByRole("button", { name: "Record an interview" }).click();
  await expect(page.getByRole("heading", { name: /Interview at age/ })).toBeVisible();
  expect(await countMainH1(page), "interview form").toBe(1);

  // Book, empty (only a sealed entry, so nothing typesets).
  await page.goto(writeSeededArtifact(seed({}, [SEALED_ENTRY]), "h1-book-empty"));
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.getByRole("heading", { name: "Your book fills as you write." })).toBeVisible();
  expect(await countMainH1(page), "book empty").toBe(1);

  // Book, typeset.
  await page.goto(
    writeSeededArtifact(
      seed({ child: { name: "Mira", birthDate: "2020-01-08" } }, [letter("l1", "One year of you")]),
      "h1-book-typeset",
    ),
  );
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.getByRole("heading", { name: "Letters to Mira" })).toBeVisible();
  expect(await countMainH1(page), "book typeset").toBe(1);

  // Sealed-letter entry form.
  await page.goto(writeSeededArtifact(seed({}, [SEALED_ENTRY]), "h1-unseal"));
  await page.getByRole("button", { name: /Sealed letter/ }).click();
  await expect(page.getByRole("heading", { name: "Open a sealed letter" })).toBeVisible();
  expect(await countMainH1(page), "sealed entry form").toBe(1);
});

test("the boot error screen sits in a main landmark and speaks in the product voice", async ({
  page,
}) => {
  const html = readFileSync(ARTIFACT_PATH, "utf8");
  const corrupted = html.replace(
    /(<script id="vault-data"[^>]*>)\{"schemaVersion[\s\S]*?(<\/script>)/,
    "$1{ this is not valid json $2",
  );
  if (corrupted === html) throw new Error("corruption did not apply");
  const badPath = join(tmpdir(), `tyl-polish-corrupt-${Date.now()}.html`);
  writeFileSync(badPath, corrupted);

  await page.goto(pathToFileURL(badPath).href);

  // The heading is inside a real main landmark, matching every other view.
  const heading = page.locator("main h1");
  await expect(heading).toHaveText("We can't read the letters in this file.");
  await expect(page.locator("main .state-error")).toBeVisible();

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  expect(bodyText).not.toContain("stack");
  expect(bodyText).not.toContain("undefined");
});

test("the newer-version boot error is a designed message, not a crash", async ({ page }) => {
  // A schemaVersion above what this build understands triggers the newer-version
  // path. writeSeededArtifact swaps in the whole vault block.
  const url = writeSeededArtifact(
    { schemaVersion: 99, generation: 2, savedAt: null, fileId: "future", child: null, firstRunDone: true, entries: [] },
    "newer-version",
  );
  await page.goto(url);

  await expect(page.locator("main h1")).toHaveText("This file was saved by a newer version.");
  await expect(page.getByText(/Open it with your newest copy/)).toBeVisible();
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  expect(bodyText).not.toContain("stack");
  expect(bodyText).not.toContain("undefined");
});

test("archive thumbnails load lazily and decode asynchronously", async ({ page }) => {
  await page.goto(writeSeededArtifact(seed({}, [letter("l1", "A letter with a photo", true)]), "lazy"));
  const thumb = page.locator(".entry-thumb");
  await expect(thumb).toHaveAttribute("loading", "lazy");
  await expect(thumb).toHaveAttribute("decoding", "async");
});

test("a large vault opens without a blank screen and keeps its thumbnails lazy", async ({
  page,
}) => {
  const entries = Array.from({ length: 40 }, (_, i) => letter(`l${i}`, `Letter ${i}`, true));
  await page.goto(writeSeededArtifact(seed({}, entries), "large-vault"));

  // The app has mounted: real content shows and the boot skeleton is no longer
  // visible (it is hidden the moment content renders beside it).
  await expect(page.getByText(/40 letters\./)).toBeVisible();
  await expect(page.locator(".entry").first()).toBeVisible();
  await expect(page.locator(".boot")).toBeHidden();

  // Every archive thumbnail is lazy, including below-the-fold ones.
  const thumbs = page.locator(".entry-thumb");
  await expect(thumbs).toHaveCount(40);
  const lazyCount = await page.locator('.entry-thumb[loading="lazy"]').count();
  expect(lazyCount).toBe(40);
});

test("the seal consequence sentence is emphasized, not muted, and gated by the checkbox", async ({
  page,
}) => {
  await page.goto(ARTIFACT_URL);
  await page.getByRole("button", { name: "Write a letter" }).click();
  await page.getByLabel("Title").fill("A letter to seal");
  await page.getByLabel("Your letter").fill("The body.");

  await page.getByRole("button", { name: "Seal this letter" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();

  const body = page.locator("#seal-body");
  await expect(body).toHaveClass(/seal-warning/);

  // Its color is the full-strength ink, not the muted dialog color.
  const colors = await page.evaluate(() => {
    const el = document.querySelector("#seal-body") as HTMLElement;
    const probe = document.createElement("span");
    document.body.appendChild(probe);
    probe.style.color = "var(--ink)";
    const ink = getComputedStyle(probe).color;
    probe.style.color = "var(--ink-soft)";
    const soft = getComputedStyle(probe).color;
    probe.remove();
    return { actual: getComputedStyle(el).color, ink, soft };
  });
  expect(colors.actual).toBe(colors.ink);
  expect(colors.actual).not.toBe(colors.soft);

  // Sealing stays gated behind the acknowledgement checkbox.
  const confirm = page.getByRole("button", { name: "Seal and show my key" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("I have a safe place for the key.").check();
  await expect(confirm).toBeEnabled();
});

test.describe("immediate feedback on the Chromium save path", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one save path is enough");

  test("Save shows Saving at once, then confirms; Seal shows its progress", async ({ page }) => {
    // A deliberately slow write so the synchronous "Saving" state is observable;
    // the real save sets the state before awaiting, this just widens the window.
    await page.addInitScript(`
      window.__tylDisk = "";
      window.showSaveFilePicker = async () => ({
        getFile: async () => ({ text: async () => window.__tylDisk }),
        createWritable: async () => ({
          write: async (data) => { await new Promise((r) => setTimeout(r, 500)); window.__tylDisk = data; },
          close: async () => {},
        }),
      });
    `);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("Feedback");
    await page.getByLabel("Your letter").fill("Prove the pressed state.");

    const save = page.getByRole("button", { name: "Save" });
    await save.click();
    // The button flips to "Saving" and disables synchronously, before the write
    // resolves, then the calm confirmation lands.
    await expect(page.getByRole("button", { name: "Saving" })).toBeDisabled();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    // Start a seal: the progress readout shows while the sealed copy is written.
    await page.getByRole("button", { name: "Seal this letter" }).click();
    await page.getByLabel("I have a safe place for the key.").check();
    await page.getByRole("button", { name: "Seal and show my key" }).click();
    await expect(page.getByText("Sealing your letter")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toBeVisible();
  });

  test("a revealed letter has exactly one h1", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("Revealed");
    await page.getByLabel("Your letter").fill("Open me one day.");
    await page.getByRole("button", { name: "Seal this letter" }).click();
    await page.getByLabel("I have a safe place for the key.").check();
    await page.getByRole("button", { name: "Seal and show my key" }).click();
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toBeVisible();

    const words = await page.locator(".word-text").allInnerTexts();
    const savedHtml = await page.evaluate(
      () => (window as unknown as { __tylDisk: string }).__tylDisk,
    );
    await page.getByRole("button", { name: "I have saved the key" }).click();

    const path = join(tmpdir(), `tyl-polish-reveal-${Date.now()}.html`);
    writeFileSync(path, savedHtml);
    await page.goto(pathToFileURL(path).href);

    await page.getByRole("button", { name: /Sealed letter/ }).click();
    await page.getByLabel("Type your 24 words").fill(words.join(" "));
    await page.getByRole("button", { name: "Open this letter" }).click();
    await expect(page.getByText("Open me one day.")).toBeVisible();
    expect(await countMainH1(page)).toBe(1);
  });
});

test("a tapped archive row responds with a pressed transform", async ({ page }) => {
  await page.goto(writeSeededArtifact(seed({}, [letter("l1", "A letter")]), "entry-press"));
  const hasActiveRule = await page.evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (
          rule instanceof CSSStyleRule &&
          rule.selectorText === ".entry:active" &&
          rule.style.transform !== ""
        ) {
          return true;
        }
      }
    }
    return false;
  });
  expect(hasActiveRule).toBe(true);
});
