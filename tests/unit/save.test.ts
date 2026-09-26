import { beforeEach, describe, expect, it } from "vitest";
import { captureTemplate, VAULT_BEGIN, VAULT_END } from "../../src/template";
import { SaveController, applySaveMeta, type SaveDeps } from "../../src/save";
import { emptyVault, parseVault, type Vault } from "../../src/vault";

const TEMPLATE =
  "<!DOCTYPE html>\n<html><head></head><body><div id=\"app\"></div>\n" +
  VAULT_BEGIN +
  '\n<script id="vault-data" type="application/json">{}</script>\n' +
  VAULT_END +
  "\n<script type=\"module\">/*app*/</script></body></html>";

function extractJson(html: string): string {
  const m = html.match(/<script id="vault-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no vault-data block");
  return m[1];
}

function vaultWithLetter(): Vault {
  const v = emptyVault();
  v.entries.push({
    id: "e1",
    type: "letter",
    createdAt: "2026-03-03T21:00:00.000Z",
    title: "Hello",
    body: "Body </script> text",
  });
  return v;
}

type Harness = {
  deps: SaveDeps;
  written: string[];
  picks: number;
  setDisk: (g: number) => void;
};

function fsaHarness(initialDisk: number): Harness {
  const written: string[] = [];
  let disk = initialDisk;
  return {
    written,
    picks: 0,
    setDisk: (g) => {
      disk = g;
    },
    deps: {
      now: () => "2026-03-03T21:14:00.000Z",
      supportsFsa: () => true,
      pickSaveFile: async function (this: Harness) {
        return {
          getFile: async () => ({ text: async () => "" }),
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        };
      },
      readDiskGeneration: async () => disk,
      writeFile: async (_h, contents) => {
        written.push(contents);
      },
      triggerDownload: () => {},
    },
  };
}

describe("applySaveMeta", () => {
  it("stamps generation, saved time, and mints fileId only when empty", () => {
    const v = emptyVault();
    const first = applySaveMeta(v, 1, "2026-03-03T21:14:00.000Z", () => "minted");
    expect(first.generation).toBe(1);
    expect(first.savedAt).toBe("2026-03-03T21:14:00.000Z");
    expect(first.fileId).toBe("minted");
    const second = applySaveMeta(first, 2, "2026-03-04T09:00:00.000Z", () => "other");
    expect(second.fileId).toBe("minted");
  });
});

describe("SaveController file-system path", () => {
  beforeEach(() => captureTemplate(TEMPLATE));

  it("picks a file on first save, writes, and confirms", async () => {
    const h = fsaHarness(-1);
    const c = new SaveController(0, h.deps, () => "minted-id");
    expect(c.needsFilePick()).toBe(true);
    const result = await c.save(vaultWithLetter());
    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;
    expect(result.via).toBe("fsAccess");
    expect(result.vault.generation).toBe(1);
    expect(result.vault.fileId).toBe("minted-id");
    expect(h.written).toHaveLength(1);
    expect(c.needsFilePick()).toBe(false);
    // Round-trip: the written file parses back to the letter.
    const round = parseVault(extractJson(h.written[0]));
    expect(round.entries[0].body).toBe("Body </script> text");
  });

  it("warns and blocks the write when the disk copy is newer", async () => {
    const h = fsaHarness(7);
    const c = new SaveController(5, h.deps, () => "id");
    const result = await c.save(vaultWithLetter());
    expect(result).toEqual({ status: "stale", diskGeneration: 7, myGeneration: 5 });
    expect(h.written).toHaveLength(0);
    expect(c.baselineGeneration).toBe(5);
  });

  it("replaces the disk copy above both generations when the parent chooses", async () => {
    const h = fsaHarness(7);
    const c = new SaveController(5, h.deps, () => "id");
    await c.save(vaultWithLetter());
    const result = await c.saveReplacingDisk(vaultWithLetter());
    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;
    expect(result.vault.generation).toBe(8);
    expect(h.written).toHaveLength(1);
  });
});

describe("SaveController download path", () => {
  beforeEach(() => captureTemplate(TEMPLATE));

  it("downloads a fresh copy and bumps the generation", async () => {
    let downloaded: { name: string; contents: string } | null = null;
    const deps: Partial<SaveDeps> = {
      now: () => "2026-03-03T21:14:00.000Z",
      supportsFsa: () => false,
      triggerDownload: (name, contents) => {
        downloaded = { name, contents };
      },
    };
    const c = new SaveController(3, deps, () => "id");
    const result = await c.save(vaultWithLetter());
    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;
    expect(result.via).toBe("download");
    expect(result.vault.generation).toBe(4);
    expect(downloaded).not.toBeNull();
    expect(downloaded!.name).toBe("the-twenty-year-letter.html");
    const round = parseVault(extractJson(downloaded!.contents));
    expect(round.entries[0].title).toBe("Hello");
  });
});
