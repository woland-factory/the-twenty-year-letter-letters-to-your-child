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
    launchOptions: { args: ["--no-sandbox"] },
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
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Firefox has no File System Access API, so it exercises the real
    // download-and-replace path end to end.
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
