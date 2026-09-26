import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  ARTIFACT_URL,
  MOCK_FSA,
  attachGeneratedImage,
  extractVaultJson,
  writeSeededArtifact,
} from "./helpers";

// A valid BIP39 24-word phrase that is NOT the sealed entry's key.
const OTHER_VALID_MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank year " +
  "wave sausage worth useful legal winner thank year wave sausage worth title";
// 24 words that fail the checksum, so they never reach decryption.
const BAD_CHECKSUM = Array(24).fill("abandon").join(" ");

function reopenFrom(html: string, tag: string): string {
  const path = join(tmpdir(), `tyl-seal-${tag}-${Date.now()}.html`);
  writeFileSync(path, html);
  return pathToFileURL(path).href;
}

// Fill the editor, open the seal dialog, and confirm. Returns the 24 words shown
// on the key sheet and the saved file's HTML (from the simulated disk on
// Chromium, or the download on the other engines).
async function performSeal(
  page: Page,
  browserName: string,
  opts: { title: string; body: string; keyHint: string; withPhoto?: boolean },
): Promise<{ words: string[]; savedHtml: string }> {
  await page.getByRole("button", { name: "Write a letter" }).click();
  await page.getByLabel("Title").fill(opts.title);
  await page.getByLabel("Your letter").fill(opts.body);
  if (opts.withPhoto) {
    await attachGeneratedImage(page, { width: 480, height: 320 });
    await expect(page.locator(".photo-grid img")).toHaveCount(1);
  }

  await page.getByRole("button", { name: "Seal this letter" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByLabel("Where will you keep the key?").fill(opts.keyHint);
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
    const p = join(tmpdir(), `tyl-seal-dl-${Date.now()}.html`);
    await download.saveAs(p);
    savedHtml = readFileSync(p, "utf8");
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toBeVisible();
  }

  const words = await page.locator(".word-text").allInnerTexts();
  expect(words).toHaveLength(24);
  return { words, savedHtml };
}

// The signature round-trip, proven on every engine from file:// (crypto.subtle
// is the load-bearing assumption). Seal a letter with a photo, reopen the saved
// file as a different machine, and open it with the typed 24 words.
test.describe("seal and open with the 24 words", () => {
  test("seals, saves, and opens on another machine from the words", async ({
    page,
    browserName,
  }) => {
    if (browserName === "chromium") await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    const { words, savedHtml } = await performSeal(page, browserName, {
      title: "For your eighteenth birthday",
      body: "Dear Mira,\n\nOpen this when you are grown. Love, Dad.",
      keyHint: "In your 18th birthday card",
      withPhoto: true,
    });

    await page.getByRole("button", { name: "I have saved the key" }).click();

    // A different machine: a fresh load of the saved file.
    await page.goto(reopenFrom(savedHtml, "words"));
    const sealedRow = page.getByRole("button", { name: /Sealed letter/ });
    await expect(sealedRow).toBeVisible();
    await expect(page.getByText("In your 18th birthday card")).toBeVisible();
    await expect(page.getByText("For your eighteenth birthday")).toHaveCount(0);

    await sealedRow.click();
    await expect(page.getByText("Where the key lives: In your 18th birthday card")).toBeVisible();
    await page.getByLabel("Type your 24 words").fill(words.join(" "));
    await expect(page.getByText("24 of 24 words")).toBeVisible();
    await page.getByRole("button", { name: "Open this letter" }).click();

    await expect(page.getByText("For your eighteenth birthday")).toBeVisible();
    await expect(page.getByText("Open this when you are grown.")).toBeVisible();
    const photo = page.locator(".reveal-photo");
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });
});

// The rest run once (Chromium): behavior that does not depend on the save path.
test.describe("seal details", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "one run is enough");

  test("opens a sealed letter from a photo of the QR", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await performSeal(page, "chromium", {
      title: "The QR path",
      body: "Scanned open, not typed.",
      keyHint: "grandma's drawer",
    });

    // Rasterize the key sheet's own QR (the bundled encoder) to a PNG.
    const qrPng = await page.evaluate(async () => {
      const svg = document.querySelector(".qr svg")!;
      const xml = new XMLSerializer().serializeToString(svg);
      const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = svgUrl;
      });
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      return canvas.toDataURL("image/png");
    });

    const savedHtml = await page.evaluate(
      () => (window as unknown as { __tylDisk: string }).__tylDisk,
    );
    await page.getByRole("button", { name: "I have saved the key" }).click();

    await page.goto(reopenFrom(savedHtml, "qr"));
    await page.getByRole("button", { name: /Sealed letter/ }).click();

    // Feed the QR photo to the unseal file input.
    await page.evaluate((dataUrl) => {
      const b64 = dataUrl.split(",")[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], "qr.png", { type: "image/png" });
      const input = document.querySelector(
        'input[aria-label="Photo of your QR code"]',
      ) as HTMLInputElement;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, qrPng);

    await expect(page.getByText("The QR path")).toBeVisible();
    await expect(page.getByText("Scanned open, not typed.")).toBeVisible();
  });

  test("the saved file holds no readable letter content", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    const secretTitle = "SECRET_TITLE_TOKEN";
    const secretBody = "SECRET_BODY_TOKEN inside the letter";
    await performSeal(page, "chromium", {
      title: secretTitle,
      body: secretBody,
      keyHint: "the drawer",
    });

    const disk = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
    const json = extractVaultJson(disk);
    expect(json).not.toContain(secretTitle);
    expect(json).not.toContain("SECRET_BODY_TOKEN");

    const vault = JSON.parse(json);
    const entry = vault.entries[0];
    expect(entry.title).toBe("");
    expect(entry.body).toBe("");
    expect(entry.occasion).toBe("");
    expect(entry.photos).toEqual([]);
    expect(Object.keys(entry.sealed).sort()).toEqual(["ciphertext", "iv", "keyHint", "sealedAt"]);
  });

  test("seal and unseal make zero external network requests", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("http://") || url.startsWith("https://")) external.push(url);
    });

    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    const { words, savedHtml } = await performSeal(page, "chromium", {
      title: "No network",
      body: "Not a single request.",
      keyHint: "the drawer",
    });
    await page.getByRole("button", { name: "I have saved the key" }).click();

    await page.goto(reopenFrom(savedHtml, "nonet"));
    await page.getByRole("button", { name: /Sealed letter/ }).click();
    await page.getByLabel("Type your 24 words").fill(words.join(" "));
    await page.getByRole("button", { name: "Open this letter" }).click();
    await expect(page.getByText("Not a single request.")).toBeVisible();

    expect(external, `unexpected network requests: ${external.join(", ")}`).toHaveLength(0);
  });

  test("the seal dialog warns and gates confirmation deliberately", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("Deliberate");
    await page.getByLabel("Your letter").fill("body");
    await page.getByRole("button", { name: "Seal this letter" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("A lost key means this letter cannot be opened")).toBeVisible();
    await expect(dialog.getByText("the book prints only unsealed letters")).toBeVisible();

    const confirm = page.getByRole("button", { name: "Seal and show my key" });
    await expect(confirm).toBeDisabled();
    await page.getByLabel("I have a safe place for the key.").check();
    await expect(confirm).toBeEnabled();

    // Escape cancels, it never confirms. The letter stays open in the editor.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toHaveCount(0);
    await expect(page.getByLabel("Title")).toHaveValue("Deliberate");
  });

  test("the key sheet prints on one page with app chrome hidden", async ({ page }) => {
    await page.addInitScript(MOCK_FSA);
    await page.goto(ARTIFACT_URL);

    await performSeal(page, "chromium", {
      title: "Printable",
      body: "one page",
      keyHint: "the drawer",
    });

    await expect(page.getByText("Your 24 words")).toBeVisible();
    await expect(page.getByLabel("QR code of your 24 words")).toBeVisible();
    await expect(page.getByText("Where the key lives: the drawer")).toBeVisible();

    await page.emulateMedia({ media: "print" });
    // The key sheet is visible; app chrome (the topbar brand) is not painted.
    const keySheet = page.locator(".key-sheet");
    await expect(keySheet).toBeVisible();
    const chromeVisible = await page
      .locator(".brand")
      .first()
      .evaluate((el) => getComputedStyle(el).visibility);
    expect(chromeVisible).toBe("hidden");

    // The key sheet fits within one page height (A4 at 96dpi is ~1122px; the
    // print CSS trims padding so words + QR fit).
    const box = await keySheet.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(1000);
  });

  test("a cancelled save leaves the letter unsealed and intact", async ({ page }) => {
    // The picker rejects, standing in for the parent cancelling the save.
    await page.addInitScript(`
      window.__tylDisk = "";
      window.showSaveFilePicker = async () => { const e = new Error("cancel"); e.name = "AbortError"; throw e; };
    `);
    await page.goto(ARTIFACT_URL);

    await page.getByRole("button", { name: "Write a letter" }).click();
    await page.getByLabel("Title").fill("Still mine");
    await page.getByLabel("Your letter").fill("This letter must survive a cancelled seal.");
    await page.getByRole("button", { name: "Seal this letter" }).click();
    await page.getByLabel("Where will you keep the key?").fill("the drawer");
    await page.getByLabel("I have a safe place for the key.").check();
    await page.getByRole("button", { name: "Seal and show my key" }).click();

    await expect(page.getByText("Sealing did not finish. Your letter is unchanged.")).toBeVisible();
    // No key sheet, and the draft is exactly as it was.
    await expect(page.getByRole("heading", { name: "Your key for this letter" })).toHaveCount(0);
    await expect(page.getByLabel("Title")).toHaveValue("Still mine");
    await expect(page.getByLabel("Your letter")).toHaveValue(
      "This letter must survive a cancelled seal.",
    );
    // Nothing was written to the file.
    const disk = await page.evaluate(() => (window as unknown as { __tylDisk: string }).__tylDisk);
    expect(disk).toBe("");
  });

  test("a wrong or mistyped key fails calmly and never changes the file", async ({ page }) => {
    const seededUrl = writeSeededArtifact(
      {
        schemaVersion: 3,
        generation: 2,
        savedAt: "2026-03-03T21:14:00.000Z",
        fileId: "seed-sealed",
        child: null,
        firstRunDone: true,
        entries: [
          {
            id: "sealed-1",
            type: "letter",
            createdAt: "2026-02-14T00:00:00.000Z",
            occasion: "",
            title: "",
            body: "",
            photos: [],
            sealed: {
              iv: "U2fTvI4/n2MwNKVE",
              ciphertext:
                "+8VDyPyGfLUQdFzrVpv93i9w1+QlyfOMRzDGSR6JLolZ3a7tOrWgjICeFqsYwbz5o9LnpgfoUDt7hA4SnbaOhr6CVVAInebZc0tDJupVXmcIA9zjAFpnjBO2WPJpmxGedimIXiliS1SJJRmwKRoigQ8mBe4SGc4GqLy41pXeDQ==",
              keyHint: "In the birthday card",
              sealedAt: "2026-02-14T00:00:00.000Z",
            },
          },
        ],
      },
      "wrongkey",
    );
    await page.goto(seededUrl);
    await page.getByRole("button", { name: /Sealed letter/ }).click();

    // Bad checksum: caught before any decryption.
    await page.getByLabel("Type your 24 words").fill(BAD_CHECKSUM);
    await page.getByRole("button", { name: "Open this letter" }).click();
    await expect(
      page.getByText("Those words do not match. Check each word and try again."),
    ).toBeVisible();

    // A different valid key: decryption fails the auth check.
    await page.getByLabel("Type your 24 words").fill(OTHER_VALID_MNEMONIC);
    await page.getByRole("button", { name: "Open this letter" }).click();
    await expect(
      page.getByText("That key does not open this letter. Check you have the right key sheet."),
    ).toBeVisible();

    // An image with no QR: the calm not-found message.
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#888888";
      ctx.fillRect(0, 0, 64, 64);
      canvas.toBlob((blob) => {
        const file = new File([blob!], "nope.png", { type: "image/png" });
        const input = document.querySelector(
          'input[aria-label="Photo of your QR code"]',
        ) as HTMLInputElement;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, "image/png");
    });
    await expect(
      page.getByText("The code did not scan. Try a clearer photo of your key sheet."),
    ).toBeVisible();

    // The letter never revealed and the entry stays sealed.
    await expect(page.getByText("This letter is open only on this screen.")).toHaveCount(0);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("button", { name: /Sealed letter/ })).toBeVisible();
  });

  test("a sealed entry shows as a locked placeholder next to open letters", async ({ page }) => {
    const seededUrl = writeSeededArtifact(
      {
        schemaVersion: 3,
        generation: 2,
        savedAt: "2026-03-03T21:14:00.000Z",
        fileId: "seed-mix",
        child: null,
        firstRunDone: true,
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
          {
            id: "sealed-1",
            type: "letter",
            createdAt: "2026-02-14T00:00:00.000Z",
            occasion: "",
            title: "",
            body: "",
            photos: [],
            sealed: {
              iv: "U2fTvI4/n2MwNKVE",
              ciphertext: "+8VDyPyGfLUQdFzrVpv93i9w1+QlyfOMRzDGSR6JLolZ3a7tOrWgjICeFqsYwbz5o9Lnpgf",
              keyHint: "In the birthday card",
              sealedAt: "2026-02-14T00:00:00.000Z",
            },
          },
        ],
      },
      "placeholder",
    );
    await page.goto(seededUrl);

    await expect(page.getByText("Sealed letter")).toBeVisible();
    await expect(page.getByText("In the birthday card")).toBeVisible();
    // The open letter still renders normally; the sealed one leaks no content.
    await expect(page.getByText("An open letter")).toBeVisible();
    await expect(page.locator(".entry-sealed .entry-thumb")).toHaveCount(0);
    // Both entries counted honestly.
    await expect(page.getByText(/2 letters\./)).toBeVisible();
  });
});
