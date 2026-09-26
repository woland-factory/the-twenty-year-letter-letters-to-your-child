import { beforeEach, describe, expect, it } from "vitest";
import {
  captureTemplate,
  serialize,
  VAULT_BEGIN,
  VAULT_END,
} from "../../src/template";
import { emptyVault, parseVault, type Vault } from "../../src/vault";

const TEMPLATE =
  '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"></head><body>' +
  '<div id="app"></div>\n' +
  VAULT_BEGIN +
  '\n<script id="vault-data" type="application/json">{}</script>\n' +
  VAULT_END +
  '\n<script type="module">console.log("app code")</script></body></html>';

function extractJson(html: string): string {
  const m = html.match(/<script id="vault-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no vault-data block");
  return m[1];
}

function withEntries(n: number): Vault {
  const v = emptyVault();
  for (let i = 0; i < n; i++) {
    v.entries.push({
      id: `e${i}`,
      type: "letter",
      createdAt: "2026-01-01T00:00:00.000Z",
      occasion: `Occasion ${i}`,
      title: `Letter ${i}`,
      body: `Body ${i}`,
      photos: [
        {
          id: `p${i}`,
          dataUrl: "data:image/jpeg;base64,/9j/AAAB",
          caption: `Caption ${i}`,
          w: 1600,
          h: 1067,
          bytes: 12345,
        },
      ],
    });
  }
  v.generation = n;
  v.savedAt = "2026-03-03T21:14:00.000Z";
  v.fileId = "file-1";
  return v;
}

describe("serialize", () => {
  beforeEach(() => captureTemplate(TEMPLATE));

  it("round-trips through parseVault for 0, 1, and several letters", () => {
    for (const n of [0, 1, 5]) {
      const v = withEntries(n);
      const round = parseVault(extractJson(serialize(v)));
      expect(round).toEqual(v);
    }
  });

  it("round-trips bodies with script-breaking and unicode content", () => {
    const v = withEntries(1);
    v.entries[0].body =
      'Contains </script> and <!-- comment --> and "quotes" and \n newlines and emoji 🎈 and <div>';
    const output = serialize(v);
    // No literal closing tag can appear inside the JSON payload.
    const inner = extractJson(output);
    expect(inner).not.toContain("</script>");
    expect(inner).not.toContain("<!--");
    const round = parseVault(inner);
    expect(round.entries[0].body).toBe(v.entries[0].body);
  });

  it("round-trips photo captions with script-breaking and unicode content", () => {
    const v = withEntries(1);
    v.entries[0].photos[0].caption =
      'A caption with </script> and <!-- --> and "quotes" and \n newlines and emoji 📷';
    const inner = extractJson(serialize(v));
    expect(inner).not.toContain("</script>");
    expect(inner).not.toContain("<!--");
    const round = parseVault(inner);
    expect(round).toEqual(v);
    expect(round.entries[0].photos[0].caption).toBe(v.entries[0].photos[0].caption);
  });

  it("is byte-stable: the same vault serializes identically twice", () => {
    const v = withEntries(3);
    expect(serialize(v)).toBe(serialize(v));
  });

  it("keeps head and tail byte-identical when only entries differ", () => {
    const a = serialize(withEntries(1));
    const b = serialize(withEntries(4));
    expect(a.split(VAULT_BEGIN)[0]).toBe(b.split(VAULT_BEGIN)[0]);
    expect(a.split(VAULT_END)[1]).toBe(b.split(VAULT_END)[1]);
    // The app code (a distinctive marker in the tail) survives untouched.
    expect(a).toContain('console.log("app code")');
    expect(b).toContain('console.log("app code")');
  });

  it("throws loudly when the markers are missing", () => {
    expect(() => captureTemplate("<html>no markers</html>")).toThrow();
  });

  it("round-trips a vault with a sealed entry", () => {
    const v = emptyVault();
    v.entries.push({
      id: "s1",
      type: "letter",
      createdAt: "2026-02-14T00:00:00.000Z",
      occasion: "",
      title: "",
      body: "",
      photos: [],
      sealed: {
        iv: "AAAAAAAAAAAAAAAA",
        ciphertext: "Y2lwaGVydGV4dA==",
        keyHint: "In the birthday card",
        sealedAt: "2026-02-14T00:00:00.000Z",
      },
    });
    v.generation = 1;
    v.savedAt = "2026-02-14T00:00:00.000Z";
    v.fileId = "file-s";
    const round = parseVault(extractJson(serialize(v)));
    expect(round).toEqual(v);
    // Byte-stable across two serializations.
    expect(serialize(v)).toBe(serialize(v));
  });

  it("fixes the sealed blob key order regardless of input order", () => {
    const v = emptyVault();
    v.entries.push({
      id: "s1",
      type: "letter",
      createdAt: "2026-02-14T00:00:00.000Z",
      occasion: "",
      title: "",
      body: "",
      photos: [],
      // Deliberately out of the canonical order.
      sealed: {
        sealedAt: "2026-02-14T00:00:00.000Z",
        keyHint: "hint",
        ciphertext: "Y2lwaGVy",
        iv: "AAAAAAAAAAAAAAAA",
      } as Vault["entries"][number]["sealed"],
    });
    const json = extractJson(serialize(v));
    const idx = (k: string) => json.indexOf(`"${k}"`);
    expect(idx("iv")).toBeLessThan(idx("ciphertext"));
    expect(idx("ciphertext")).toBeLessThan(idx("keyHint"));
    expect(idx("keyHint")).toBeLessThan(idx("sealedAt"));
    // And "sealed" comes after "photos" in the entry.
    expect(json.indexOf('"photos"')).toBeLessThan(json.indexOf('"sealed"'));
  });
});
