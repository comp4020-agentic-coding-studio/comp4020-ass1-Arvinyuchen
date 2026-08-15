# Process overview

An interactive explainer of "Attention Is All You Need", worked through on one
six-token sentence — `the cat chased the small mouse` — with weights small enough
to check by hand. Eleven chapters, one stateful visualisation each, every number
computed from the matrices shown beside it. Built on the four-stage prototype here
[`7eb7683...0fc80d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/compare/7eb7683...0fc80d6).

## The moments that mattered

1. **Building the sensor instead of looking again.** The previous CLAUDE.md
   admitted the gap in writing: JSDOM parses the built HTML but never runs
   scripts, so the spec could assert markup and nothing more, and interaction was
   "verified by hand in Chrome". Rather than do that again, Playwright went in. It
   would not start: `astro preview` daemonises without a TTY, exactly how Playwright
   launches it, so Playwright called the server dead while it served fine — answered
   with a foreground server mounting the deployed base path. Three bugs in its first
   green run: the stepper
   silently reverted itself, a window resize threw away the reader's place (the
   marking notes' own "resizes mid-use" case), and the score grid dragged the
   document sideways on a phone
   [`f7136ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/f7136ac).
   A later lint over every chapter at every beat found what hand-checking never
   would: the sticky figure was taller than the viewport on **ten of eleven
   chapters** on a phone, up to 2306px in 844px. A sticky element taller than its
   viewport cannot stick, so the page's premise collapsed on half the marking
   surface
   [`0fc80d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/0fc80d6).

2. **Making the arithmetic mechanically honest rather than promising it.** The old
   weights came from a seeded sine: reproducible, but `-0.537` is uncheckable. They
   are now literals from {-1, -0.5, 0, 0.5, 1}. The load-bearing part is
   `derive.ts` — components render its expansion output and never format their own
   arithmetic, so "the working matches the matrices" is a property test over all 36
   q·k pairs rather than a caption
   [`d32b57f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/d32b57f).
   Tuning the heads produced a wrong answer worth keeping: the syntax head sends
   `cat` to `small`, a modifier belonging to another noun. Chapter 7 is built on that
   failure rather than hiding it, and the suite asserts it so the on-screen claim
   cannot drift.

3. **Verifying gates rather than trusting their flags.** React islands ship as
   separate chunks whatever the inline limit says, breaking CI's `linkinator`
   crawl; fixed with the config a sibling repo precedents, plus `checkFragments`
   so the chapter anchors are actually validated — then proved by pointing an
   anchor at a missing id and confirming it exits 1, because linkinator reports
   "scanned 1 links" with 25 anchors present and looks inert
   [`778fc58`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/778fc58).
   The same instinct killed a wrong conclusion later: a real-browser run showed
   catastrophic jank, but that was `requestAnimationFrame` throttled in a
   backgrounded tab. Measured properly: 8.3ms frames, none dropped.

4. **Distrusting green.** Three suites passed while being wrong. `spec/`'s
   selectors were unscoped, so once eleven chapters existed `.beat` matched 46
   elements and the chapter-5 assertions succeeded for the wrong reason. axe-core,
   once wired, failed 463 nodes on one rule — nearly all because `opacity` used for
   de-emphasis composites onto the text inside it, dropping a 12px label to 1.61:1
   [`cc16516`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/cc16516).
   And I twice reported the e2e suite as fully green by reading it with `tail -3`,
   which cut the failure list off above the pass count; five phone tests were
   failing both times. All three are now written into CLAUDE.md as rules.

## Before you ship

`pnpm check` runs typecheck, build, lint and 82 unit and spec tests.
`pnpm check:evidence` checks these citations. `pnpm test:e2e` is a local gate —
105 tests including axe-core — deliberately outside CI, which needs no browser
download.
