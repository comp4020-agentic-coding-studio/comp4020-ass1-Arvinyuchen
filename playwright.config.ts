import { defineConfig, devices } from "@playwright/test";

// The two viewports CLAUDE.md says the site is marked at, both counting in
// full. These are real browser viewports rather than the `<iframe>` trick the
// harness notes elsewhere: that workaround exists because this machine's window
// manager silently clamps `resize_window`, and Playwright sets its own viewport
// in a headless browser, so the clamp doesn't apply.
const DESKTOP = { width: 1920, height: 1080 };
const PHONE = { width: 390, height: 844 };

// The specs run against the built site served under its deployed base path,
// which is the only way to exercise the real island-chunk URLs — opening
// `dist/index.html` off the filesystem would 404 every one of them, for the same
// reason linkinator does.
//
// `astro preview` cannot do this job: it daemonises when it has no TTY, which is
// exactly how Playwright launches it, so the parent exits and Playwright reports
// "Process from config.webServer exited early" while the server is actually up.
// `scripts/preview-server.ts` is a foreground equivalent — see the note at the
// top of that file.
//
// The port is pinned rather than left to a default. Astro walks upward from 4321
// when the port is busy, and an unrelated local server holds 4321 on this
// machine, so a default would have silently served on 4322 and left every spec
// failing against a URL that was only ever a guess.
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
    command: `node scripts/preview-server.ts --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
