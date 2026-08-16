import { expect, test, type Page } from "@playwright/test";

// What the motion layer claims, checked in a browser.
//
// None of this can be asserted anywhere else. `spec/` runs in JSDOM against
// `dist/` and never executes a script, so it can see that the markup carries the
// right hooks and nothing about whether anything moves.
//
// Almost nothing here is width-gated any more. It was, while the desktop had a
// scroll-driven prose rail the phone did not; there is one layout now, so most
// of these tests run in all three projects, and the last one exists to keep it
// that way.
//
// Every test below has a mutation recorded next to it that makes it fail. They
// were each applied and observed red before this file was trusted — a check
// nobody has seen fail is not evidence.

/** Click a stepper dot until the island is hydrated enough to answer.
 *
 * Chapters are `client:visible`, so a single click can land on server-rendered
 * markup whose handlers have not arrived; the failure is indistinguishable from
 * a broken control. */
async function setBeat(page: Page, chapter: string, index: number): Promise<void> {
  const dot = page.locator(`[data-chapter="${chapter}"] [data-stage-index="${index}"]`);
  await expect(async () => {
    await dot.click();
    await expect(dot).toHaveAttribute("aria-current", "step", { timeout: 750 });
  }).toPass({ timeout: 15_000 });
}

/** The vertical translate currently applied to a block, in pixels.
 *
 * Read out of the computed matrix rather than off a variant, because the claim
 * is about what the browser is painting. */
async function translateY(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => {
    const { transform } = getComputedStyle(el);
    if (transform === "none") return 0;
    return new DOMMatrixReadOnly(transform).m42;
  });
}

interface BlockWatch {
  /** The most blocks chapter 5 held at once while being watched. */
  most: number;
  /** Whether a moment existed with an extra block and none of them hidden. */
  everExposed: boolean;
}

/** Start counting chapter 5's blocks, from inside the page.
 *
 * An exit is about 120ms long, so anything that crosses the process boundary on
 * every sample misses it. A `MutationObserver` sees every intermediate state. */
async function watchBlocks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector('[data-chapter="05"]')!;
    const state = { most: 0, everExposed: false };
    (window as unknown as { blockWatch: typeof state }).blockWatch = state;

    const sample = () => {
      const blocks = root.querySelectorAll(".reveal");
      state.most = Math.max(state.most, blocks.length);
      // Three blocks means one of them is leaving, and a leaving block must not
      // be readable — it is a duplicate of its own replacement.
      if (blocks.length > 2 && !root.querySelector('.reveal[aria-hidden="true"]')) {
        state.everExposed = true;
      }
    };

    new MutationObserver(sample).observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    sample();
  });
}

async function readBlocks(page: Page): Promise<BlockWatch> {
  return page.evaluate(() => (window as unknown as { blockWatch: BlockWatch }).blockWatch);
}

/** Samples a block's vertical translate across a transition. */
async function sampleTranslate(page: Page, selector: string, ms: number): Promise<number[]> {
  const samples: number[] = [];
  const until = Date.now() + ms;
  while (Date.now() < until) {
    samples.push(await translateY(page, selector));
  }
  return samples;
}

