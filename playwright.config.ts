import { defineConfig, devices } from "@playwright/test";

/**
 * CI, and `npm run test:e2e:prod`, test the production build via `next start`,
 * because that is what ships. Anything touching cubing.js, workers or dynamic
 * imports must pass there, not only under `next dev` (see docs/roadmap.md).
 * It uses its own port so it never reuses a dev server that happens to be
 * running on 3000.
 */
const prod = !!process.env.CI || process.env.E2E_PROD === "1";
const port = prod ? 3100 : 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: prod ? `npx next start -p ${port}` : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
