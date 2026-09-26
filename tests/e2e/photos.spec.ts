import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
import {
  ARTIFACT_URL,
  MOCK_FSA,
  VALID_JPEG_DATA_URL,
  attachGeneratedImage,
  extractVaultJson,
  writeSeededArtifact,
} from "./helpers";

const MAX_EDGE = 1600;
const BUDGET = 20 * 1024 * 1024;

function tinyPhoto(id: string, bytes: number) {
  return {
    id,
    dataUrl: "data:image/jpeg;base64,/9j/AAAB",
    caption: `caption ${id}`,
    w: 120,
    h: 90,
    bytes,
  };
}

function seedVault(entries: unknown[]) {
  return {
    schemaVersion: 2,
    generation: 3,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "seed-file",
    child: null,
    entries,
    firstRunDone: true,
  };
}

async function readDiskVault(page: import("@playwright/test").Page) {
  const disk = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
  return JSON.parse(extractVaultJson(disk));
}

// The whole photo story runs on the Chromium File System Access path, where we
// can read the simulated file after each save.
test.describe("photos on the File System Access path", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium save path");

  test("a photo and caption round-trip into the file and back", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("The night you came home");
    await page.getByLabel("Occasion").fill("First birthday");

    await attachGeneratedImage(page, { width: 480, height: 320 });
    await expect(page.locator(".photo-grid img")).toHaveCount(1);
    await page.getByPlaceholder("Add a caption").fill("Home at last");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    const vault = await readDiskVault(page);
    const photo = vault.entries[0].photos[0];
    expect(photo.dataUrl.startsWith("data:image/jpeg")).toBe(true);
    expect(photo.caption).toBe("Home at last");
    expect(photo.bytes).toBeGreaterThan(0);
    expect(vault.entries[0].occasion).toBe("First birthday");

    // Reopen the saved file: the thumbnail renders from the stored data URL.
    const savedPath = join(tmpdir(), `tyl-photo-${Date.now()}.html`);
    writeFileSync(savedPath, await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk));
    await page.goto(pathToFileURL(savedPath).href);
    const thumb = page.locator(".entry-thumb");
    await expect(thumb).toBeVisible();
    const natural = await thumb.evaluate((img) => (img as HTMLImageElement).naturalWidth);
    expect(natural).toBeGreaterThan(0);
  });

  test("a large photo is capped to MAX_EDGE and shrinks well below the source", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("Big picture");

    const sourceBytes = await attachGeneratedImage(page, { width: 3000, height: 2000 });
    await expect(page.locator(".photo-grid img")).toHaveCount(1);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    const vault = await readDiskVault(page);
    const photo = vault.entries[0].photos[0];
    expect(Math.max(photo.w, photo.h)).toBeLessThanOrEqual(MAX_EDGE);
    expect(photo.w).toBe(MAX_EDGE);
    expect(photo.bytes).toBeLessThan(sourceBytes);
  });

  test("a file that is not a photo shows the plain message and is not added", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await attachGeneratedImage(page, { width: 10, height: 10, mimeType: "text/plain" });

    await expect(
      page.getByText("That file is not a photo. Choose a JPEG or PNG image."),
    ).toBeVisible();
    await expect(page.locator(".photo-grid img")).toHaveCount(0);
  });

  test("a photo over the budget is refused with the plain message", async ({ page }) => {
    const seededUrl = writeSeededArtifact(
      seedVault([
        {
          id: "e1",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "Full already",
          title: "Full",
          body: "b",
          photos: [tinyPhoto("p1", BUDGET - 500)],
        },
      ]),
      "budget",
    );
    await page.addInitScript(MOCK_FSA);
    await page.goto(seededUrl);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await attachGeneratedImage(page, { width: 800, height: 600 });

    await expect(
      page.getByText("Your file has reached its photo limit. Remove a photo to add a new one."),
    ).toBeVisible();
    await expect(page.locator(".photo-grid img")).toHaveCount(0);
  });

  test("a photo can be removed", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await attachGeneratedImage(page, { width: 300, height: 200 });
    await expect(page.locator(".photo-grid img")).toHaveCount(1);

    await page.getByRole("button", { name: "Remove photo" }).click();
    await expect(page.locator(".photo-grid img")).toHaveCount(0);
  });

  test("editing one entry leaves every other entry and its photos intact", async ({ page }) => {
    const seededUrl = writeSeededArtifact(
      seedVault([
        {
          id: "e-new",
          type: "letter",
          createdAt: "2026-02-01T00:00:00.000Z",
          occasion: "Second",
          title: "Second letter",
          body: "second body",
          photos: [tinyPhoto("p-new", 1000)],
        },
        {
          id: "e-old",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "First",
          title: "First letter",
          body: "first body",
          photos: [tinyPhoto("p-old", 2000)],
        },
      ]),
      "edit",
    );
    await page.addInitScript(MOCK_FSA);
    await page.goto(seededUrl);

    // Newest first, so the first row is the second letter. Edit the older one.
    await page.getByRole("button", { name: /First letter/ }).click();
    await page.getByLabel("Your letter").fill("first body, edited");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    const vault = await readDiskVault(page);
    const edited = vault.entries.find((e: { id: string }) => e.id === "e-old");
    const untouched = vault.entries.find((e: { id: string }) => e.id === "e-new");
    expect(edited.body).toBe("first body, edited");
    expect(edited.photos[0].id).toBe("p-old");
    expect(untouched.title).toBe("Second letter");
    expect(untouched.photos[0].id).toBe("p-new");
    expect(untouched.photos[0].bytes).toBe(1000);
  });

  test("adding a photo and saving makes zero external network requests", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("http://") || url.startsWith("https://")) external.push(url);
    });

    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);
    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("With a photo");
    await attachGeneratedImage(page, { width: 640, height: 480 });
    await expect(page.locator(".photo-grid img")).toHaveCount(1);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    expect(external, `unexpected network requests: ${external.join(", ")}`).toHaveLength(0);
  });
});

