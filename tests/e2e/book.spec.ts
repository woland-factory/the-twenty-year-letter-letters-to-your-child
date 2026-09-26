import { test, expect } from "@playwright/test";
import { MOCK_FSA, VALID_JPEG_DATA_URL, writeSeededArtifact } from "./helpers";

// A vault with two open letters (oldest carries a photo, both bodies have line
// breaks) and one sealed letter, so the book has content, ordering, a photo,
// and a sealed entry to exclude.
function mixedVault() {
  return {
    schemaVersion: 3,
    generation: 4,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "seed-book",
    child: { name: "Mira", birthDate: "2026-01-08" },
    firstRunDone: true,
    entries: [
      {
        id: "open-newer",
        type: "letter",
        createdAt: "2026-05-01T09:00:00.000Z",
        occasion: "First birthday",
        title: "One year of you",
        body: "First line of the newer letter.\n\nA second paragraph.",
        photos: [],
      },
      {
        id: "open-older",
        type: "letter",
        createdAt: "2026-02-01T09:00:00.000Z",
        occasion: "The day we came home",
        title: "The night you came home",
        body: "First line of the older letter.\n\nA second paragraph here too.",
        photos: [
          {
            id: "p1",
            dataUrl: VALID_JPEG_DATA_URL,
            caption: "Home at last",
            w: 160,
            h: 108,
            bytes: 1617,
          },
        ],
      },
      {
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
      },
    ],
  };
}

// A vault whose only entry is sealed: the archive is non-empty (the book link
// shows), but the book has nothing to typeset.
function allSealedVault() {
  return {
    schemaVersion: 3,
    generation: 2,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "seed-sealed-only",
    child: null,
    firstRunDone: true,
    entries: [
      {
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
      },
    ],
  };
}

test("the book typesets every unsealed letter, oldest first, with photos", async ({ page }) => {
  await page.goto(writeSeededArtifact(mixedVault(), "book-render"));
  await page.getByRole("button", { name: "Open the book" }).click();

  // The cover uses the child's name and the unsealed count (the sealed one is out).
  await expect(page.getByRole("heading", { level: 1, name: "Letters to Mira" })).toBeVisible();
  await expect(page.getByText("2 letters")).toBeVisible();

  // Both open letters, their occasions, dates, and body text (line breaks kept).
  await expect(page.getByRole("heading", { name: "The night you came home" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One year of you" })).toBeVisible();
  await expect(page.getByText("The day we came home")).toBeVisible();
  await expect(page.getByText("First birthday")).toBeVisible();
  await expect(page.getByText("Written February 1, 2026")).toBeVisible();
  await expect(page.getByText("Written May 1, 2026")).toBeVisible();
  await expect(page.getByText("First line of the older letter.")).toBeVisible();
  await expect(page.getByText("A second paragraph here too.")).toBeVisible();

  // Line breaks are preserved: the older letter's body keeps its blank line.
  const olderBody = await page.locator(".book-body").first().innerText();
  expect(olderBody).toContain("First line of the older letter.");
  expect(olderBody).toContain("\n");

  // Oldest first: the older letter's title appears before the newer one.
  const titles = await page.locator(".book-entry-title").allInnerTexts();
  expect(titles).toEqual(["The night you came home", "One year of you"]);

  // The photo renders and actually decodes.
  const photo = page.locator(".book-photo");
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText("Home at last")).toBeVisible();
});

test("the book excludes sealed letters entirely", async ({ page }) => {
  await page.goto(writeSeededArtifact(mixedVault(), "book-sealed"));
  await page.getByRole("button", { name: "Open the book" }).click();

  await expect(page.getByRole("heading", { name: "The night you came home" })).toBeVisible();
  // No sealed key hint, no lock, no sealed marker reaches the book.
  await expect(page.getByText("In the birthday card")).toHaveCount(0);
  await expect(page.getByText("Sealed letter")).toHaveCount(0);
  await expect(page.locator(".book-entry")).toHaveCount(2);
});

test("the book reflects the current vault with no regenerate step", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "one save path is enough for the live-reflect check");
  await page.addInitScript(MOCK_FSA);
  await page.goto(writeSeededArtifact(mixedVault(), "book-live"));

  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.locator(".book-entry")).toHaveCount(2);

  // Back to the archive, write and save a new letter.
  await page.getByRole("button", { name: "Back to letters" }).click();
  await page.getByRole("button", { name: "Write a letter" }).click();
  await page.getByLabel("Title").fill("A brand new page");
  await page.getByLabel("Your letter").fill("Written just now.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Saved/)).toBeVisible();

  // Open the book again: the new letter is there, no regenerate control anywhere.
  await page.getByRole("button", { name: "Back to letters" }).click();
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.getByRole("heading", { name: "A brand new page" })).toBeVisible();
  await expect(page.locator(".book-entry")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /regenerate/i })).toHaveCount(0);
});

test("an empty book is a designed state, not a blank sheet", async ({ page }) => {
  await page.goto(writeSeededArtifact(allSealedVault(), "book-empty"));
  await page.getByRole("button", { name: "Open the book" }).click();

  await expect(
    page.getByRole("heading", { name: "Your book fills as you write." }),
  ).toBeVisible();
  await expect(page.getByText("Every open letter prints here as a book you can hold.")).toBeVisible();
  await expect(page.getByText("Sealed letters stay locked and are not printed here.")).toBeVisible();
  // Nothing to print, so no print action; the one action is to write.
  await expect(page.getByRole("button", { name: "Print the book" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Write a letter" })).toBeVisible();
});

test("print shows only the book, with app chrome hidden and photos within the page", async ({
  page,
}) => {
  await page.goto(writeSeededArtifact(mixedVault(), "book-print"));
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.locator(".book-photo")).toBeVisible();

  await page.emulateMedia({ media: "print" });

  // The book paints; the toolbar (brand + buttons) is removed from the page.
  await expect(page.locator(".book")).toBeVisible();
  const toolbarDisplay = await page
    .locator(".book-toolbar")
    .evaluate((el) => getComputedStyle(el).display);
  expect(toolbarDisplay).toBe("none");

  // The photo stays inside the book column and its height is bounded.
  const bookWidth = (await page.locator(".book").boundingBox())!.width;
  const photoBox = (await page.locator(".book-photo").boundingBox())!;
  expect(photoBox.width).toBeLessThanOrEqual(bookWidth + 1);
  // 16cm at 96dpi is ~605px; the small seed photo is well under that.
  expect(photoBox.height).toBeLessThan(605);
});

test("the book fits a 390px viewport with no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(writeSeededArtifact(mixedVault(), "book-mobile"));
  await page.getByRole("button", { name: "Open the book" }).click();

  await expect(page.locator(".book-photo")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow, "the book overflows horizontally at 390px").toBe(false);

  // Back and Print are tappable (~44px), and the photo scales to the column.
  for (const name of ["Back to letters", "Print the book"]) {
    const box = (await page.getByRole("button", { name }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const bookWidth = (await page.locator(".book").boundingBox())!.width;
  const photoWidth = (await page.locator(".book-photo").boundingBox())!.width;
  expect(photoWidth).toBeLessThanOrEqual(bookWidth + 1);
});
