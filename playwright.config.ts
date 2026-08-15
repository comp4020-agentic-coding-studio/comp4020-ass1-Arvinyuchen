import { defineConfig, devices } from "@playwright/test";

// The two viewports CLAUDE.md says the site is marked at, both counting in
// full. These are real browser viewports rather than the `<iframe>` trick the
// harness notes elsewhere: that workaround exists because this machine's window
// manager silently clamps `resize_window`, and Playwright sets its own viewport
// in a headless browser, so the clamp doesn't apply.
const DESKTOP = { width: 1920, height: 1080 };
const PHONE = { width: 390, height: 844 };

// `astro preview` serves the built site under the configured `base`, which is
// the only way to exercise the deployed asset URLs locally — opening
// `dist/index.html` off the filesystem would 404 every island chunk for the same
// reason linkinator does.
//
// The port is pinned and passed to the server explicitly rather than left at
// Astro's default. Astro walks upward from 4321 when the port is busy, and on
// this machine an unrelated local server holds it — so the default silently
// serves on 4322 or 4323 and every spec fails to connect to a URL that was only
// ever a guess.
const PORT = 4329;
const BASE_URL = `http://localhost:${PORT}/comp4020-ass1-Arvinyuchen/`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: DESKTOP },
    },
    {
      name: "phone",
      use: { ...devices["Desktop Chrome"], viewport: PHONE },
    },
    {
      // A third pass over the same specs with motion disabled at the browser
      // level, so "reduced motion still reaches the same end state" is checked
      // against the real media query rather than a mocked one. As of Playwright
      // 1.62 `reducedMotion` is a `contextOptions` key, not a top-level `use`
      // one — setting it directly on `use` fails typecheck.
      name: "desktop-reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        viewport: DESKTOP,
        contextOptions: { reducedMotion: "reduce" },
      },
    },
  ],

  webServer: {
    command: `pnpm preview --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
