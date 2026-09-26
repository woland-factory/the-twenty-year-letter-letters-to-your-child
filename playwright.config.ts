import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1, // sanctioned shared-host allowance
  timeout: 60_000, // per-test floor
  expect: { timeout: 15_000 }, // web-first assertion floor
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
  },
  webServer: {
    // Production build of the site, then the static server. SEED_DEMO seeds the
    // live artifact link only; the downloadable file stays empty.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NODE_ENV: "production", SEED_DEMO: "true" },
  },
  projects: [
    // --no-sandbox is a Chromium flag: the shared-host container runs as a
    // non-root user, so Chromium cannot use its sandbox. Firefox and WebKit
    // reject the flag, so it stays scoped to Chromium.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--no-sandbox"] } },
    },
    // Firefox and WebKit have no File System Access API, so they exercise the
    // real download-and-replace path end to end. Both must prove the
    // crypto.subtle seal/unseal round-trip runs from file://, so the third
    // named target engine (Safari/WebKit) is covered too.
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
