import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { MOCK_FSA, extractVaultJson, writeSeededArtifact } from "./helpers";

// Age-appropriate prompts. One representative question per band, and one that
// must NOT appear when the band is wrong.
const LITTLE_KID_Q = "What do you want to be when you grow up?";
const FIRST_YEAR_Q = "What are you learning to do this month?";
const TEEN_Q = "What are you figuring out about who you are?";
const EARLY_SCHOOL_Q = "What did you learn this year that you are proud of?";

// A birth date, in ISO, that makes the child exactly `years` old right now (born
// on Jan 1 so the birthday has always already passed this calendar year).
function birthDateForAge(years: number): string {
  const now = new Date();
  return `${now.getFullYear() - years}-01-01`;
}

// A birth date whose month and day are today's, `years` in the past, so today
// falls exactly on the birthday and the nudge window is open.
function birthDateOnTodayForAge(years: number): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear() - years}-${mm}-${dd}`;
}

function letter(id: string, createdAt: string, title: string) {
  return {
    id,
    type: "letter",
    createdAt,
    occasion: "First birthday",
    title,
    body: "A short letter.",
    photos: [],
  };
}

function seededVault(
  extra: Record<string, unknown>,
  entries: unknown[],
): Record<string, unknown> {
  return {
    schemaVersion: 4,
    generation: 2,
    savedAt: "2026-03-03T21:14:00.000Z",
    fileId: "seed-interview",
    child: null,
    firstRunDone: true,
    entries,
    ...extra,
  };
}

// Save the current interview and return the saved file's HTML. On Chromium the
// mock File System Access API keeps the "disk" in window.__tylDisk; the other
// engines take the real download path and show the backup ritual.
async function saveInterview(page: Page, browserName: string): Promise<string> {
  if (browserName === "chromium") {
    await page.getByRole("button", { name: "Save this interview" }).click();
    await expect(page.getByText("Saved. Your file is up to date.")).toBeVisible();
    return page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save this interview" }).click();
  const download = await downloadPromise;
  const p = join(tmpdir(), `tyl-interview-dl-${Date.now()}.html`);
  await download.saveAs(p);
  await page.getByRole("button", { name: "Got it" }).click();
  return readFileSync(p, "utf8");
}

test.beforeEach(async ({ page, browserName }) => {
  if (browserName === "chromium") await page.addInitScript(MOCK_FSA);
});

test("shows the age-appropriate prompts and not another band's", async ({ page }) => {
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: { name: "Mira", birthDate: birthDateForAge(3) } }, [
        letter("l1", "2026-01-01T00:00:00.000Z", "A letter"),
      ]),
      "iv-age3",
    ),
  );

  await page.getByRole("button", { name: "Record an interview" }).click();
  await expect(page.getByText(LITTLE_KID_Q)).toBeVisible();
  await expect(page.getByText(FIRST_YEAR_Q)).toHaveCount(0);

  // A second vault at a teen age shows the distinct teen questions.
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: { name: "Mira", birthDate: birthDateForAge(15) } }, [
        letter("l1", "2026-01-01T00:00:00.000Z", "A letter"),
      ]),
      "iv-teen",
    ),
  );
  await page.getByRole("button", { name: "Record an interview" }).click();
  await expect(page.getByText(TEEN_Q)).toBeVisible();
  await expect(page.getByText(LITTLE_KID_Q)).toHaveCount(0);
});

test("saves answers verbatim and restores them on reopen", async ({ page, browserName }) => {
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: { name: "Mira", birthDate: birthDateForAge(3) } }, [
        letter("l1", "2026-01-01T00:00:00.000Z", "A letter"),
      ]),
      "iv-verbatim",
    ),
  );

  const answerOne = "  A vet, and a  pirate.\nTwo lines, kept exactly.  ";
  const answerTwo = "Hide and seek in the garden";

  await page.getByRole("button", { name: "Record an interview" }).click();
  await page.getByLabel(LITTLE_KID_Q).fill(answerOne);
  await page.getByLabel("What is your favorite game right now?").fill(answerTwo);

  const savedHtml = await saveInterview(page, browserName);

  // Reopen from the archive: the interview edits in place, answers restored.
  await page.getByRole("button", { name: "Back to letters" }).click();
  await page.getByRole("button", { name: /Interview at age 3/ }).click();
  await expect(page.getByLabel(LITTLE_KID_Q)).toHaveValue(answerOne);
  await expect(page.getByLabel("What is your favorite game right now?")).toHaveValue(answerTwo);

  // The saved file carries an interview entry with the age and both answers.
  const vault = JSON.parse(extractVaultJson(savedHtml));
  const interview = vault.entries.find((e: { type: string }) => e.type === "interview");
  expect(interview).toBeTruthy();
  expect(interview.childAgeYears).toBe(3);
  const texts = interview.answers.map((a: { answerText: string }) => a.answerText);
  expect(texts).toContain(answerOne);
  expect(texts).toContain(answerTwo);
});

test("captures the birth date when it is missing, then records", async ({ page, browserName }) => {
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: null }, [letter("l1", "2026-01-01T00:00:00.000Z", "A letter")]),
      "iv-capture",
    ),
  );

  await page.getByRole("button", { name: "Record an interview" }).click();
  // The capture step appears because no birth date is known.
  await expect(page.getByRole("heading", { name: "First, your child's birth date." })).toBeVisible();
  await page.getByLabel("Birth date").fill(birthDateForAge(3));
  await page.getByLabel("Child's name").fill("Mira");
  await page.getByRole("button", { name: "Continue" }).click();

  // The age-appropriate prompts appear; record one and save.
  await expect(page.getByText(LITTLE_KID_Q)).toBeVisible();
  await page.getByLabel(LITTLE_KID_Q).fill("A vet.");
  const savedHtml = await saveInterview(page, browserName);

  const vault = JSON.parse(extractVaultJson(savedHtml));
  expect(vault.child.birthDate).toBe(birthDateForAge(3));
  expect(vault.child.name).toBe("Mira");
  expect(vault.entries.some((e: { type: string }) => e.type === "interview")).toBe(true);
});

test("shows interviews in the archive and typesets them in the book", async ({ page }) => {
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: { name: "Mira", birthDate: "2020-01-08" } }, [
        letter("l1", "2026-05-01T00:00:00.000Z", "One year of you"),
        {
          id: "iv1",
          type: "interview",
          createdAt: "2026-02-01T00:00:00.000Z",
          occasion: "",
          title: "Interview at age 6",
          body: "",
          photos: [],
          childAgeYears: 6,
          answers: [
            {
              promptId: "early-school-1",
              promptText: EARLY_SCHOOL_Q,
              answerText: "I read a whole chapter book.",
            },
          ],
        },
      ]),
      "iv-archive-book",
    ),
  );

  // The archive marks the interview as an interview.
  await expect(page.getByText("Yearly interview")).toBeVisible();
  await expect(page.getByText("Interview at age 6")).toBeVisible();

  // The book typesets the interview alongside the letter, oldest first.
  await page.getByRole("button", { name: "Open the book" }).click();
  await expect(page.getByRole("heading", { name: "Interview at age 6" })).toBeVisible();
  await expect(page.getByText(EARLY_SCHOOL_Q)).toBeVisible();
  await expect(page.getByText("I read a whole chapter book.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "One year of you" })).toBeVisible();
  const titles = await page.locator(".book-entry-title").allInnerTexts();
  expect(titles).toEqual(["Interview at age 6", "One year of you"]);
});

test("sealing an interview leaks nothing, then unseals with the words", async ({
  page,
  browserName,
}) => {
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: { name: "Mira", birthDate: birthDateForAge(5) } }, [
        letter("l1", "2026-01-01T00:00:00.000Z", "A letter"),
      ]),
      "iv-seal",
    ),
  );

  const secretAnswer = "PEEKABOO_SECRET_ANSWER_TOKEN";
  await page.getByRole("button", { name: "Record an interview" }).click();
  await page.getByLabel(EARLY_SCHOOL_Q).fill(secretAnswer);

  // Seal through the shared dialog and key sheet.
  await page.getByRole("button", { name: "Seal this interview" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByLabel("Where will you keep the key?").fill("In the birthday card");
  await page.getByLabel("I have a safe place for the key.").check();

  let savedHtml: string;
  if (browserName === "chromium") {
    await page.getByRole("button", { name: "Seal and show my key" }).click();
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toBeVisible();
    savedHtml = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
  } else {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Seal and show my key" }).click();
    const download = await downloadPromise;
    const p = join(tmpdir(), `tyl-iv-seal-dl-${Date.now()}.html`);
    await download.saveAs(p);
    savedHtml = readFileSync(p, "utf8");
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toBeVisible();
  }

  const words = await page.locator(".word-text").allInnerTexts();
  expect(words).toHaveLength(24);

  // The saved file holds the sealed blob and NO readable answer or age.
  const json = extractVaultJson(savedHtml);
  expect(json).not.toContain(secretAnswer);
  const vault = JSON.parse(json);
  const sealedEntry = vault.entries.find(
    (e: { sealed?: unknown }) => e.sealed != null,
  );
  expect(sealedEntry).toBeTruthy();
  expect(sealedEntry.answers).toBeUndefined();
  expect(sealedEntry.childAgeYears).toBeUndefined();
  expect(Object.keys(sealedEntry.sealed).sort()).toEqual([
    "ciphertext",
    "iv",
    "keyHint",
    "sealedAt",
  ]);

  await page.getByRole("button", { name: "I have saved the key" }).click();

  // Reopen the saved file and unseal it: the answer is revealed on screen only.
  const path = join(tmpdir(), `tyl-iv-reopen-${Date.now()}.html`);
  writeFileSync(path, savedHtml);
  await page.goto(pathToFileURL(path).href);
  await page.getByRole("button", { name: /Sealed letter/ }).click();
  await page.getByLabel("Type your 24 words").fill(words.join(" "));
  await page.getByRole("button", { name: "Open this letter" }).click();
  await expect(page.getByText(secretAnswer)).toBeVisible();
  await expect(page.getByText(EARLY_SCHOOL_Q)).toBeVisible();
});

test("the birthday nudge shows, opens the interview, and dismisses", async ({ page }) => {
  const url = writeSeededArtifact(
    seededVault({ child: { name: "Mira", birthDate: birthDateOnTodayForAge(5) } }, [
      letter("l1", "2026-01-01T00:00:00.000Z", "A letter"),
    ]),
    "iv-nudge",
  );
  await page.goto(url);

  const nudge = page.getByRole("heading", { name: "Time for this year's interview." });
  await expect(nudge).toBeVisible();

  // Its action opens the interview.
  await page.getByRole("button", { name: "Record this year's interview" }).click();
  await expect(page.getByRole("heading", { name: "Interview at age 5" })).toBeVisible();

  // Reload: it shows again, then "Not now" dismisses it for the session.
  await page.goto(url);
  await expect(nudge).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(nudge).toHaveCount(0);
});

test("the nudge is absent once this year's interview is recorded", async ({ page }) => {
  await page.goto(
    writeSeededArtifact(
      seededVault({ child: { name: "Mira", birthDate: birthDateOnTodayForAge(5) } }, [
        {
          id: "iv1",
          type: "interview",
          createdAt: "2026-01-01T00:00:00.000Z",
          occasion: "",
          title: "Interview at age 5",
          body: "",
          photos: [],
          childAgeYears: 5,
          answers: [{ promptId: "early-school-1", promptText: EARLY_SCHOOL_Q, answerText: "yes" }],
        },
      ]),
      "iv-nudge-absent",
    ),
  );
  await expect(page.getByRole("heading", { name: "Time for this year's interview." })).toHaveCount(
    0,
  );
});

test("the interview and the nudge fit a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const url = writeSeededArtifact(
    seededVault({ child: { name: "Mira", birthDate: birthDateOnTodayForAge(5) } }, [
      letter("l1", "2026-01-01T00:00:00.000Z", "A letter"),
    ]),
    "iv-mobile",
  );
  await page.goto(url);

  // The archive with the nudge does not scroll sideways, and both nudge controls
  // are comfortably tappable.
  const noScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(await noScroll()).toBe(true);
  for (const name of ["Record this year's interview", "Not now"]) {
    const box = (await page.getByRole("button", { name }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  // The interview view itself fits too.
  await page.getByRole("button", { name: "Record this year's interview" }).click();
  await expect(page.getByRole("heading", { name: "Interview at age 5" })).toBeVisible();
  expect(await noScroll()).toBe(true);
  const saveBox = (await page.getByRole("button", { name: "Save this interview" }).boundingBox())!;
  expect(saveBox.height).toBeGreaterThanOrEqual(44);
});
