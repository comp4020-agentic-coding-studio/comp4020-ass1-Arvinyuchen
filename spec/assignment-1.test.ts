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

/** Chapter id → fragment. The nav links to these, and every one has to resolve. */
const SLUGS: Record<string, string> = {
  "01": "sequential-vs-parallel",
  "02": "token-embeddings",
  "03": "positional-encoding",
  "04": "query-key-value",
  "05": "scaled-dot-product",
  "06": "softmax-and-values",
  "07": "multi-head-attention",
  "08": "residual-norm-ffn",
  "09": "masked-attention",
  "10": "encoder-decoder",
  "11": "modern-llms",
};

/** Chapters whose visualisation is built. A chapter not in here renders as an
 * inert nav entry, so the page never links to something that isn't there. */
const READY: readonly string[] = [...CHAPTER_IDS];

const CH05_SLUG = SLUGS["05"]!;
const CH05_BEATS = ["formula", "queries-and-keys", "one-score", "all-scores", "scaling"] as const;

/** Expected beat count per chapter, so a chapter silently losing its prose is a
 * failure rather than a quiet regression. */
const BEATS_PER_CHAPTER: Record<string, number> = {
  "01": 4,
  "02": 3,
  "03": 4,
  "04": 3,
  "05": 5,
  "06": 5,
  "07": 5,
  "08": 4,
  "09": 4,
  "10": 4,
  "11": 3,
};

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
      if (READY.includes(id)) {
        expect(node.tagName, `chapter ${id} should be a link`).toBe("A");
        expect(node.getAttribute("href")).toBe(`#${SLUGS[id]}`);
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

describe("every chapter", () => {
  it("is on the page, in order, addressable by its slug", () => {
    const doc = loadBuiltPage();
    const chapters = [...doc.querySelectorAll("[data-chapter]")];
    expect(chapters).toHaveLength(CHAPTER_IDS.length);
    chapters.forEach((node, i) => {
      const id = CHAPTER_IDS[i]!;
      expect(node.getAttribute("data-chapter")).toBe(id);
      expect(node.id, `chapter ${id} should be anchored at its slug`).toBe(SLUGS[id]);
    });
  });

  it("server-renders its visualisation, so nothing needs JavaScript to appear", () => {
    const doc = loadBuiltPage();
    for (const id of CHAPTER_IDS) {
      const chapter = doc.querySelector(`[data-chapter="${id}"]`)!;
      expect(
        chapter.querySelector(`[data-viz="${SLUGS[id]}"]`),
        `chapter ${id} has no server-rendered figure`,
      ).not.toBeNull();
    }
  });

  it("has its prose beats and a matching stepper", () => {
    const doc = loadBuiltPage();
    for (const id of CHAPTER_IDS) {
      const chapter = doc.querySelector(`[data-chapter="${id}"]`)!;
      const expected = BEATS_PER_CHAPTER[id]!;

      const beats = [...chapter.querySelectorAll(".beat[data-stage]")];
      expect(beats, `chapter ${id} beat count`).toHaveLength(expected);

      const active = beats.filter((n) => n.getAttribute("data-stage-active") === "true");
      expect(active, `chapter ${id} should start on exactly one beat`).toHaveLength(1);

      const dots = [...chapter.querySelectorAll(`[data-stepper="${id}"] button[data-stage]`)];
      expect(dots, `chapter ${id} stepper`).toHaveLength(expected);

      // The stepper's ids and the prose's ids have to be the same list, or the
      // dots step to beats that aren't there.
      expect(dots.map((n) => n.getAttribute("data-stage"))).toEqual(
        beats.map((n) => n.getAttribute("data-stage")),
      );
    }
  });

  it("gives every beat non-empty prose", () => {
    const doc = loadBuiltPage();
    for (const beat of doc.querySelectorAll(".beat[data-stage]")) {
      expect(beat.textContent!.trim().length, `empty beat ${beat.getAttribute("data-stage")}`)
        .toBeGreaterThan(40);
    }
  });

  it("carries no source notation into the rendered prose", () => {
    // chapters.ts holds plain strings and there is no markdown step, so a
    // backtick or a `d_k` in the source reaches the reader verbatim.
    const doc = loadBuiltPage();
    const prose = [...doc.querySelectorAll(".beat, .chapter__thesis")]
      .map((n) => n.textContent ?? "")
      .join(" ");
    expect(prose).not.toMatch(/`/);
    expect(prose).not.toMatch(/d_k|d_model/);
  });
});

describe("chapter 11 is separated from the paper", () => {
  it("flags itself as later practice", () => {
    const doc = loadBuiltPage();
    const chapter = doc.querySelector('[data-chapter="11"]')!;
    const flag = chapter.querySelector("[data-beyond-flag]");
    expect(flag, "chapter 11 must say out loud that it is past the paper").not.toBeNull();
    expect(flag!.textContent!.toLowerCase()).toContain("beyond the paper");
  });

  it("hedges its claims rather than naming what a given model does", () => {
    // Asserted against the beat prose, which is server-rendered, rather than
    // against the interactive note — that one only appears past the first beat,
    // so it would let an unhedged initial state through.
    const doc = loadBuiltPage();
    const chapter = doc.querySelector('[data-chapter="11"]')!;
    const text = chapter.textContent ?? "";
    expect(text).toMatch(/widespread choices rather than universal ones/);
    expect(text).toMatch(/worth checking rather than assuming/);
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
    const chapter = doc.querySelector('[data-chapter="05"]')!;
    const beats = [...chapter.querySelectorAll(".beat[data-stage]")];
    expect(beats).toHaveLength(CH05_BEATS.length);
    expect(beats.map((n) => n.getAttribute("data-stage"))).toEqual([...CH05_BEATS]);
    const active = beats.filter((n) => n.getAttribute("data-stage-active") === "true");
    expect(active, "exactly one beat should start active").toHaveLength(1);
    expect(active[0]!.getAttribute("data-stage")).toBe(CH05_BEATS[0]);
  });

  it("has a stepper whose buttons match the beats, with one current step", () => {
    const doc = loadBuiltPage();
    const trigger = doc.querySelector('[data-stepper="05"]');
    expect(trigger, "no interaction trigger — this is the page's core interaction").not.toBeNull();
    expect(trigger!.getAttribute("role")).toBe("group");
    expect(trigger!.getAttribute("data-testid")).toBe("interaction-trigger");

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
    const chapter = doc.querySelector('[data-chapter="05"]')!;
    for (const name of ["q", "k"]) {
      const matrix = chapter.querySelector(`[data-matrix="${name}"]`);
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
    const cells = [
      ...doc.querySelectorAll('[data-chapter="05"] [data-matrix="q"] td[data-cell]'),
    ];
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.getAttribute("data-value")).toMatch(/^-?\d+\.\d+$/);
      expect(cell.textContent!.trim().length).toBeGreaterThan(0);
    }
  });

  it("sets up the equation as addressable slots", () => {
    const doc = loadBuiltPage();
    const chapter = doc.querySelector('[data-chapter="05"]')!;
    for (const slot of ["softmax", "qk", "scale", "v"]) {
      expect(
        chapter.querySelector(`[data-slot="${slot}"]`),
        `no [data-slot="${slot}"] — the formula is the diagram, so each term is a slot`,
      ).not.toBeNull();
    }
  });

  it("offers a query picker with one option per token", () => {
    const doc = loadBuiltPage();
    const chapter = doc.querySelector('[data-chapter="05"]')!;
    const buttons = [...chapter.querySelectorAll("[data-query-select]")];
    expect(buttons).toHaveLength(SEQ_LEN);
    for (const button of buttons) {
      expect(button.hasAttribute("aria-pressed")).toBe(true);
    }
    const pressed = buttons.filter((n) => n.getAttribute("aria-pressed") === "true");
    expect(pressed, "exactly one query should be selected on load").toHaveLength(1);
  });
});

describe("built assets resolve on disk", () => {
  // linkinator has to skip `_astro/` URLs: they are base-prefixed, correct once
  // deployed, and unresolvable under CI's crawl of the on-disk tree. That skip is
  // load-bearing but it opens a hole — a genuinely missing asset would pass. This
  // closes it, since JSDOM is already reading the built page.
  //
  // Found the hard way: adding the paper's figure produced an `<img>` whose
  // base-prefixed src linkinator *did* check (unlike `<script src>`, which it never
  // checks at all), and the links step failed.
  const BASE = "/comp4020-ass1-Arvinyuchen";

  it("points every base-prefixed asset at a file that exists", () => {
    const doc = loadBuiltPage();
    const urls = new Set<string>();
    for (const node of doc.querySelectorAll("img[src], script[src], link[href]")) {
      const url = node.getAttribute("src") ?? node.getAttribute("href") ?? "";
      if (url.startsWith(`${BASE}/`)) urls.add(url);
    }

    expect(urls.size, "no base-prefixed assets found — has the build changed?").toBeGreaterThan(0);

    for (const url of urls) {
      const onDisk = resolve("dist", url.slice(BASE.length + 1));
      expect(existsSync(onDisk), `${url} has no file at ${onDisk}`).toBe(true);
    }
  });

  it("gives every reproduced figure alt text and a credit", () => {
    const doc = loadBuiltPage();

    // All of them, not `querySelector`'s first. The hero reproduces three figures
    // now, and the single-element version of this test would have passed while two
    // of them shipped undescribed — the obligation is per figure, not per page.
    const images = [...doc.querySelectorAll(".hero__figure-img")];
    expect(images.length, "the hero should reproduce three figures").toBe(3);

    for (const img of images) {
      const name = img.getAttribute("data-figure");
      expect(name, "each figure needs a data-figure name").toBeTruthy();
      expect(
        img.getAttribute("alt")?.length ?? 0,
        `alt text for ${name} must describe the figure`,
      ).toBeGreaterThan(80);
    }

    const caption = doc.querySelector(".hero__figure-caption");
    expect(caption, "a reproduced figure needs a credit").not.toBeNull();
    expect(caption!.textContent).toContain("Vaswani");
    expect(caption!.querySelector('a[href*="arxiv.org"]')).not.toBeNull();
  });
});

describe("the hero's token attention interaction", () => {
  // The hero's static equation was replaced by an interactive island: six real
  // buttons, server-rendered before any script runs, one per token of the
  // worked example. This is what the static/SSR'd markup can assert — the
  // phase animation itself only exists once client script hydrates, which
  // JSDOM never executes; that behaviour is covered by `e2e/hero-attention.spec.ts`.
  it("server-renders its root and one button per token", () => {
    const doc = loadBuiltPage();
    const root = doc.querySelector('[data-viz="token-attention"]');
    expect(root, "no token-attention root").not.toBeNull();

    const buttons = [...root!.querySelectorAll("button[data-token][data-position]")];
    expect(buttons).toHaveLength(SEQ_LEN);
    buttons.forEach((button, i) => {
      expect(button.getAttribute("data-token")).toBe(TOKENS[i]);
      expect(button.getAttribute("data-position")).toBe(String(i));
    });
  });

  it("gives the two `the` buttons distinct accessible labels", () => {
    const doc = loadBuiltPage();
    const buttons = [...doc.querySelectorAll('[data-viz="token-attention"] button[data-token]')];
    const labels = buttons.map((button) => button.getAttribute("aria-label"));
    expect(new Set(labels).size).toBe(SEQ_LEN);
    expect(labels[0]).toContain("position 0");
    expect(labels[3]).toContain("position 3");
  });
});

describe("equations are rendered, not printed", () => {
  // KaTeX runs at build time, so if it ever stops running the page ships raw TeX
  // as visible text. That is invisible to a typecheck and to every other test
  // here, and it is exactly the failure this catches.
  it("leaks no TeX source into visible text", () => {
    const doc = loadBuiltPage();
    // KaTeX keeps the source in an `<annotation>` inside the MathML, which is
    // correct and must not be mistaken for a leak, so it is removed first.
    for (const node of doc.querySelectorAll("annotation")) node.remove();
    const text = doc.body.textContent ?? "";
    for (const command of ["\\frac", "\\sqrt", "\\operatorname", "\\mathrm", "\\cdot"]) {
      expect(text, `raw TeX on the page: ${command}`).not.toContain(command.replace("\\", "\\"));
    }
  });

  it("renders every chapter-5 equation fragment", () => {
    const doc = loadBuiltPage();
    const chapter = doc.querySelector('[data-chapter="05"]')!;
    // softmax(, the collapsed QKᵀ glyph, the denominator, )V.
    expect(chapter.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(4);
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

  // The motion layer's markup contract.
  //
  // This file runs in JSDOM against `dist/` and never executes a script, so it
  // can see the hooks the motion depends on and nothing about whether anything
  // moves. Direction, the nav's mark and the one-layout-at-every-width guarantee
  // are all `e2e/motion.spec.ts`'s job — what is checked here is that the hooks
  // those specs reach for are in the server-rendered HTML in the first place.

  it("wraps every beat's prose in its own line element", () => {
    // The span outlived its reason: it existed so the prose could translate
    // without moving the paragraph the scroll observer measured. There is no
    // observer now, but this is the contract, and the beats are the only
    // machine-readable statement that each chapter's prose exists.
    const doc = loadBuiltPage();
    for (const id of CHAPTER_IDS) {
      const beats = [...doc.querySelectorAll(`[data-chapter="${id}"] .beat`)];
      expect(beats.length, `chapter ${id} has no beats`).toBeGreaterThan(0);
      for (const beat of beats) {
        const line = beat.querySelector(".beat__line");
        expect(line, `chapter ${id} has a beat with no line element`).not.toBeNull();
        expect(line!.textContent!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("ships the nav with nothing marked current", () => {
    // Same reason: which chapter the reader is in is not knowable at build time,
    // and a mark baked into the HTML would be wrong for every reader but one.
    const doc = loadBuiltPage();
    expect(doc.querySelectorAll("[data-chapter-link]").length).toBe(CHAPTER_IDS.length);
    expect(doc.querySelectorAll("[data-chapter-link][data-current]").length).toBe(0);
    expect(doc.querySelectorAll("[data-chapter-link][aria-current]").length).toBe(0);
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
