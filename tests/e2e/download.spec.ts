import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { ARTIFACT_URL, extractVaultJson } from "./helpers";

// Firefox has no File System Access API, so it takes the download-and-replace
// path. This proves the ritual guidance and a full reopen round-trip.
test.describe("download-and-replace path", () => {
  test.skip(({ browserName }) => browserName === "chromium", "non-Chromium download path");

  test("downloads the canonical copy, guides the swap, and reopens intact", async ({ page }) => {
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("The night you came home");
    await page.getByLabel("Your letter").fill("You slept the whole drive back.");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("the-twenty-year-letter.html");

    // The ritual names which copy is now real and gives it a readable identity.
    await expect(
      page.getByRole("heading", { name: "Your newest copy just downloaded." }),
    ).toBeVisible();
    await expect(page.getByText(/Keep this one as your real file/)).toBeVisible();
    await expect(page.getByText(/^Copy 1, saved .+\.$/)).toBeVisible();

    // Reopen the downloaded file from disk: the letter and readout are restored.
    const savedPath = join(tmpdir(), `tyl-download-${Date.now()}.html`);
    await download.saveAs(savedPath);

    const savedHtml = readFileSync(savedPath, "utf8");
    const vault = JSON.parse(extractVaultJson(savedHtml));
    expect(vault.entries[0].title).toBe("The night you came home");
    expect(vault.generation).toBe(1);

    await page.goto(pathToFileURL(savedPath).href);
    await expect(page.getByText("The night you came home")).toBeVisible();
    await expect(page.getByText(/1 letter\./)).toBeVisible();
    await expect(page.getByText("This is copy 1.")).toBeVisible();
  });
});
