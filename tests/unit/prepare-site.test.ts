import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs build helper, no type declarations
import { renderLanding } from "../../scripts/prepare-site.mjs";

const TEMPLATE =
  '<head><!--TYL:SITE-HEAD--></head>' +
  '<a href="the-twenty-year-letter.html<!--TYL:DEMO-QUERY-->">Try it live</a>';

describe("renderLanding", () => {
  it("adds the demo query only when SEED_DEMO is set", () => {
    expect(renderLanding(TEMPLATE, { SEED_DEMO: "true" })).toContain(
      "the-twenty-year-letter.html?demo=1",
    );
    const plain = renderLanding(TEMPLATE, {});
    expect(plain).toContain('href="the-twenty-year-letter.html"');
    expect(plain).not.toContain("demo=1");
  });

  it("wires umami only when both url and id are present", () => {
    const out = renderLanding(TEMPLATE, {
      UMAMI_URL: "https://analytics.example/script.js",
      UMAMI_WEBSITE_ID: "abc-123",
    });
    expect(out).toContain('data-website-id="abc-123"');
    expect(out).toContain("https://analytics.example/script.js");

    const missingId = renderLanding(TEMPLATE, { UMAMI_URL: "https://analytics.example/script.js" });
    expect(missingId).not.toContain("data-website-id");
  });

  it("wires the sentry dsn only when set", () => {
    const out = renderLanding(TEMPLATE, { SENTRY_DSN: "https://key@errors.example/42" });
    expect(out).toContain('name="sentry-dsn"');
    expect(out).toContain("https://key@errors.example/42");
    expect(renderLanding(TEMPLATE, {})).not.toContain("sentry-dsn");
  });
});
