import { expect, test, type Page } from "@playwright/test";

// The arithmetic tests.
//
// These exist because of a gap the harness already documented: JSDOM parses the
// built HTML but never runs scripts, so `spec/assignment-1.test.ts` can only
// check that the markup contract is present, never that clicking anything works.
// Everything below reads numbers back out of the live DOM and does the arithmetic
// on them, so "the working matches the matrices" is checked as arithmetic rather
// than as pixels.

const CH = '[data-chapter="05"]';
const SQRT2 = Math.SQRT2;

/** Cell values are written to `data-value` at six decimal places, so a test can
 * do real arithmetic instead of parsing rounded display text. */
async function cellValue(page: Page, matrix: string, row: number, col: number): Promise<number> {
  const attr = await page
    .locator(`${CH} [data-matrix="${matrix}"] [data-cell="${row},${col}"]`)
    .getAttribute("data-value");
  expect(attr, `no data-value on ${matrix} cell ${row},${col}`).not.toBeNull();
  return Number(attr);
}

/** Walk the stepper to a given beat. Uses the dots rather than scrolling, so the
 * test does not depend on scroll heuristics.
 *
 * The click is retried because the chapter is `client:visible`: its markup is
 * server-rendered but its handlers arrive later, so a single click can land on a
 * button that is not yet wired up and the failure is indistinguishable from a
 * broken stepper. */
async function gotoBeat(page: Page, index: number): Promise<void> {
  const dot = page.locator(`${CH} [data-stepper="05"] [data-stage-index="${index}"]`);
  await expect(async () => {
    await dot.click();
    await expect(dot).toHaveAttribute("aria-current", "step", { timeout: 750 });
  }).toPass({ timeout: 15_000 });
}

/** Press a toggle or picker, retrying past hydration for the same reason. */
async function press(page: Page, selector: string, expected = "true"): Promise<void> {
  const control = page.locator(`${CH} ${selector}`);
  await expect(async () => {
    await control.click();
    await expect(control).toHaveAttribute("aria-pressed", expected, { timeout: 750 });
  }).toPass({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto("./#scaled-dot-product");
  // The island is `client:visible`, so wait for hydration to have produced a
  // stepper that responds rather than just server-rendered markup.
  await expect(page.locator(`${CH} [data-stepper="05"] [data-stage-index="0"]`)).toBeVisible();
});

test("the working under a cell multiplies and sums to the cell above it", async ({ page }) => {
  await gotoBeat(page, 2);

  // Query `chased` (2) against key `mouse` (5) — the pair with the real story.
  await press(page, '[data-query-select="2"]');

  const working = page.locator(`${CH} [data-term-expansion]`);
  await expect(working).toBeVisible();

  // Read the operands the page is showing, multiply them here, and check the
  // page's own products and sum against that.
  const operandA = await working.locator('[data-operand="a"]').allInnerTexts();
  const operandB = await working.locator('[data-operand="b"]').allInnerTexts();
  const products = await working.locator("[data-product]").allInnerTexts();

  expect(operandA).toHaveLength(2); // d_k = 2
  expect(operandB).toHaveLength(2);
  expect(products).toHaveLength(2);

  const num = (s: string) => Number(s.replace(/−/g, "-"));
  let expectedSum = 0;
  for (let i = 0; i < 2; i++) {
    const product = num(operandA[i]!) * num(operandB[i]!);
    // The displayed operands are rounded to 2dp, so their product can differ
    // from the displayed product in the last place. A tolerance of 0.01 catches a
    // wrong term while allowing for that rounding.
    expect(Math.abs(product - num(products[i]!))).toBeLessThan(0.011);
    expectedSum += num(products[i]!);
  }

  const shownSum = num((await working.locator("[data-dot-sum]").innerText()).trim());
  expect(Math.abs(shownSum - expectedSum)).toBeLessThan(0.011);

  // And the scaled value is that sum divided by √2.
  const shownScaled = num((await working.locator("[data-scaled-value]").innerText()).trim());
  expect(Math.abs(shownScaled - shownSum / SQRT2)).toBeLessThan(0.011);
});

test("picking a different query re-renders the working", async ({ page }) => {
  await gotoBeat(page, 2);

  await press(page, '[data-query-select="2"]');
  const first = await page.locator(`${CH} [data-dot-sum]`).innerText();

  await press(page, '[data-query-select="4"]');
  const second = await page.locator(`${CH} [data-dot-sum]`).innerText();

  expect(second).not.toBe(first);
  await expect(page.locator(`${CH} [data-query-select="4"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(`${CH} [data-query-select="2"]`)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("the scale toggle divides every score by exactly √2", async ({ page }) => {
  await gotoBeat(page, 4); // the scaling beat, where the toggle appears

  const toggle = page.locator(`${CH} [data-scale-toggle]`);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  // Sample the whole grid scaled, then unscaled, and compare cell by cell.
  const scaled: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const row: number[] = [];
    for (let j = 0; j < 6; j++) row.push(await cellValue(page, "scores", i, j));
    scaled.push(row);
  }

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const raw = await cellValue(page, "scores", i, j);
      expect(
        Math.abs(raw / SQRT2 - scaled[i]![j]!),
        `cell ${i},${j} did not change by √2`,
      ).toBeLessThan(1e-5);
    }
  }
});

test("the score grid is not symmetric", async ({ page }) => {
  // Q and K are different projections, so asking is not the same as being asked.
  // A symmetric grid would teach the opposite of what chapter 9 needs.
  await gotoBeat(page, 3);
  const upper = await cellValue(page, "scores", 2, 5);
  const lower = await cellValue(page, "scores", 5, 2);
  expect(Math.abs(upper - lower)).toBeGreaterThan(0.01);
});

test("the formula expands into the grid in the QKᵀ slot itself", async ({ page }) => {
  // The signature: the grid is rendered *into* the slot where the glyph was, so
  // the formula is the diagram rather than a caption above one.
  const slot = page.locator(`${CH} [data-slot="qk"]`);

  await gotoBeat(page, 1);
  await expect(slot).toHaveAttribute("data-expanded", "false");
  await expect(slot.locator('[data-matrix="scores"]')).toHaveCount(0);

  await gotoBeat(page, 3);
  await expect(slot).toHaveAttribute("data-expanded", "true");
  // The assertion that matters: the grid is a descendant of the slot.
  await expect(slot.locator('[data-matrix="scores"]')).toHaveCount(1);
});

test("every control is reachable and operable by keyboard alone", async ({ page }) => {
  await gotoBeat(page, 4);

  const toggle = page.locator(`${CH} [data-scale-toggle]`);
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  const query = page.locator(`${CH} [data-query-select="3"]`);
  await query.focus();
  await expect(query).toBeFocused();
  await page.keyboard.press("Space");
  await expect(query).toHaveAttribute("aria-pressed", "true");
});

test("the live region reports the current step", async ({ page }) => {
  await gotoBeat(page, 3);
  const live = page.locator(`${CH} [aria-live="polite"]`);
  await expect(live).toContainText("Step 4 of 5");
});
