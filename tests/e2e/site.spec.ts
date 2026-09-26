import { test, expect } from "@playwright/test";

// The distribution site: a landing page, a download of the empty starter file,
// and a live artifact that shows real content when SEED_DEMO is on.
test.describe("distribution site", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one run is enough");

  test("landing page explains the product and links both actions", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Letters to your child, in a file that outlives any company.",
      }),
    ).toBeVisible();

    const download = page.getByRole("link", { name: "Download your file" });
    await expect(download).toHaveAttribute("download", "the-twenty-year-letter.html");
    await expect(download).toHaveAttribute("href", "the-twenty-year-letter.html");

    const live = page.getByRole("link", { name: "Try it live" });
    await expect(live).toHaveAttribute("href", /the-twenty-year-letter\.html\?demo=1/);
  });

  test("the live artifact shows the sample letter with SEED_DEMO on", async ({ page }) => {
    await page.goto("/the-twenty-year-letter.html?demo=1");
    await expect(page.getByText("The night you came home")).toBeVisible();
    await expect(page.getByText(/1 letter\./)).toBeVisible();
  });

  test("the downloadable starter file is empty, never seeded", async ({ page }) => {
    await page.goto("/the-twenty-year-letter.html");
    await expect(page.getByRole("heading", { name: "Write your first letter." })).toBeVisible();
    await expect(page.getByText("The night you came home")).toHaveCount(0);
  });
});
