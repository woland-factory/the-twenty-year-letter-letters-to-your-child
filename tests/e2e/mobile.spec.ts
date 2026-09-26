import { test, expect } from "@playwright/test";
import { ARTIFACT_URL } from "./helpers";

// The whole product must be usable on a phone. 390px is the baseline.
test.use({ viewport: { width: 390, height: 800 } });

test("home and editor fit a 390px viewport with no horizontal scroll", async ({ page }) => {
  await page.goto(ARTIFACT_URL);

  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(homeOverflow, "home overflows horizontally").toBe(false);

  await page.getByRole("button", { name: "Write a letter" }).click();
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

  const editorOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(editorOverflow, "editor overflows horizontally").toBe(false);
});
