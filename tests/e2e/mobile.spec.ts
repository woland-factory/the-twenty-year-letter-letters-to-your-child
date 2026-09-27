import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ARTIFACT_URL,
  MOCK_FSA,
  VALID_JPEG_DATA_URL,
  attachGeneratedImage,
  writeSeededArtifact,
} from "./helpers";

// The whole product must be usable on a phone. 390px is the baseline.
test.use({ viewport: { width: 390, height: 800 } });

function noHorizontalScroll(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

// A seeded vault, saved and past first run, for the views that need content.
function seed(extra: Record<string, unknown>, entries: unknown[]): Record<string, unknown> {
  return {
    schemaVersion: 4,
    generation: 2,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "seed-mobile",
    child: null,
    firstRunDone: true,
    entries,
    ...extra,
  };
}

function letter(id: string, title: string, withPhoto = false) {
  return {
    id,
    type: "letter",
    createdAt: "2026-02-01T09:00:00.000Z",
    occasion: "First birthday",
    title,
    body: "First line.\n\nA second paragraph.",
    photos: withPhoto
      ? [{ id: `${id}-p`, dataUrl: VALID_JPEG_DATA_URL, caption: "Home at last", w: 160, h: 108, bytes: 1617 }]
      : [],
  };
}

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

async function tapTargetOk(page: Page, name: string) {
  const box = (await page.getByRole("button", { name }).boundingBox())!;
  expect(box.height, `${name} is too short to tap`).toBeGreaterThanOrEqual(44);
}

test("home and editor fit a 390px viewport with no horizontal scroll", async ({ page }) => {
  await page.goto(ARTIFACT_URL);

  expect(await noHorizontalScroll(page), "home overflows horizontally").toBe(false);

  await page.getByRole("button", { name: "Write a letter" }).click();
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

  // Add a photo so the grid, caption, and reorder/remove controls are on screen.
  await attachGeneratedImage(page, { width: 1200, height: 900 });
  await expect(page.locator(".photo-grid img")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Remove photo" })).toBeVisible();

  expect(await noHorizontalScroll(page), "editor with a photo overflows horizontally").toBe(false);
});

test("the archive with a thumbnail fits a 390px viewport", async ({ page }) => {
  const seededUrl = writeSeededArtifact(
    {
      schemaVersion: 2,
      generation: 1,
      savedAt: "2026-03-03T21:14:00.000Z",
      fileId: "seed",
      child: null,
      firstRunDone: true,
      entries: [
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "First birthday",
          title: "A letter with a photo and a fairly long title to test wrapping",
          body: "b",
          photos: [
            {
              id: "p1",
              dataUrl: "data:image/jpeg;base64,/9j/AAAB",
              caption: "cake",
              w: 120,
              h: 90,
              bytes: 1000,
            },
          ],
        },
      ],
    },
    "mobile",
  );
  await page.goto(seededUrl);
  await expect(page.locator(".entry-thumb")).toBeVisible();
  expect(await noHorizontalScroll(page), "archive with a thumbnail overflows").toBe(false);
});

test("the empty and typeset book fit a 390px viewport", async ({ page }) => {
  // Empty book: only a sealed entry, so nothing typesets.
  await page.goto(writeSeededArtifact(seed({}, [SEALED_ENTRY]), "mobile-book-empty"));
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.getByRole("heading", { name: "Your book fills as you write." })).toBeVisible();
  expect(await noHorizontalScroll(page), "empty book overflows").toBe(false);
  await tapTargetOk(page, "Write a letter");

  // Typeset book with a photo letter.
  await page.goto(
    writeSeededArtifact(
      seed({ child: { name: "Mira", birthDate: "2020-01-08" } }, [letter("l1", "One year of you", true)]),
      "mobile-book-typeset",
    ),
  );
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.locator(".book-photo")).toBeVisible();
  expect(await noHorizontalScroll(page), "typeset book overflows").toBe(false);
  await tapTargetOk(page, "Back to letters");
  await tapTargetOk(page, "Print the book");
});

test("the interview capture step and the prompt form fit a 390px viewport", async ({ page }) => {
  // No birth date known: the capture step comes first.
  await page.goto(writeSeededArtifact(seed({}, [letter("l1", "A letter")]), "mobile-iv-capture"));
  await page.getByRole("button", { name: "Record an interview" }).click();
  await expect(
    page.getByRole("heading", { name: "First, your child's birth date." }),
  ).toBeVisible();
  expect(await noHorizontalScroll(page), "interview capture overflows").toBe(false);
  await expect(page.getByLabel("Birth date")).toBeVisible();
  await tapTargetOk(page, "Continue");

  // Birth date known: the prompt form opens straight away.
  await page.goto(
    writeSeededArtifact(
      seed({ child: { name: "Mira", birthDate: "2020-01-08" } }, [letter("l1", "A letter")]),
      "mobile-iv-form",
    ),
  );
  await page.getByRole("button", { name: "Record an interview" }).click();
  await expect(page.getByRole("heading", { name: /Interview at age/ })).toBeVisible();
  expect(await noHorizontalScroll(page), "interview prompt form overflows").toBe(false);
  await tapTargetOk(page, "Save this interview");
});

test.describe("dialogs at 390px on the Chromium save path", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium in-place save path");

  test("the stale-copy dialog fits and is tappable", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("First");
    await page.getByLabel("Your letter").fill("First body");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    // Another copy advanced the file on disk, so the next save must warn.
    await page.evaluate(() => {
      const w = window as unknown as { __tylDisk: string };
      w.__tylDisk = w.__tylDisk.replace('"generation":1', '"generation":5');
    });
    await page.getByLabel("Your letter").fill("First body, edited");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByRole("heading", { name: "The file on disk is newer than this one." }),
    ).toBeVisible();
    expect(await noHorizontalScroll(page), "stale dialog overflows").toBe(false);
    await tapTargetOk(page, "Replace with my open copy");
    await tapTargetOk(page, "Keep the disk copy");
  });
});

test.describe("the download backup ritual at 390px", () => {
  test.skip(({ browserName }) => browserName === "chromium", "non-Chromium download path");

  test("the backup ritual dialog fits and is tappable", async ({ page }) => {
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("On a phone");
    await page.getByLabel("Your letter").fill("Saved by download.");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    await download.saveAs(join(tmpdir(), `tyl-mobile-ritual-${Date.now()}.html`));

    const dialog = page.getByRole("dialog", { name: "Your newest copy just downloaded." });
    await expect(dialog).toBeVisible();
    expect(await noHorizontalScroll(page), "backup ritual overflows").toBe(false);
    // Scope to the dialog: the first-run coach strip also shows a "Got it".
    const box = (await dialog.getByRole("button", { name: "Got it" }).boundingBox())!;
    expect(box.height, "Got it is too short to tap").toBeGreaterThanOrEqual(44);
  });
});