test.describe("intra-chapter", () => {
  test("a block arrives from the side the reader is travelling from", async ({ page }) => {
    // Mutation: flip `dir * SHIFT` to `-dir * SHIFT` in `BLOCK.enter`.
    test.skip(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      "reduced motion has no travel to measure",
    );

    await page.goto("./#token-embeddings");
    await setBeat(page, "02", 0);

    // Forward: the block rises from below, so it is at a positive offset before
    // it settles.
    await setBeat(page, "02", 1);
    const forward = await sampleTranslate(page, '[data-chapter="02"] .reveal', 260);
    expect(Math.max(...forward), `forward samples: ${forward.join(", ")}`).toBeGreaterThan(0);

    // Back: the same block arrives from above instead.
    await setBeat(page, "02", 0);
    const back = await sampleTranslate(page, '[data-chapter="02"] .reveal', 260);
    expect(Math.min(...back), `backward samples: ${back.join(", ")}`).toBeLessThan(0);
  });

  test("nothing is left resting at reduced opacity", async ({ page }) => {
    // Mutation: set `BLOCK.active` to `{ opacity: 0.6 }`.
    //
    // This is the enforcement behind the rule that opacity may be animated but
    // never asserted. axe measures a settled document and would not catch a
    // block that settles at 0.8.
    await page.goto("./#scaled-dot-product");

    for (const stage of [0, 1, 2, 3, 4]) {
      await setBeat(page, "05", stage);

      // Polled: the assertion is about where the blocks come to rest, so it has
      // to outlast the transition rather than sample it.
      await expect
        .poll(
          () =>
            page
              .locator('[data-chapter="05"] .reveal')
              .evaluateAll((nodes) =>
                nodes.every((n) => getComputedStyle(n).opacity === "1"),
              ),
          { message: `stage ${stage} left a block resting below full opacity` },
        )
        .toBe(true);
    }
  });

  test("the outgoing block actually leaves, rather than being cut", async ({ page }) => {
    // Mutation: put `AnimatePresence` back inside the condition, as `Reveal.tsx`
    // had it. Only one block is ever present and this fails immediately.
    //
    // This is the defect the whole redesign started from: exits had never played
    // anywhere on the page, because the presence container was unmounted along
    // with its child.
    test.skip(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      "reduced motion swaps without an exit, by design",
    );

    await page.goto("./#scaled-dot-product");
    await setBeat(page, "05", 1);

    // Measured as "more blocks existed during the change than either side of
    // it". Beat 1 rests at one block and beat 2 rests at two, so a played exit
    // is the moment three are in the document at once — the leaver plus its two
    // replacements. Three things about this, each learned by getting it wrong:
    //
    // "More than one block" proves nothing: chapter 5 shows two at once at rest,
    // so the first version of this test passed against a primitive that could
    // not animate an exit at all.
    //
    // `[data-motion-pop-id]` is not the marker either. Motion only reparents an
    // exiting child under some conditions and does not here, so a check written
    // against that attribute fails whether exits play or not.
    //
    // And the watching happens inside the page. An exit lasts 120ms; a polling
    // loop that crosses the process boundary every iteration misses it.
    await watchBlocks(page);
    await setBeat(page, "05", 2);

    const { most } = await readBlocks(page);
    expect(most, "no frame held an outgoing block; the swap was a hard cut").toBeGreaterThan(2);
  });

  test("a leaving block is hidden from assistive technology while it leaves", async ({ page }) => {
    // Mutation: drop `aria-hidden`/`inert` from `PresenceBlock`.
    //
    // For the length of an exit the old content and the new are both present and
    // overlapping. Left in the accessibility tree it is read twice, and axe
    // scores its contrast against whatever it is lying on top of.
    test.skip(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      "reduced motion has no exit",
    );

    await page.goto("./#scaled-dot-product");
    await setBeat(page, "05", 1);

    await watchBlocks(page);
    await setBeat(page, "05", 2);

    const { most, everExposed } = await readBlocks(page);
    expect(most, "nothing left, so there was nothing to hide").toBeGreaterThan(2);
    expect(everExposed, "an exiting block stayed in the accessibility tree").toBe(false);
  });

  test("nothing is left mounted once a transition is over", async ({ page }) => {
    // Mutation: swap `useIsPresent` for `usePresence` in `PresenceBlock`.
    //
    // `usePresence` hands removal to the caller, so reading presence with it
    // leaves every exiting block mounted forever. It looked like a layout bug:
    // chapter 3 stacked its first figure under its third and overflowed the
    // viewport by 88px.

    await page.goto("./#positional-encoding");
    await setBeat(page, "03", 0);
    await setBeat(page, "03", 2);

    await expect(page.locator('[data-chapter="03"] .reveal')).toHaveCount(1);
  });

  test("reduced motion reaches the end state with nothing to wait for", async ({ page }) => {
    // Mutation: remove the `animated` early return in `StageBlock`.
    test.skip(
      !(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)),
      "only meaningful in the reduced-motion project",
    );

    await page.goto("./#scaled-dot-product");
    await setBeat(page, "05", 2);

    // Read immediately, with no settling wait: under reduced motion the end
    // state is the only state there has ever been.
    expect(await translateY(page, '[data-chapter="05"] .reveal')).toBe(0);
    const opacity = await page
      .locator('[data-chapter="05"] .reveal')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBe(1);
  });
});

