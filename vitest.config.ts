import { defineConfig } from "vitest/config";

// The repo ran without a vitest config until Playwright arrived. It needs one
// now for exactly one reason: vitest's default `include` is
// `**/*.{test,spec}.?(c|m)[jt]s?(x)`, which matches `e2e/*.spec.ts` too, so
// `pnpm check` would try to run the browser specs under jsdom and fail. The
// `exclude` list below is vitest's own default plus `e2e` — overriding
// `exclude` replaces the defaults rather than adding to them, so they have to
// be restated.
export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.astro/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
      "e2e/**",
    ],
  },
});
