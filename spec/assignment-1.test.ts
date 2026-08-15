import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// The week's own contract, alongside the shipped invariants.
//
// Rewritten from the four-stage version. The constants below are still
// hardcoded rather than imported, for the reason recorded in PROCESS.md: the
// course's one exception to "never commit red" covers a spec test landing before
// its implementation, and importing modules that don't exist yet would fail
// typecheck instead, which the exception does not cover. Keeping the expected
// values literal means only the *assertions* are ever red.
//
// One deliberate departure from the old contract: the stepper is no longer a
// tablist. A tablist implies panels that show and hide, and this page's beats are
// always visible — they are what the reader scrolls through. Announcing them as
// tabs would misdescribe the page to a screen reader, so the stepper is a labelled
// group carrying `aria-current="step"`, and that is what is asserted here.

const CHAPTER_IDS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
] as const;

const TOKENS = ["the", "cat", "chased", "the", "small", "mouse"] as const;
const SEQ_LEN = TOKENS.length;

/** Chapters whose visualisation is built. The rest render as inert nav entries,
 * so the page never links to something that isn't there. */
const READY = ["05"] as const;

const CH05_SLUG = "scaled-dot-product";
const CH05_BEATS = ["formula", "queries-and-keys", "one-score", "all-scores", "scaling"] as const;

function loadBuiltPage(): Document {
  const distPath = resolve("dist/index.html");
  expect(existsSync(distPath), "dist/index.html not found — run `pnpm build` first").toBe(true);
  return new JSDOM(readFileSync(distPath, "utf8")).window.document;
}

describe("the worked example is on the page", () => {
  it("shows all six tokens of the sentence, in order, with their positions", () => {
    const doc = loadBuiltPage();
    const tokens = [...doc.querySelectorAll("[data-token][data-position]")];
    expect(tokens).toHaveLength(SEQ_LEN);
    tokens.forEach((node, i) => {
      expect(node.getAttribute("data-token")).toBe(TOKENS[i]);
      expect(node.getAttribute("data-position")).toBe(String(i));
    });
  });

  it("repeats `the`, which is the fact chapter 3 exists to explain", () => {
    const doc = loadBuiltPage();
    const words = [...doc.querySelectorAll("[data-token]")].map((n) =>
      n.getAttribute("data-token"),
    );
    expect(words[0]).toBe("the");
    expect(words[3]).toBe("the");
  });
});

describe("the chapter navigation", () => {
  it("is a real nav landmark carrying the attention glyph", () => {
    const doc = loadBuiltPage();
    const nav = doc.querySelector("nav[data-glyph]");
    expect(nav, "no [data-glyph] nav — the glyph is the page's navigation").not.toBeNull();
  });

  it("renders the glyph from a full attention matrix, with real values", () => {
    const doc = loadBuiltPage();
    const cells = [...doc.querySelectorAll("[data-glyph] [data-cell][data-value]")];
    expect(cells).toHaveLength(SEQ_LEN * SEQ_LEN);
    // Every cell is a probability, and each row of the glyph sums to 1 — the
    // glyph is the matrix, not a picture of one.
    for (let i = 0; i < SEQ_LEN; i++) {
      let rowSum = 0;
      for (let j = 0; j < SEQ_LEN; j++) {
        const cell = doc.querySelector(`[data-glyph] [data-cell="${i},${j}"]`);
        expect(cell, `glyph cell ${i},${j} missing`).not.toBeNull();
        const value = Number(cell!.getAttribute("data-value"));
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        rowSum += value;
      }
      expect(rowSum).toBeCloseTo(1, 4);
    }
  });

  it("lists every chapter", () => {
    const doc = loadBuiltPage();
    const links = [...doc.querySelectorAll("[data-chapter-link]")];
    expect(links).toHaveLength(CHAPTER_IDS.length);
    expect(links.map((n) => n.getAttribute("data-chapter-link"))).toEqual([...CHAPTER_IDS]);
  });

  it("only makes a chapter clickable once it exists", () => {
    const doc = loadBuiltPage();
    for (const id of CHAPTER_IDS) {
      const node = doc.querySelector(`[data-chapter-link="${id}"]`)!;
      if ((READY as readonly string[]).includes(id)) {
        expect(node.tagName, `chapter ${id} should be a link`).toBe("A");
        expect(node.getAttribute("href")).toBe(`#${CH05_SLUG}`);
      } else {
        expect(node.tagName, `chapter ${id} should not be a link yet`).not.toBe("A");
        expect(node.getAttribute("aria-disabled")).toBe("true");
      }
    }
  });

  it("points every chapter link at an element that exists", () => {
    // Guards the failure linkinator's fragment check also guards, but locally and
    // without a network crawl.
    const doc = loadBuiltPage();
    for (const anchor of doc.querySelectorAll("a[data-chapter-link]")) {
      const href = anchor.getAttribute("href")!;
      expect(href.startsWith("#")).toBe(true);
      expect(doc.getElementById(href.slice(1)), `no target for ${href}`).not.toBeNull();
    }
  });
});

