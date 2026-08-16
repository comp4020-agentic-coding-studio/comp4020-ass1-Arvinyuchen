import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// axe-core over the built page.
//
// This is the sensor CLAUDE.md said was missing. It is not a substitute for the
// manual checks the marker does — axe cannot tell whether a caption is *useful*,
// only whether one exists — but it catches the whole class of mistakes that are
// mechanical: contrast below threshold, a control with no accessible name, a
// heading level skipped, a table cell with no header.
//
// Every chapter is scanned individually as well as the whole page, because a
// violation inside one island would otherwise be one row in a list of many and
// easy to lose.

const CHAPTERS = [
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
] as const;

/** WCAG 2.1 A and AA, which is what the rules are conventionally held to. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function hydrateEverything(page: Page): Promise<void> {
  // Islands are `client:visible`, so nothing below the fold is interactive until
  // it has been scrolled past. Scanning before that would test the
  // server-rendered markup only.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

/** Formats violations so a failure names the rule, the impact and the element
 * rather than dumping an object. */
function describe(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]): string {
  return violations
    .map(
      (v) =>
        `\n[${v.impact ?? "unknown"}] ${v.id}: ${v.help}\n  ${v.nodes
          .slice(0, 4)
          .map((n) => n.target.join(" "))
          .join("\n  ")}`,
    )
    .join("\n");
}

test("the whole page has no accessibility violations", async ({ page }) => {
  await page.goto("./");
  await hydrateEverything(page);

  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations, describe(violations)).toEqual([]);
});

test("the page has no violations in dark mode", async ({ page }) => {
  // Dark mode is a separate set of colour steps, not an inversion, so its
  // contrast has to be checked separately.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  await hydrateEverything(page);

  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations, describe(violations)).toEqual([]);
});

for (const id of CHAPTERS) {
  test(`chapter ${id} has no accessibility violations`, async ({ page }) => {
    await page.goto("./");
    await hydrateEverything(page);

    const { violations } = await new AxeBuilder({ page })
      .include(`[data-chapter="${id}"]`)
      .withTags(TAGS)
      .analyze();
    expect(violations, describe(violations)).toEqual([]);
  });
}

test("chapter 5 stays clean with the score grid open", async ({ page }) => {
  // The grid, the working and the legend only exist past the first beat, so the
  // default scan never sees them.
  await page.goto("./#scaled-dot-product");
  const dot = page.locator('[data-chapter="05"] [data-stage-index="4"]');
  await expect(async () => {
    await dot.click();
    await expect(dot).toHaveAttribute("aria-current", "step", { timeout: 750 });
  }).toPass({ timeout: 15_000 });

  const { violations } = await new AxeBuilder({ page })
    .include('[data-chapter="05"]')
    .withTags(TAGS)
    .analyze();
  expect(violations, describe(violations)).toEqual([]);
});

test("the chapter navigation and hero have no violations", async ({ page }) => {
  await page.goto("./");
  for (const region of ["[data-glyph]", ".hero"]) {
    const { violations } = await new AxeBuilder({ page })
      .include(region)
      .withTags(TAGS)
      .analyze();
    expect(violations, `${region}${describe(violations)}`).toEqual([]);
  }
});
