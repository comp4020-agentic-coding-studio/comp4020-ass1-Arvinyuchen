# Process overview

An interactive explainer of "Attention Is All You Need", worked through on one
six-token sentence — `the cat chased the small mouse` — with weights small enough
that a reader can check the arithmetic by hand. Eleven chapters, one stateful
visualisation each, every number computed from the matrices shown beside it.
Built on the previous four-stage prototype in this repo
[`7eb7683...f7136ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/compare/7eb7683...f7136ac).

## The moments that mattered

1. **Wiring a sensor that could see interaction, instead of checking by hand
   again.** The previous CLAUDE.md admitted the gap in writing: JSDOM parses the
   built HTML but never runs scripts, so the spec could assert markup and nothing
   more, and interactive correctness was "verified by hand in Chrome". Rather than
   do that again, Playwright went in. It could not start: `astro preview`
   daemonises when it has no TTY, which is exactly how Playwright launches it, so
   Playwright reported the server "exited early" while it was running fine —
   answered with a foreground static server that also mounts `dist/` at the
   deployed base path. The 60 resulting checks immediately found three real bugs
   no unit test could reach: the stepper silently reverted itself, because a
   700ms timer was racing a smooth scroll; resizing the window threw the reader's
   place away, because the observer resumed on `scroll` and a reflow fires one;
   and the 6×6 score grid dragged the whole document sideways at 390px, because a
   grid item's default `min-width` is its content size. The middle one is the
   marking notes' own "resizes mid-use" case
   [`f7136ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/f7136ac).

2. **Making the arithmetic mechanically honest rather than promising it.** The
   old weights came from a seeded sine, so entries like `-0.537` were reproducible
   but uncheckable. They are now literals from {-1, -0.5, 0, 0.5, 1}. The
   load-bearing part is `derive.ts`: components render its expansion output and
   never format their own arithmetic, so "the working matches the matrices" is a
   property test over all 36 q·k pairs rather than a claim in a caption
   [`d32b57f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/d32b57f).
   Tuning the head weights also produced a wrong answer worth keeping: the syntax
   head sends `cat` to `small`, a modifier belonging to another noun. Chapter 7 is
   built on that failure instead of hiding it, and the unit suite asserts it so
   the on-screen claim cannot drift from the numbers.

3. **Verifying a gate rather than trusting its flag.** React islands are emitted
   as separate chunks whatever `assetsInlineLimit` says, which breaks CI's
   `linkinator ./dist` crawl of base-prefixed URLs. Fixed with the config file a
   sibling repo already precedents, and `checkFragments` turned on so the eleven
   chapter anchors are actually validated — then proved by pointing an anchor at a
   missing id and confirming it exits 1, because linkinator reports "scanned 1
   links" with 25 anchors on the page and looks like it is doing nothing
   [`778fc58`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/778fc58).

4. **Distrusting a green suite.** When ten more chapters landed, `.beat` matched
   46 elements and the chapter-5 assertions passed for entirely the wrong reason.
   Every chapter-specific selector is now scoped to `[data-chapter]`, and a new
   test asserts no rendered prose contains a backtick or a `d_k` — because
   `chapters.ts` holds plain strings with no markdown step, and that had already
   shipped to the page once
   [`1490e75`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/1490e75).

## Before you ship

`pnpm check` runs typecheck, build, lint and 82 unit and spec tests.
`pnpm check:evidence` checks these citations resolve. The Playwright suite is a
local gate, `pnpm test:e2e`, deliberately outside CI: it needs a browser download,
and a flake inside `check` would block the deploy that depends on it.
