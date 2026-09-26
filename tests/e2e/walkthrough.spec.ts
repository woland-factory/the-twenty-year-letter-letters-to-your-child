import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { ARTIFACT_URL, MOCK_FSA, extractVaultJson, writeSeededArtifact } from "./helpers";

const strip = (page: Page) => page.locator(".walk");

function reopenFrom(html: string, tag: string): string {
  const path = join(tmpdir(), `tyl-walk-${tag}-${Date.now()}.html`);
  writeFileSync(path, html);
  return pathToFileURL(path).href;
}

// A returning parent's file: real letter, but firstRunDone still false. Content
// alone must suppress the walk.
const RETURNING_WITH_CONTENT = {
  schemaVersion: 4,
  generation: 2,
  savedAt: "2026-03-03T21:14:00.000Z",
  fileId: "seed-content",
  child: null,
  firstRunDone: false,
  entries: [
    {
      id: "open-1",
      type: "letter",
      createdAt: "2026-05-01T00:00:00.000Z",
      occasion: "First birthday",
      title: "An open letter",
      body: "b",
      photos: [],
    },
  ],
};

// A parent who has finished first-run once, even with an empty file: the flag
// alone must suppress the walk.
const RETURNING_FLAG_ONLY = {
  schemaVersion: 4,
  generation: 1,
  savedAt: "2026-03-03T21:14:00.000Z",
  fileId: "seed-flag",
  child: null,
  firstRunDone: true,
  entries: [],
};

test("first open shows the guided path anchored to the real control", async ({ page }) => {
  await page.goto(ARTIFACT_URL);

  await expect(strip(page)).toBeVisible();
  await expect(page.locator(".walk-step")).toHaveText("Step 1 of 4");
  await expect(page.locator(".walk-line")).toHaveText("Write your first letter.");
  await expect(page.getByRole("button", { name: "Write a letter" })).toHaveClass(/walk-highlight/);
  await expect(page.getByRole("button", { name: "Skip the walkthrough" })).toBeVisible();
});

test("the walk advances through the real core loop and records first-run", async ({
  page,
  browserName,
}) => {
  if (browserName === "chromium") await page.addInitScript(MOCK_FSA);
  await page.goto(ARTIFACT_URL);

  // Step 1: write.
  const writeBtn = page.getByRole("button", { name: "Write a letter" });
  await expect(writeBtn).toHaveClass(/walk-highlight/);
  await writeBtn.click();

  // Step 2: save. The Save button is now the highlighted control.
  await expect(page.locator(".walk-step")).toHaveText("Step 2 of 4");
  const saveBtn = page.getByRole("button", { name: "Save", exact: true });
  await expect(saveBtn).toHaveClass(/walk-highlight/);

  await page.getByLabel("Title").fill("My first letter");
  await page.getByLabel("Your letter").fill("Hello, little one.");

  let savedHtml: string;
  if (browserName === "chromium") {
    await saveBtn.click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();
    savedHtml = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
  } else {
    const downloadPromise = page.waitForEvent("download");
    await saveBtn.click();
    const download = await downloadPromise;
    const p = join(tmpdir(), `tyl-walk-dl-${Date.now()}.html`);
    await download.saveAs(p);
    savedHtml = readFileSync(p, "utf8");
  }

  // Step 3: backup. The strip points at the saved copy.
  await expect(page.locator(".walk-step")).toHaveText("Step 3 of 4");

  // The saved file records first-run as done.
  const vault = JSON.parse(extractVaultJson(savedHtml));
  expect(vault.firstRunDone).toBe(true);
  expect(vault.entries.length).toBe(1);

  // Acknowledge the backup guidance: the strip's "Got it" on Chromium, or the
  // download-path backup dialog's "Got it" on the other engines.
  if (browserName === "chromium") {
    await strip(page).getByRole("button", { name: "Got it" }).click();
  } else {
    await page.getByRole("dialog").getByRole("button", { name: "Got it" }).click();
  }

  // Step 4: seal, with the seal control highlighted.
  await expect(page.locator(".walk-step")).toHaveText("Step 4 of 4");
  await expect(page.locator(".walk-line")).toHaveText("Seal a letter to lock it.");
  await expect(page.getByRole("button", { name: "Seal this letter" })).toHaveClass(
    /walk-highlight/,
  );
});

