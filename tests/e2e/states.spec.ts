import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { ARTIFACT_PATH, ARTIFACT_URL } from "./helpers";

test("empty state names the product and offers the one action", async ({ page }) => {
  await page.goto(ARTIFACT_URL);
  await expect(page.getByRole("heading", { name: "Write your first letter." })).toBeVisible();
  await expect(page.getByText("It saves to your own file and stays with you.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Write a letter" })).toBeVisible();
});

test("a corrupted vault shows the designed error state, not a crash", async ({ page }) => {
  const html = readFileSync(ARTIFACT_PATH, "utf8");
  const corrupted = html.replace(
    /(<script id="vault-data"[^>]*>)[\s\S]*?(<\/script>)/,
    "$1{ this is not valid json $2",
  );
  const badPath = join(tmpdir(), `tyl-corrupt-${Date.now()}.html`);
  writeFileSync(badPath, corrupted);

  await page.goto(pathToFileURL(badPath).href);
  await expect(
    page.getByRole("heading", { name: "We can't read the letters in this file." }),
  ).toBeVisible();
  await expect(page.getByText(/Your file on disk is unchanged/)).toBeVisible();

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  expect(bodyText).not.toContain("stack");
  expect(bodyText).not.toContain("undefined");
});