test.describe("the nav", () => {
  test("marks exactly one chapter, and marks the right one", async ({ page }) => {
    // Mutation: change the script's `LINE` to 1.5.
    //
    // Checked at the boundary, not from an anchor. A chapter is roughly four
    // viewports tall, so from any anchor the answer is the same for almost any
    // line position — the first version of this test passed with `LINE` at 1.5
    // and proved nothing. What the line means is only visible in the few hundred
    // pixels where one chapter is taking over from the last.
    await page.goto("./#softmax-and-values");

    const current = page.locator("[data-chapter-link][data-current]");
    const height = page.viewportSize()!.height;

    // Put chapter 6's top just *below* the line: still chapter 5.
    await page.evaluate((h) => {
      const section = document.querySelector('[data-chapter="06"]')!;
      window.scrollBy(0, section.getBoundingClientRect().top - h * 0.6);
    }, height);
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("data-chapter-link", "05");

    // And just above it: chapter 6.
    await page.evaluate((h) => {
      const section = document.querySelector('[data-chapter="06"]')!;
      window.scrollBy(0, section.getBoundingClientRect().top - h * 0.3);
    }, height);
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("data-chapter-link", "06");
  });

  test("says where it is to assistive technology too", async ({ page }) => {
    // Mutation: drop the `aria-current` branch from the script. `data-current`
    // is a styling hook and carries nothing to a screen reader on its own.
    await page.goto("./#multi-head-attention");
    await expect(page.locator('[data-chapter-link][aria-current="location"]')).toHaveCount(1);
  });
});


test("the chapter layout is the same at every width", async ({ page }) => {
  // Mutation: put `.chapter__prose { display: flex }` back inside a
  // `@media (width >= 900px)` block, or give `.chapter__body` two tracks again.
  //
  // This replaces "the phone is left exactly as it was", whose whole reason for
  // existing was that the phone had a different layout to protect. It does not
  // any more: the phone's arrangement won and the desktop was rebuilt onto it.
  // The risk that test guarded is unchanged though — the two widths quietly
  // drifting apart, one `@media` block at a time, which is exactly how they
  // drifted the first time — so the guarantee is restated as sameness rather
  // than deleted. It runs in every project on purpose: it only means anything
  // when the same assertions hold at 390 and at 1920.
  await page.goto("./#scaled-dot-product");

  const shape = await page.evaluate(() => {
    const root = document.querySelector('[data-chapter="05"]')!;
    return {
      prose: getComputedStyle(root.querySelector(".chapter__prose")!).display,
      // Counted, not compared to a string. `none` looks like the obvious
      // expectation for a grid with no declared tracks and is wrong: Chrome
      // reports the *used* value, so one implicit column reads as "1392px" and
      // two would read as "336px 1008px". The count is what carries the claim.
      tracks: getComputedStyle(root.querySelector(".chapter__body")!)
        .gridTemplateColumns.trim()
        .split(/\s+/).length,
      position: getComputedStyle(root.querySelector(".chapter__figure")!).position,
      animation: getComputedStyle(root.querySelector(".chapter__head")!).animationName,
    };
  });

  expect(shape.prose, "the prose rail came back").toBe("none");
  expect(shape.tracks, "the chapter body grew a second column again").toBe(1);
  expect(shape.position, "something in the chapter is sticky again").toBe("static");
  expect(shape.animation, "a scroll-driven entry animation came back").toBe("none");
});
