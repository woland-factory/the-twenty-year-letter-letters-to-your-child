import { describe, expect, it } from "vitest";
import { qrSvg } from "../../src/qr";

const MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank year " +
  "wave sausage worth useful legal winner thank year wave sausage worth title";

describe("qrSvg", () => {
  it("is deterministic for the same text", () => {
    expect(qrSvg(MNEMONIC)).toBe(qrSvg(MNEMONIC));
  });

  it("returns a non-empty SVG with a dark path", () => {
    const svg = qrSvg(MNEMONIC);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox");
    expect(svg).toContain('<path d="M');
    expect(svg).toContain("</svg>");
  });

  it("differs for different content", () => {
    expect(qrSvg(MNEMONIC)).not.toBe(qrSvg(MNEMONIC + " extra"));
  });
});
