import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { ARTIFACT_URL, MOCK_FSA, attachGeneratedImage } from "./helpers";

// Every seal surface must be usable on a phone. 390px is the baseline. The whole
// flow runs on the Chromium save path so a single run reaches the key sheet, the
// unseal view, and the revealed letter.
test.use({ viewport: { width: 390, height: 800 } });

function overflows(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe("seal surfaces at 390px", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one run is enough");

  test("seal dialog, key sheet, unseal, and reveal fit a 390px viewport", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("On a phone");
    await page.getByLabel("Your letter").fill("Sealed from a small screen.");
    await attachGeneratedImage(page, { width: 400, height: 300 });
    await expect(page.locator(".photo-grid img")).toHaveCount(1);

    await page.getByRole("button", { name: "Seal this letter" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    expect(await overflows(page), "seal dialog overflows").toBe(false);

    await page.getByLabel("Where will you keep the key?").fill("In the birthday card");
    await page.getByLabel("I have a safe place for the key.").check();
    await page.getByRole("button", { name: "Seal and show my key" }).click();

    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toBeVisible();
    await expect(page.getByLabel("QR code of your 24 words")).toBeVisible();
    expect(await overflows(page), "key sheet overflows").toBe(false);

    const words = await page.locator(".word-text").allInnerTexts();
    const savedHtml = await page.evaluate(
      () => (window as unknown as { __tylDisk: string }).__tylDisk,
    );
    await page.getByRole("button", { name: "I have saved the key" }).click();

    const path = join(tmpdir(), `tyl-seal-mobile-${Date.now()}.html`);
    writeFileSync(path, savedHtml);
    await page.goto(pathToFileURL(path).href);

    await page.getByRole("button", { name: /Sealed letter/ }).click();
    expect(await overflows(page), "unseal view overflows").toBe(false);

    await page.getByLabel("Type your 24 words").fill(words.join(" "));
    await page.getByRole("button", { name: "Open this letter" }).click();
    await expect(page.getByText("Sealed from a small screen.")).toBeVisible();
    expect(await overflows(page), "revealed letter overflows").toBe(false);
  });
});
