import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Tests for the assignment-1 brief (interactive explainer of one idea),
// alongside the shipped spec/invariants.test.ts. See spec/README.md and
// CLAUDE.md's "This week: the Transformer stepper" section for the data-*
// vocabulary asserted here.
//
// JSDOM parses the built HTML but never executes scripts, so this suite can
// only prove the markup contract (right elements, right initial state) —
// not that clicking a tab actually swaps the panel. That's verified by hand
// in Chrome at both marking viewports; see CLAUDE.md.

const STAGE_IDS = [
  "embedding",
  "positional-encoding",
  "self-attention",
  "feed-forward",
] as const;

const TOKENS = ["the", "cat", "sat", "down"] as const;

const HEAD_COUNT = 8;

function loadBuiltPage() {
  const distPath = resolve("dist/index.html");
  expect(
    existsSync(distPath),
    "dist/index.html not found — run `pnpm build` first",
  ).toBe(true);
  return new JSDOM(readFileSync(distPath, "utf8")).window.document;
}

describe("the core interaction: the four-stage tablist", () => {
  it("has a tablist trigger with exactly the four stage tabs", () => {
    const doc = loadBuiltPage();

    const trigger = doc.querySelector("[data-testid='interaction-trigger']");
    expect(
      trigger,
      "No interaction trigger yet — this is the one strong idea the brief asks for.",
    ).toBeTruthy();

    const tabs = trigger!.querySelectorAll("button[role='tab']");
    expect(tabs.length, "expected one tab button per stage").toBe(
      STAGE_IDS.length,
    );

    const tabStages = [...tabs].map((tab) => tab.getAttribute("data-stage"));
    expect(new Set(tabStages)).toEqual(new Set(STAGE_IDS));

    for (const tab of tabs) {
      expect(
        tab.hasAttribute("aria-selected"),
        `tab ${tab.getAttribute("data-stage")} is missing aria-selected`,
      ).toBe(true);
    }
  });

  it("announces stage changes via an aria-live status line", () => {
    const doc = loadBuiltPage();
    expect(doc.querySelector("[aria-live='polite']")).toBeTruthy();
  });
});

describe("the core interaction: stage panels", () => {
  it("has one panel per stage, with only the first stage visible", () => {
    const doc = loadBuiltPage();

    const panels = doc.querySelectorAll("[data-stage-panel]");
    expect(panels.length, "expected one panel per stage").toBe(
      STAGE_IDS.length,
    );

    const panelStages = [...panels].map((panel) =>
      panel.getAttribute("data-stage"),
    );
    expect(new Set(panelStages)).toEqual(new Set(STAGE_IDS));

    const visible = [...panels].filter((panel) => !panel.hasAttribute("hidden"));
    expect(visible.length, "exactly one panel should start visible").toBe(1);
    expect(visible[0]!.getAttribute("data-stage")).toBe(STAGE_IDS[0]);

    for (const panel of panels) {
      const isVisible = !panel.hasAttribute("hidden");
      expect(panel.getAttribute("aria-hidden")).toBe(isVisible ? "false" : "true");
    }
  });
});

describe("the core interaction: the architecture diagram", () => {
  it("has a diagram block per stage, with the first stage marked active", () => {
    const doc = loadBuiltPage();

    const blocks = doc.querySelectorAll("[data-diagram-block]");
    expect(
      blocks.length,
      "expected one diagram block per stage",
    ).toBe(STAGE_IDS.length);

    const active = [...blocks].filter(
      (block) => block.getAttribute("data-active") === "true",
    );
    expect(active.length, "exactly one diagram block should start active").toBe(1);
    expect(active[0]!.getAttribute("data-diagram-block")).toBe(STAGE_IDS[0]);
  });
});

describe("the core interaction: self-attention re-query controls", () => {
  it("has one button per toy token and one per attention head", () => {
    const doc = loadBuiltPage();

    const tokenButtons = doc.querySelectorAll("[data-token]");
    expect(tokenButtons.length, "expected one button per toy token").toBe(
      TOKENS.length,
    );
    const tokenValues = [...tokenButtons].map((b) => b.getAttribute("data-token"));
    expect(new Set(tokenValues)).toEqual(new Set(TOKENS));
    for (const button of tokenButtons) {
      expect(button.hasAttribute("aria-pressed")).toBe(true);
    }

    const headButtons = doc.querySelectorAll("[data-head]");
    expect(headButtons.length, "expected one button per attention head").toBe(
      HEAD_COUNT,
    );
  });
});

describe("the core interaction: positional encoding slider", () => {
  it("has a range input bounding a sane position span", () => {
    const doc = loadBuiltPage();

    const slider = doc.querySelector("input[type='range']");
    expect(slider, "no position slider found").toBeTruthy();
    const min = Number(slider!.getAttribute("min"));
    const max = Number(slider!.getAttribute("max"));
    expect(max).toBeGreaterThan(min);
  });
});
