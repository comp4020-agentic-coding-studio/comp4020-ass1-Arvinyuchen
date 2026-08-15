# Process overview

An interactive explainer of "Attention Is All You Need" on one six-token sentence
— `the cat chased the small mouse` — with weights small enough to check by hand.
Eleven chapters, one stateful visualisation each, every number computed from the
matrices beside it. Built on the four-stage prototype here
[`7eb7683...27c03f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/compare/7eb7683...27c03f7).

## The moments that mattered

1. **Building the sensor instead of looking again.** The previous CLAUDE.md
   admitted the gap: JSDOM never runs scripts, so the spec could assert markup and
   nothing more, and interaction was "verified by hand in Chrome".
   Playwright went in instead — after a detour, because `astro preview` daemonises
   without a TTY, exactly how Playwright launches it. Three bugs in its first run:
   the stepper silently reverted
   itself, a resize threw away the reader's place (the marking notes' own "resizes
   mid-use" case), and the score grid dragged the document sideways on a phone
   [`f7136ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/f7136ac).
   A later lint over every chapter at every beat found what clicking never did:
   the sticky figure was taller than the viewport on **ten of eleven chapters** on a
   phone, up to 2306px in 844px — and a sticky element that tall cannot stick, so the
   page's premise collapsed on half the marking surface
   [`0fc80d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/0fc80d6).

2. **Not letting the page lie about maths — numbers or notation.** The old weights
   came from a seeded sine: reproducible, but `-0.537` is uncheckable. They are
   literals from {-1, -0.5, 0, 0.5, 1} now, and `derive.ts` is load-bearing:
   components render its expansion output and never format their own
   arithmetic, so "the working matches the matrices" is a property test over all 36
   q·k pairs rather than a caption
   [`d32b57f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/d32b57f).
   Tuning the heads produced a wrong answer worth keeping: the syntax head sends
   `cat` to `small`, a modifier belonging to another noun; chapter 7 is built on that
   failure and the suite asserts it. Notation took longer. Equations were four
   hand-built mechanisms and the giveaway was a 40px fraction bar under a 900px
   numerator; all of it is KaTeX at build time now. That retired a claim the design
   notes had been making for days: `--font-math` asked for Latin Modern without
   self-hosting it, so every visitor saw Times while the notes advertised a LaTeX
   texture the page never had
   [`27c03f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/27c03f7).

3. **Verifying gates rather than trusting their flags — including my own.** React
   islands ship as separate chunks regardless of the inline limit, breaking CI's
   `linkinator` crawl; fixed with a config the sibling repo precedents, plus
   `checkFragments`, proved by pointing an anchor at a missing id. I then claimed
   twice that the config exempted those chunks. It never did: the pattern was
   anchored and never matched, and the chunks passed only because linkinator does not
   check `<script src>` at all. Adding an `<img>` exposed it on the first build, and a
   spec test now asserts every base-prefixed asset resolves on disk
   [`23072d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/23072d6).

4. **Distrusting green.** `spec/`'s selectors were unscoped, so with eleven chapters
   `.beat` matched 46 elements and the chapter-5 assertions passed for the wrong
   reason. axe-core, once wired, failed 463 nodes on one rule — nearly all because
   `opacity` for de-emphasis composites onto text, dropping a 12px label to 1.61:1
   [`cc16516`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/cc16516).
   And I twice called the e2e suite green by reading it with `tail -3`, which cuts
   the failure list off above the pass count; five phone tests were failing. All of
   it is in CLAUDE.md as rules now.

## Before you ship

`pnpm check` runs typecheck, build, lint and 87 tests. `pnpm check:evidence` checks
these citations. `pnpm test:e2e` is a local gate — 108 tests including axe-core —
outside CI.
