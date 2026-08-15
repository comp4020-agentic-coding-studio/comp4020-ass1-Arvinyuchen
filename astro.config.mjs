import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Repo is served under the org's Pages domain at a repo-scoped path
// (comp4020-agentic-coding-studio.github.io/comp4020-ass1-Arvinyuchen/), so
// `base` must be set explicitly — Astro doesn't default to relative URLs the
// way the previous Vite setup did, and a missing base 404s every asset once
// deployed even though it looks fine locally.
export default defineConfig({
  site: "https://comp4020-agentic-coding-studio.github.io",
  base: "/comp4020-ass1-Arvinyuchen",

  // The chapter visualisations are React islands: each one holds real state
  // (selected query row, scaling on/off, scroll stage) that has to survive
  // re-render, which the previous hand-rolled `interactive.ts` couldn't express
  // without turning into a bespoke framework.
  integrations: [react()],

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

  vite: {
    build: {
      // Same trap as the stylesheet above, in the tag nobody hand-writes: Astro
      // inlines a hoisted <script> only while its bundle is under this limit
      // (4 KB by default), and past it emits
      // <script src="/comp4020-ass1-Arvinyuchen/_astro/*.js">, which is correct
      // once deployed but 404s under CI's `linkinator ./dist` crawl. Raised so
      // adding a few lines of client code can't silently break the links check.
      //
      // This limit is no longer sufficient on its own. A `client:*` island is
      // emitted as a separate module chunk plus a renderer entrypoint no matter
      // how high the limit goes — inlining can't apply to a module graph that
      // has to import across chunks. So the base-prefixed `_astro/` URLs are
      // now exempted in linkinator.config.json instead. The limit stays because
      // it still keeps the non-island hoisted script inline.
      assetsInlineLimit: 65536,
    },
  },
});
