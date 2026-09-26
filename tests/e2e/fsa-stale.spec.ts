import { test, expect } from "@playwright/test";
import { ARTIFACT_URL, MOCK_FSA, extractVaultJson } from "./helpers";

// The stale-copy check is a trust feature: on the Chromium path we re-read the
// file before every write and refuse to overwrite a newer copy without asking.
test.describe("stale-copy protection", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium save path");

  test("warns before overwriting a newer copy, then climbs above both", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("First");
    await page.getByLabel("Your letter").fill("First body");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    // Another copy advanced the file on disk to copy 5.
    await page.evaluate(() => {
      const w = window as unknown as { __tylDisk: string };
      w.__tylDisk = w.__tylDisk.replace('"generation":1', '"generation":5');
    });

    // Edit and save again. The open copy is copy 1, so this must warn.
    await page.getByLabel("Your letter").fill("First body, edited");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByRole("heading", { name: "The file on disk is newer than this one." }),
    ).toBeVisible();
    await expect(page.getByText(/copy on disk is copy 5/)).toBeVisible();
    await expect(page.getByText(/copy you have open is copy 1/)).toBeVisible();

    // No write happened yet: disk is still copy 5.
    let disk = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
    expect(JSON.parse(extractVaultJson(disk)).generation).toBe(5);

    await page.getByRole("button", { name: "Replace with my open copy" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    // The canonical copy climbed above both, and the edited letter is restored.
    disk = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
    const vault = JSON.parse(extractVaultJson(disk));
    expect(vault.generation).toBe(6);
    expect(vault.entries[0].body).toBe("First body, edited");
  });
});
