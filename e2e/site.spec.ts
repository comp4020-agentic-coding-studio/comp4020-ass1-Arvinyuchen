import { expect, test, type Page } from "@playwright/test";

// Cross-chapter behaviour, and the two things the marker is described as doing:
// resizing mid-use and tabbing through it.

const CHAPTERS = [
  "sequential-vs-parallel",
  "token-embeddings",
  "positional-encoding",
  "query-key-value",
  "scaled-dot-product",
  "softmax-and-values",
  "multi-head-attention",
  "residual-norm-ffn",
  "masked-attention",
  "encoder-decoder",
  "modern-llms",
] as const;

async function values(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.map((n) => Number((n as HTMLElement).dataset.value)),
  );
}

/** Select a beat, tolerating a click that lands before the island has hydrated.
 *
 * Every chapter is `client:visible`, so its markup is in the HTML but its event
 * handlers arrive later. A single click can therefore hit a server-rendered
 * button that does nothing, and the failure looks exactly like a broken stepper.
 * `toPass` retries the click-and-check pair until the handlers exist. */
async function setBeat(page: Page, chapter: string, index: number): Promise<void> {
  const dot = page.locator(`[data-chapter="${chapter}"] [data-stage-index="${index}"]`);
  await expect(async () => {
    await dot.click();
    await expect(dot).toHaveAttribute("aria-current", "step", { timeout: 750 });
  }).toPass({ timeout: 15_000 });
}

/** Wait until a chapter's island is actually interactive.
 *
 * Checking that beat 0 is current proves nothing — the server-rendered markup
 * already says so. The only reliable probe is to make something change, so this
 * moves to beat 1 and back. */
async function waitForHydrated(page: Page, chapter: string): Promise<void> {
  await setBeat(page, chapter, 1);
  await setBeat(page, chapter, 0);
}

/** Horizontal overflow of the document, in pixels. Polled rather than read once:
 * a viewport change needs a frame or two to reflow, and reading immediately
 * catches the layout mid-flight — which showed up as an intermittent 9px. */
async function expectNoSidewaysScroll(page: Page, because: string): Promise<void> {
  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      { message: because, timeout: 5000 },
    )
    .toBeLessThanOrEqual(0);
}

test("no chapter overflows horizontally", async ({ page }) => {
  await page.goto("./");
  // Scroll the whole page so every client:visible island hydrates and lays out.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
  });
  await expectNoSidewaysScroll(page, "page scrolls sideways with every chapter hydrated");
});

test("every chapter is present and its nav link reaches it", async ({ page }) => {
  await page.goto("./");
  for (const [i, slug] of CHAPTERS.entries()) {
    const id = String(i + 1).padStart(2, "0");
    await expect(page.locator(`[data-chapter="${id}"]#${slug}`)).toHaveCount(1);
    await expect(page.locator(`a[data-chapter-link="${id}"]`)).toHaveAttribute("href", `#${slug}`);
  }
});

test("chapter 3 makes the two `the` rows identical when position is switched off", async ({
  page,
}) => {
  await page.goto("./#positional-encoding");
  const ch = '[data-chapter="03"]';
  await expect(page.locator(`${ch} [data-pe-toggle]`)).toBeVisible();

  const rowValues = async (row: number) =>
    values(page, `${ch} [data-matrix="x"] [data-cell^="${row},"]`);

  // With PE on, the two `the`s differ.
  await expect(page.locator(`${ch} [data-pe-toggle]`)).toHaveAttribute("aria-pressed", "true");
  expect(await rowValues(0)).not.toEqual(await rowValues(3));

  // Switch it off and they collapse back onto each other — the chapter's claim.
  await page.locator(`${ch} [data-pe-toggle]`).click();
  await expect(page.locator(`${ch} [data-pe-toggle]`)).toHaveAttribute("aria-pressed", "false");
  expect(await rowValues(0)).toEqual(await rowValues(3));
});

test("chapter 6 weights sum to one at every temperature", async ({ page }) => {
  await page.goto("./#softmax-and-values");
  const ch = '[data-chapter="06"]';
  await setBeat(page, "06", 4);

  const slider = page.locator(`${ch} [data-temperature]`);
  await expect(slider).toBeVisible();

  for (const step of ["0", "2", "4"]) {
    await slider.fill(step);
    const weights = await page
      .locator(`${ch} [data-weight]`)
      .evaluateAll((nodes) => nodes.map((n) => Number(n.textContent!.replace(/−/g, "-"))));
    expect(weights).toHaveLength(6);
    const total = weights.reduce((a, b) => a + b, 0);
    // Displayed at 2dp, so the sum of what's on screen can be off by rounding.
    expect(Math.abs(total - 1), `weights summed to ${total} at temperature step ${step}`)
      .toBeLessThan(0.02);
  }
});

test("chapter 9 masks the future to exactly zero", async ({ page }) => {
  await page.goto("./#masked-attention");
  const ch = '[data-chapter="09"]';
  await setBeat(page, "09", 2);

  const grid = `${ch} [data-matrix="masked-weights"]`;
  await expect(page.locator(grid)).toBeVisible();

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const cell = page.locator(`${grid} [data-cell="${i},${j}"]`);
      if ((await cell.count()) === 0) continue;
      const value = Number(await cell.getAttribute("data-value"));
      if (j > i) {
        expect(value, `cell ${i},${j} should be exactly zero`).toBe(0);
      } else {
        expect(value, `cell ${i},${j} should be positive`).toBeGreaterThan(0);
      }
    }
  }
});

