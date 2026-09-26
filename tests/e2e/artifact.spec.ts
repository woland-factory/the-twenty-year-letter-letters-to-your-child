import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ARTIFACT_PATH, ARTIFACT_URL, MOCK_FSA, extractVaultJson } from "./helpers";

// The artifact is the family's file. It must open and save with zero network,
// forever. These run on Chromium (the File System Access path).
test.describe("artifact zero-network and save", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium save path");

  test("opens and saves with zero external network requests", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("http://") || url.startsWith("https://")) external.push(url);
    });

    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await expect(page.getByRole("heading", { name: "Write your first letter." })).toBeVisible();

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("The night you came home");
    await page.getByLabel("Your letter").fill("You slept the whole drive back.");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();

    // The write reached the simulated file, with the letter intact.
    const disk = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
    const vault = JSON.parse(extractVaultJson(disk));
    expect(vault.entries[0].title).toBe("The night you came home");
    expect(vault.generation).toBe(1);

    expect(external, `unexpected network requests: ${external.join(", ")}`).toHaveLength(0);
  });
});

test("artifact source carries no analytics, error tracking, or fetchable URL", async () => {
  const html = readFileSync(ARTIFACT_PATH, "utf8");
  expect(html).not.toMatch(/umami/i);
  expect(html).not.toMatch(/sentry/i);
  expect(html).toContain("connect-src 'none'");

  // The only http(s) strings allowed are inert XML namespace identifiers that
  // the UI runtime carries. Nothing is ever fetched (connect-src 'none'; proven
  // by the zero-network test above).
  const allowed = [
    "http://www.w3.org/1998/Math/MathML",
    "http://www.w3.org/1999/xhtml",
    "http://www.w3.org/2000/svg",
  ];
  const urls = html.match(/https?:\/\/[^"'` )<>]+/g) ?? [];
  for (const url of urls) {
    expect(allowed, `unexpected URL in artifact: ${url}`).toContain(url);
  }
});