// The archive rendering does not depend on the save path, so one run is enough.
test.describe("archive with photos", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one run is enough");

  test("shows occasion, date, and a thumbnail, newest first, no broken rows", async ({ page }) => {
    const seededUrl = writeSeededArtifact(
      seedVault([
        {
          id: "e-old",
          type: "letter",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "First birthday",
          title: "Older letter",
          body: "b",
          photos: [{ ...tinyPhoto("p-old", 1000), dataUrl: VALID_JPEG_DATA_URL }],
        },
        {
          id: "e-new",
          type: "letter",
          createdAt: "2026-05-01T00:00:00.000Z",
          occasion: "",
          title: "Newer letter",
          body: "b",
          photos: [],
        },
      ]),
      "archive",
    );
    await page.goto(seededUrl);

    const titles = await page.locator(".entry-title").allInnerTexts();
    expect(titles).toEqual(["Newer letter", "Older letter"]);

    await expect(page.getByText("First birthday")).toBeVisible();
    // One entry has a photo, one does not: exactly one thumbnail, no broken img.
    await expect(page.locator(".entry-thumb")).toHaveCount(1);
    const natural = await page
      .locator(".entry-thumb")
      .evaluate((img) => (img as HTMLImageElement).naturalWidth);
    expect(natural).toBeGreaterThan(0);
  });
});

// A corrupted photo must reach the designed error state, never a crash.
test.describe("malformed photo", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one run is enough");

  test("shows the designed error state", async ({ page }) => {
    const html = readFileSync(join(process.cwd(), "dist", "index.html"), "utf8");
  const badVault = seedVault([
    {
      id: "e1",
      type: "letter",
      createdAt: "2026-01-01T00:00:00.000Z",
      occasion: "",
      title: "t",
      body: "b",
      photos: [{ id: "p1", dataUrl: "data:image/jpeg;base64,AA", caption: "c", w: 10, h: 10 }],
    },
  ]);
  const seeded = html.replace(
    /(<script id="vault-data"[^>]*>)\{"schemaVersion[\s\S]*?(<\/script>)/,
    `$1${JSON.stringify(badVault)}$2`,
  );
  const badPath = join(tmpdir(), `tyl-badphoto-${Date.now()}.html`);
  writeFileSync(badPath, seeded);

    await page.goto(pathToFileURL(badPath).href);
    await expect(
      page.getByRole("heading", { name: "We can't read the letters in this file." }),
    ).toBeVisible();
  });
});
