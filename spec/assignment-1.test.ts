import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Tests for the assignment-1 brief (interactive explainer of one idea),
// alongside the shipped spec/invariants.test.ts. See spec/README.md.

describe("the core interaction", () => {
  // The brief: "the visitor does something that changes what they see —
  // state the core interaction plainly enough to write a test for it."
  // There's no prototype yet, so this starts red on purpose. Once the
  // interaction is decided, replace the selectors below with the real ones
  // and this becomes the test that proves the interaction actually works in
  // the built output, not just in a screenshot.
  it("changes what's on the page when the visitor acts on it", () => {
    const distPath = resolve("dist/index.html");
    expect(
      existsSync(distPath),
      "dist/index.html not found — run `pnpm build` first",
    ).toBe(true);

    const doc = new JSDOM(readFileSync(distPath, "utf8")).window.document;

    // TODO: replace with the element the visitor actually interacts with
    // (e.g. a button, a slider, a form) and the element whose content or
    // state changes as a result. This assertion is a placeholder and will
    // never pass until you do.
    expect(
      doc.querySelector("[data-testid='interaction-trigger']"),
      "No interaction element yet — this is the one strong idea the brief asks for. " +
        "Replace this test once you've decided what it is.",
    ).toBeTruthy();
  });
});
