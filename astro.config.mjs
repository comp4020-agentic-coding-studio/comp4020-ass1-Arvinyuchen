import { defineConfig } from "astro/config";

// Repo is served under the org's Pages domain at a repo-scoped path
// (comp4020-agentic-coding-studio.github.io/comp4020-ass1-Arvinyuchen/), so
// `base` must be set explicitly — Astro doesn't default to relative URLs the
// way the previous Vite setup did, and a missing base 404s every asset once
// deployed even though it looks fine locally.
export default defineConfig({
  site: "https://comp4020-agentic-coding-studio.github.io",
  base: "/comp4020-ass1-Arvinyuchen",

  build: {
    // All pages land at dist/*.html rather than dist/<name>/index.html, so
    // every page's nav can use the same relative hrefs.
    format: "file",

    // Astro only inlines a stylesheet under ~4 KB by default; past that it
    // emits <link href="/comp4020-ass1-Arvinyuchen/_astro/*.css">, which is
    // correct once deployed but 404s under CI's `linkinator ./dist` crawl of
    // the on-disk tree, where the base prefix doesn't exist.
    inlineStylesheets: "always",
  },
});
