# Process overview

## What I built

An interactive explainer of "Attention Is All You Need" that works one six-token
sentence — `the cat chased the small mouse` — through the whole architecture: ten
chapters, one stateful visualisation each, weights from {-1, -0.5, 0, 0.5, 1} so
the arithmetic is checkable by hand. The page never asks to be believed: every
number is real output of `src/lib/transformer/`, the nav *is* an attention matrix
rather than a picture of one, and the model's one wrong answer — the syntax head
sends `cat` to `small` — is kept, because chapter 7 is built on it. From the
four-stage prototype
[`7eb7683...27c03f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/compare/7eb7683...27c03f7).

## The moments that mattered

1. **Building the sensor instead of looking again.** My CLAUDE.md admitted the
   gap in writing: JSDOM never runs scripts, so interaction was "verified by hand
   in Chrome". The obvious move was to look harder; I read it as a missing
   instrument and built Playwright in instead. Three defects in the first green run,
   including a chapter that discarded the reader's place on resize — the marking
   notes' own "resizes mid-use" case, on a page I had hand-tested a dozen times
   without once resizing it
   [`f7136ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/f7136ac).
   The same instinct as a display lint over every chapter at every beat found the
   sticky figure overflowing the phone viewport on ten of eleven chapters
   [`0fc80d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/0fc80d6).

2. **Not letting the page lie about its maths.** Weights came from a seeded sine:
   reproducible, and uncheckable, because nobody can verify `-0.537`. Rather than
   just picking nicer numbers I put a rule in the harness — *a component never
   formats its own arithmetic*, everything renders `derive.ts` output — which
   turns "the working matches the matrices" into a property test over all 36 q·k
   pairs
   [`d32b57f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/d32b57f).
   Notation was the same lesson: four hand-built mechanisms, given away by a 40px
   fraction bar under a 900px numerator, all KaTeX at build time now — retiring my
   notes' claim that the page used Latin Modern when visitors saw Times
   [`27c03f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/27c03f7).

3. **Distrusting green, including my own claims about it.** I asserted twice in
   CLAUDE.md that the links config exempted the island chunks. It never did — the
   pattern never matched, and they passed only because linkinator ignores
   `<script src>`. The fix went into a spec test asserting every asset resolves on
   disk, rather than another config line to trust
   [`23072d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/23072d6).
   Unscoped selectors matched 46 elements and passed for the wrong reason
   [`cc16516`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/cc16516);
   a test for a 300px misalignment passed while the regression was live, because I
   measured the container rather than the element that moves
   [`e7dbfc9`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/e7dbfc9).
   Falsification is part of writing a check now: on the first sweep six of twelve
   deliberate mutations left the test green — four weak tests, two live bugs.

4. **Building a layout, measuring it, and deleting it.** Chapters had a seam:
   desktop got a scrollytelling rail past a sticky figure; phones got one paragraph
   and a stepper. The obvious move was to keep improving the elaborate half,
   because I had built it. Side by side it needed an observer, a latch, 88svh of
   beat spacing and three race fixes to teach nothing the simple half didn't — so I
   deleted it, with two features shipped the day before, and rebuilt desktop onto
   the phone's arrangement. How I knew: a throwaway probe over every chapter at
   every stage at both viewports, and a test asserting the layout is now *the same*
   at 390 and 1920
   [`b8cb51d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/b8cb51d).
   Deleting a whole chapter afterwards touched one component, one list entry and a
   few tests — the clearest evidence the seams ended up in the right places
   [`b725f48`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/b725f48).