test("chapter 9's generation scrubber reveals one row at a time", async ({ page }) => {
  await page.goto("./#masked-attention");
  const ch = '[data-chapter="09"]';
  await setBeat(page, "09", 2);

  const slider = page.locator(`${ch} [data-generation-step]`);
  await slider.fill("0");
  await expect(page.locator(`${ch} [data-matrix="masked-weights"] tbody tr`)).toHaveCount(1);

  await slider.fill("3");
  await expect(page.locator(`${ch} [data-matrix="masked-weights"] tbody tr`)).toHaveCount(4);
});

test("chapter 8's residual ablation changes the numbers downstream", async ({ page }) => {
  await page.goto("./#residual-norm-ffn");
  const ch = '[data-chapter="08"]';
  await setBeat(page, "08", 3);

  const out = () => values(page, `${ch} [data-matrix="layer-out"] [data-cell]`);
  const before = await out();

  await page.locator(`${ch} [data-residual-toggle]`).click();
  await expect(page.locator(`${ch} [data-residual-toggle]`)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  const after = await out();

  expect(after).not.toEqual(before);
});

test("chapter 11 toggles reveal a reason, and stay hedged", async ({ page }) => {
  await page.goto("./#modern-llms");
  const ch = '[data-chapter="11"]';
  await setBeat(page, "11", 1);

  const toggle = page.locator(`${ch} [data-change-toggle="rope"]`);
  await expect(page.locator(`${ch} [data-why="rope"]`)).toHaveCount(0);
  await toggle.click();
  await expect(page.locator(`${ch} [data-why="rope"]`)).toBeVisible();
  await expect(page.locator(`${ch} [data-hedge]`)).toContainText(
    "widespread directions rather than a specification",
  );
});

test("chapter 10's blocks link back to the chapter that explained them", async ({ page }) => {
  await page.goto("./#encoder-decoder");
  const cross = page.locator('[data-chapter="10"] [data-kind="cross"]');
  await expect(cross).toHaveAttribute("href", "#scaled-dot-product");
  await cross.click();
  await expect(page).toHaveURL(/#scaled-dot-product$/);
});

test("the stepper advances without scrolling, which is how a phone drives it", async ({
  page,
}) => {
  await page.goto("./#scaled-dot-product");
  const ch = '[data-chapter="05"]';
  await waitForHydrated(page, "05");

  const next = page.locator(`${ch} [data-step-next]`);
  const prev = page.locator(`${ch} [data-step-prev]`);

  await expect(prev).toBeDisabled();
  await next.click();
  await expect(page.locator(`${ch} [data-stage-index="1"]`)).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(prev).toBeEnabled();

  for (let i = 0; i < 3; i++) await next.click();
  await expect(next).toBeDisabled();
  await expect(page.locator(`${ch} [data-stage-index="4"]`)).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("tabbing reaches the chapter navigation and the first chapter's controls", async ({
  page,
}) => {
  await page.goto("./");
  const reached: string[] = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    reached.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "none";
        return `${el.tagName}:${el.dataset.chapterLink ?? el.dataset.seqLen ?? el.textContent?.trim().slice(0, 12) ?? ""}`;
      }),
    );
  }
  // Focus must land on real controls, never be trapped on the body.
  expect(reached.filter((r) => r !== "BODY:" && r !== "none").length).toBeGreaterThan(8);
  expect(reached.some((r) => r.startsWith("A:"))).toBe(true);
});

test("a resize mid-interaction keeps the selected state", async ({ page }) => {
  // The marker "resizes mid-use". The chapter must not reset when the layout
  // crosses the 900px breakpoint.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#scaled-dot-product");
  const ch = '[data-chapter="05"]';

  await setBeat(page, "05", 3);
  await expect(async () => {
    await page.locator(`${ch} [data-query-select="4"]`).click();
    await expect(page.locator(`${ch} [data-query-select="4"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 750 },
    );
  }).toPass({ timeout: 15_000 });

  await page.setViewportSize({ width: 390, height: 844 });

  await expect(page.locator(`${ch} [data-query-select="4"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(`${ch} [data-stage-index="3"]`)).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expectNoSidewaysScroll(page, "sideways scroll after resizing down to a phone");
});

test("no figure ever paints over prose", async ({ page }) => {
  // A sticky figure that escapes its own chapter is invisible to every other
  // check here: the page does not overflow, nothing is clipped, no test fails —
  // it simply covers text with an opaque card. It happened, on the homepage, for
  // 191px, because the figure was centred with a transform and transforms are not
  // clamped to the containing block the way sticky positioning is.
  //
  // Asserted as a geometric invariant over the whole document rather than as a
  // fact about the hero, so the next variant of the same mistake is caught too.
  await page.goto("./");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 20));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });

  const collisions = await page.evaluate(() => {
    const intersects = (a: DOMRect, b: DOMRect) =>
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1 &&
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1;

    const figures = [...document.querySelectorAll(".chapter__viz")];
    const prose = [
      ...document.querySelectorAll(".hero__standfirst, .hero__sentence, .hero__note, .beat"),
    ];
    const out: string[] = [];
    for (const figure of figures) {
      const fr = figure.getBoundingClientRect();
      if (fr.width === 0) continue;
      for (const text of prose) {
        const tr = text.getBoundingClientRect();
        if (tr.width === 0) continue;
        // Prose inside this same chapter's own column is fine to sit beside; only
        // a genuine overlap of the two boxes is a fault.
        if (figure.closest("[data-chapter]") === text.closest("[data-chapter]")) continue;
        if (intersects(fr, tr)) {
          out.push(
            `${figure.getAttribute("data-viz")} covers ${text.className || text.tagName}`,
          );
        }
      }
    }
    return [...new Set(out)];
  });

  expect(collisions, collisions.join("; ")).toEqual([]);
});

test("dark mode renders with readable text", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const fg = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(bg).not.toBe(fg);
  // The dark surface from global.css, not an automatic inversion.
  expect(bg).toBe("rgb(13, 17, 23)");
});
