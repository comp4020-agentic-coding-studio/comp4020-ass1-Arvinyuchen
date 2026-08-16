import { expect, test, type Locator, type Page } from "@playwright/test";

// The hero's `TokenAttentionInteraction` replaces the old static equation. Runs
// under all three Playwright projects (desktop, phone, desktop-reduced-motion —
// see playwright.config.ts), so nothing here asserts a specific mid-animation
// phase: under reduced motion a selection jumps straight to "settled" and there
// is no "compare"/"weight" beat to catch. What has to hold in every project is
// the end state — settle on the token that was actually clicked last, with
// weights that sum to 100%.

const STAGE = '[data-viz="token-attention"]';

function tokenButton(page: Page, position: number): Locator {
  return page.locator(`${STAGE} [data-position="${position}"]`);
}

async function waitSettled(page: Page): Promise<void> {
  await expect(page.locator(`${STAGE} .attn__stage`)).toHaveAttribute("data-phase", "settled", {
    timeout: 5_000,
  });
}

/** Select a token, tolerating an interaction that lands before hydration.
 *
 * `client:load` is not `client:sync`: the island's markup is server-rendered and
 * its handlers arrive whenever the chunk has downloaded and run. Under a full
 * parallel suite that can be after the first click or keypress, and the failure
 * is indistinguishable from a broken control — `operable with the keyboard alone`
 * failed roughly one full run in three while passing every time in isolation.
 *
 * The retry is safe because `selectToken` is idempotent: re-selecting the same
 * position bumps `runId`, clears the pending timers and restarts the run, so a
 * repeated press cannot leave a half-finished state or toggle the token off. */
async function press(page: Page, position: number, via: "click" | "keyboard" = "click") {
  const button = tokenButton(page, position);
  await expect(async () => {
    if (via === "keyboard") {
      await button.focus();
      await page.keyboard.press("Enter");
    } else {
      await button.click();
    }
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 750 });
  }).toPass({ timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
});

test("selecting a token settles with weights that sum to 100%", async ({ page }) => {
  await press(page, 2);
  await waitSettled(page);

  const percents = await page
    .locator(`${STAGE} .attn-token__value`)
    .evaluateAll((nodes) => nodes.map((n) => Number(n.textContent!.replace("%", ""))));
  expect(percents).toHaveLength(6);
  expect(percents.reduce((total, value) => total + value, 0)).toBe(100);
});

test("a rapid reselection settles on the last token clicked, never a stale mix", async ({
  page,
}) => {
  // The first press retries until the island answers; the second is deliberately
  // raw. `press` returns as soon as `aria-pressed` flips, and the phases behind
  // it run for another ~2.4s, so the second click still lands mid-animation on
  // every project except reduced motion — which is exactly the race this guards.
  await press(page, 1);
  await tokenButton(page, 4).click();
  await waitSettled(page);

  await expect(tokenButton(page, 4)).toHaveAttribute("aria-pressed", "true");
  await expect(tokenButton(page, 1)).toHaveAttribute("aria-pressed", "false");

  const percents = await page
    .locator(`${STAGE} .attn-token__value`)
    .evaluateAll((nodes) => nodes.map((n) => Number(n.textContent!.replace("%", ""))));
  expect(percents.reduce((total, value) => total + value, 0)).toBe(100);
});

test("operable with the keyboard alone", async ({ page }) => {
  await press(page, 0, "keyboard");
  await waitSettled(page);
  await expect(tokenButton(page, 0)).toHaveAttribute("aria-pressed", "true");
});

test("replay re-runs the interaction for the same token", async ({ page }) => {
  await press(page, 5);
  await waitSettled(page);

  const replay = page.locator(`${STAGE} .attn__replay`);
  await expect(replay).toBeVisible();
  await replay.click();

  await waitSettled(page);
  await expect(tokenButton(page, 5)).toHaveAttribute("aria-pressed", "true");
});

test("replay matches the token cards' height", async ({ page }) => {
  const token = tokenButton(page, 0);
  await press(page, 0);
  await waitSettled(page);

  const replay = page.locator(`${STAGE} .attn__replay`);
  await expect(replay).toBeVisible();

  const tokenBox = await token.boundingBox();
  const replayBox = await replay.boundingBox();
  expect(tokenBox).not.toBeNull();
  expect(replayBox).not.toBeNull();
  expect(replayBox!.height).toBeCloseTo(tokenBox!.height, 1);
});

test("the live region announces the settled state for assistive tech", async ({ page }) => {
  await press(page, 3);
  await waitSettled(page);

  await expect(page.locator(`${STAGE} [aria-live="polite"]`)).toContainText("complete");
});
