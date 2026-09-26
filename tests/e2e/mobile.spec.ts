import { test, expect } from "@playwright/test";
import { ARTIFACT_URL, attachGeneratedImage, writeSeededArtifact } from "./helpers";

// The whole product must be usable on a phone. 390px is the baseline.
test.use({ viewport: { width: 390, height: 800 } });

function noHorizontalScroll(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
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