test("skippable on step one", async ({ page }) => {
  await page.goto(ARTIFACT_URL);
  await expect(strip(page)).toBeVisible();
  await page.getByRole("button", { name: "Skip the walkthrough" }).click();
  await expect(strip(page)).toHaveCount(0);
});

test("skippable on the save step", async ({ page }) => {
  await page.addInitScript(MOCK_FSA);
  await page.goto(ARTIFACT_URL);

  await page.getByRole("button", { name: "Write a letter" }).click();
  await expect(page.locator(".walk-step")).toHaveText("Step 2 of 4");
  await page.getByRole("button", { name: "Skip the walkthrough" }).click();
  await expect(strip(page)).toHaveCount(0);
});

test("permanent dismissal: the saved file never shows the walk again", async ({ page }) => {
  await page.addInitScript(MOCK_FSA);
  await page.goto(ARTIFACT_URL);

  await page.getByRole("button", { name: "Write a letter" }).click();
  await page.getByLabel("Title").fill("Kept");
  await page.getByLabel("Your letter").fill("This file is now mine.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

  const savedHtml = await page.evaluate(
    () => (window as unknown as { __tylDisk: string }).__tylDisk,
  );
  await page.goto(reopenFrom(savedHtml, "reopen"));

  await expect(page.getByText("An open letter")).toHaveCount(0); // sanity: fresh load
  await expect(page.getByText("Kept")).toBeVisible();
  await expect(strip(page)).toHaveCount(0);
});

test("a returning parent never sees the walk", async ({ page }) => {
  await page.goto(writeSeededArtifact(RETURNING_WITH_CONTENT, "content"));
  await expect(page.getByText("An open letter")).toBeVisible();
  await expect(strip(page)).toHaveCount(0);

  await page.goto(writeSeededArtifact(RETURNING_FLAG_ONLY, "flag"));
  await expect(page.getByRole("heading", { name: "Write your first letter." })).toBeVisible();
  await expect(strip(page)).toHaveCount(0);
});

test("the seeded demo is not trapped in the walk", async ({ page }) => {
  await page.goto(`${ARTIFACT_URL}?demo=1`);

  await expect(strip(page)).toHaveCount(0);
  // The differentiator is reachable at once: the sealed letter is right there.
  const sealedRow = page.getByRole("button", { name: /Sealed letter/ });
  await expect(sealedRow).toBeVisible();
  await sealedRow.click();
  await expect(page.getByText("Where the key lives: In Mira's first birthday card")).toBeVisible();
});

test("the strip is not a focus trap and never covers the control", async ({ page }) => {
  await page.goto(ARTIFACT_URL);

  // The strip is a region, not a modal dialog.
  const region = strip(page);
  await expect(region).toHaveAttribute("role", "region");
  await expect(region).not.toHaveAttribute("aria-modal", "true");

  // Both the highlighted control and Skip take focus: keyboard reaches past the
  // strip to the real control and back.
  const writeBtn = page.getByRole("button", { name: "Write a letter" });
  const skip = page.getByRole("button", { name: "Skip the walkthrough" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await writeBtn.focus();
  await expect(writeBtn).toBeFocused();

  // The highlighted control is still clickable (the strip does not sit on it).
  await writeBtn.click();
  await expect(page.getByLabel("Your letter")).toBeVisible();
});

test("mobile 390px: no horizontal scroll and the action stays reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto(ARTIFACT_URL);

  await expect(strip(page)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(overflow, "no horizontal scroll at 390px").toBe(true);

  // Skip is a comfortable tap target.
  const skipBox = await page.getByRole("button", { name: "Skip the walkthrough" }).boundingBox();
  expect(skipBox).not.toBeNull();
  expect(skipBox!.height).toBeGreaterThanOrEqual(44);

  // The strip does not cover the primary action: the button sits above the strip.
  const writeBox = await page.getByRole("button", { name: "Write a letter" }).boundingBox();
  const stripBox = await strip(page).boundingBox();
  expect(writeBox).not.toBeNull();
  expect(stripBox).not.toBeNull();
  expect(writeBox!.y + writeBox!.height).toBeLessThanOrEqual(stripBox!.y + 1);
});