describe("chapter 5, the scaled dot-product lab", () => {
  it("is present and addressable by its slug", () => {
    const doc = loadBuiltPage();
    const chapter = doc.querySelector('[data-chapter="05"]');
    expect(chapter).not.toBeNull();
    expect(chapter!.id).toBe(CH05_SLUG);
  });

  it("server-renders the island, so the figure is there without JavaScript", () => {
    const doc = loadBuiltPage();
    expect(doc.querySelector(`[data-viz="${CH05_SLUG}"]`)).not.toBeNull();
  });

  it("has one beat per step, with exactly one active", () => {
    const doc = loadBuiltPage();
    const beats = [...doc.querySelectorAll(".beat[data-stage]")];
    expect(beats).toHaveLength(CH05_BEATS.length);
    expect(beats.map((n) => n.getAttribute("data-stage"))).toEqual([...CH05_BEATS]);
    const active = beats.filter((n) => n.getAttribute("data-stage-active") === "true");
    expect(active, "exactly one beat should start active").toHaveLength(1);
    expect(active[0]!.getAttribute("data-stage")).toBe(CH05_BEATS[0]);
  });

  it("has a stepper whose buttons match the beats, with one current step", () => {
    const doc = loadBuiltPage();
    const trigger = doc.querySelector('[data-testid="interaction-trigger"]');
    expect(trigger, "no interaction trigger — this is the page's core interaction").not.toBeNull();
    expect(trigger!.getAttribute("role")).toBe("group");

    const dots = [...trigger!.querySelectorAll("button[data-stage]")];
    expect(dots).toHaveLength(CH05_BEATS.length);
    expect(dots.map((n) => n.getAttribute("data-stage"))).toEqual([...CH05_BEATS]);

    const current = dots.filter((n) => n.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]!.getAttribute("data-stage")).toBe(CH05_BEATS[0]);

    // The previous arrow starts disabled; the next one does not.
    expect(trigger!.querySelector("[data-step-prev]")!.hasAttribute("disabled")).toBe(true);
    expect(trigger!.querySelector("[data-step-next]")!.hasAttribute("disabled")).toBe(false);
  });

  it("announces the step through a live region", () => {
    const doc = loadBuiltPage();
    expect(doc.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("renders Q and K as tables with a row per token and a header per column", () => {
    const doc = loadBuiltPage();
    for (const name of ["q", "k"]) {
      const matrix = doc.querySelector(`[data-matrix="${name}"]`);
      expect(matrix, `no [data-matrix="${name}"]`).not.toBeNull();
      expect(matrix!.querySelector("table[data-table-view]")).not.toBeNull();
      expect(matrix!.querySelectorAll("tbody tr")).toHaveLength(SEQ_LEN);
      // d_k = 2, so two columns of numbers per token.
      expect(matrix!.querySelectorAll('tbody tr[data-row="0"] td[data-cell]')).toHaveLength(2);
      const rowHeads = [...matrix!.querySelectorAll("th[scope='row']")].map((n) =>
        n.textContent?.trim(),
      );
      expect(rowHeads).toEqual([...TOKENS]);
    }
  });

  it("gives every numeric cell a machine-readable value alongside the visible text", () => {
    // The data-viz relief rule: colour is never the only channel. Every cell
    // carries both a rendered number and the unrounded value.
    const doc = loadBuiltPage();
    const cells = [...doc.querySelectorAll('[data-matrix="q"] td[data-cell]')];
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.getAttribute("data-value")).toMatch(/^-?\d+\.\d+$/);
      expect(cell.textContent!.trim().length).toBeGreaterThan(0);
    }
  });

  it("sets up the equation as addressable slots", () => {
    const doc = loadBuiltPage();
    for (const slot of ["softmax", "qk", "scale", "v"]) {
      expect(
        doc.querySelector(`[data-slot="${slot}"]`),
        `no [data-slot="${slot}"] — the formula is the diagram, so each term is a slot`,
      ).not.toBeNull();
    }
  });

  it("offers a query picker with one option per token", () => {
    const doc = loadBuiltPage();
    const buttons = [...doc.querySelectorAll("[data-query-select]")];
    expect(buttons).toHaveLength(SEQ_LEN);
    for (const button of buttons) {
      expect(button.hasAttribute("aria-pressed")).toBe(true);
    }
    const pressed = buttons.filter((n) => n.getAttribute("aria-pressed") === "true");
    expect(pressed, "exactly one query should be selected on load").toHaveLength(1);
  });
});

describe("accessibility floor", () => {
  it("labels every matrix", () => {
    const doc = loadBuiltPage();
    const matrices = [...doc.querySelectorAll("[data-matrix]")];
    expect(matrices.length).toBeGreaterThan(0);
    for (const matrix of matrices) {
      const caption = matrix.querySelector("caption");
      expect(caption, "a matrix without a caption is unreadable").not.toBeNull();
      expect(caption!.textContent!.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives the page a description for a link preview", () => {
    const doc = loadBuiltPage();
    const meta = doc.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta!.getAttribute("content")!.length).toBeGreaterThan(20);
  });

  it("keeps every interactive control a real button or link", () => {
    // No div-with-onclick: the whole page has to be reachable by keyboard, and
    // the marker tabs through it.
    const doc = loadBuiltPage();
    const interactive = [
      ...doc.querySelectorAll("[data-query-select], [data-stage], [data-row-select]"),
    ];
    expect(interactive.length).toBeGreaterThan(0);
    for (const node of interactive) {
      if (node.classList.contains("beat")) continue; // beats are prose, not controls
      expect(["BUTTON", "A"], `${node.tagName} is not keyboard-reachable`).toContain(node.tagName);
    }
  });
});
