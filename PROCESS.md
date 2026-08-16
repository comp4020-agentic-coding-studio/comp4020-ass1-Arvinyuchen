# Process overview

An interactive explainer of "Attention Is All You Need" on one six-token sentence
— `the cat chased the small mouse` — with weights checkable by hand.
Eleven chapters, one stateful visualisation each, every number computed from the
matrices beside it. Built on the four-stage prototype
[`7eb7683...27c03f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/compare/7eb7683...27c03f7).

## The moments that mattered

1. **Building the sensor instead of looking again.** The previous CLAUDE.md
   admitted the gap: JSDOM never runs scripts, so interaction was "verified by
   hand in Chrome".
   Playwright went in instead, and found three bugs in its first run: the stepper
   silently reverted itself, a resize threw away the reader's place (the marking
   notes' own "resizes mid-use" case), and the score grid dragged the document
   sideways on a phone
   [`f7136ac`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/f7136ac).
   A later lint over every chapter at every beat found what clicking never did:
   the sticky figure outgrew the viewport on **ten of eleven chapters** on a phone,
   2306px in 844px at worst — and a sticky element that tall cannot stick, so the
   page's premise collapsed on half the marking surface
   [`0fc80d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/0fc80d6).

2. **Not letting the page lie about maths — numbers or notation.** The old weights
   came from a seeded sine: reproducible, but `-0.537` is uncheckable. They are
   literals from {-1, -0.5, 0, 0.5, 1} now, and `derive.ts` is load-bearing:
   components render its expansion output and never format their own
   arithmetic, so "the working matches the matrices" is a property test over all 36
   q·k pairs
   [`d32b57f`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/d32b57f).
   Tuning the heads produced a wrong answer worth keeping: the syntax head sends
   `cat` to `small`, a modifier of another noun; chapter 7 is built on that failure
   and the suite asserts it. Notation took longer. Equations were four hand-built
   mechanisms and the giveaway was a 40px fraction bar under a 900px numerator; all
   of it is KaTeX at build time now. That retired a claim the notes had made for
   days: `--font-math` asked for Latin Modern without self-hosting it, so every
   visitor saw Times
   [`27c03f7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/27c03f7).

3. **Verifying gates rather than trusting their flags — including my own.** React
   islands ship as separate chunks regardless of the inline limit, breaking CI's
   `linkinator` crawl; fixed with a config the sibling repo precedents, proved by
   pointing an anchor at a missing id. I then claimed
   twice that the config exempted those chunks. It never did — the pattern was
   anchored and never matched, and they passed only because linkinator does not check
   `<script src>` at all. An `<img>` exposed it on the first build; a spec test now
   asserts every base-prefixed asset resolves on disk
   [`23072d6`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/23072d6).

4. **Distrusting green.** `spec/`'s selectors were unscoped, so with eleven chapters
   `.beat` matched 46 elements and the chapter-5 assertions passed for the wrong
   reason. axe-core, once wired, failed 463 nodes on one rule — nearly all because
   `opacity` for de-emphasis composites onto text, dropping a 12px label to 1.61:1
   [`cc16516`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/cc16516).
   And I twice called the e2e suite green by reading it with `tail -3`, which cuts
   the failure list off above the pass count; five phone tests were failing. Then
   two defects no check had: the hero stopped 352px short of the chapters' content
   edge, and every heading sat ~300px above its figure. My test for the fix passed
   while the regression was live: I measured the container, whose `padding-block`
   is inside its border box, so its top never moves — only the beat does
   [`e7dbfc9`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/e7dbfc9).
   All of it is in CLAUDE.md as rules now.

5. **Two chapter layouts, and then one.** A rendered review of all eleven chapters
   showed the prose announcing the next idea before the current diagram was
   finished, and cumulative visual stages as tall as 1017px. The fix put a deep
   seam through `ChapterFrame`: desktop got a left-hand rail of viewport-length
   prose beats scrolling past a `position: sticky` figure, driven by an
   IntersectionObserver; phones got exactly one active paragraph above a stepper.
   Chapter components were changed to replace, rather than accumulate, matrices as
   the stage changes — and that part was right and has not moved since.

   The seam was the mistake, and it took building both halves to see it. The phone
   half was the one that worked: one paragraph, one figure, one control, no
   arbitration. The desktop half needed a scroll observer, a manual latch to stop
   the observer fighting the stepper, 88svh of spacing per beat to keep the two
   from racing, and a documented list of three separate bugs before it behaved.
   Measured against each other, the elaborate half was not teaching anything the
   simple half did not.

   So the desktop was rebuilt onto the phone's arrangement and everything that
   existed only to serve the split was deleted: the observer, the latch, the beat
   spacing, the stick signal, the entry reveal. `useScrollStage` became `useStage`
   — 60 lines to 20, and the name stopped lying. The figure is capped at exactly
   the width it had as a grid column, so every figure lays out as it did.

   The browser suite measures the result: the figure card must fit the viewport,
   landing on a chapter must put its stepper on screen, one active paragraph must
   sit above its visual, and one test asserts the layout is *the same* at 390 and
   1920 — which is the guarantee the two-column version could never make
   [`b8cb51d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/b8cb51d).

6. **A motion layer that was never running.** The desktop chapters were meant to
   have enter and exit transitions and did not, and the cause was structural
   rather than a wrong duration: `AnimatePresence` sat inside `Reveal` while
   every call site mounted `Reveal` conditionally, so React unmounted the
   presence container along with its child and no `exit` variant had ever played.
   The primitive was also imported by two files out of thirteen. Replacing it
   with `primitives/Stage.tsx` — condition inside the container, direction
   derived from the stage delta, `aria-hidden` on the departing copy — turned
   eleven hard-cutting chapters into eleven that move, and added a stick-state
   signal, a nav that marks where the reader is, and a view-timeline entry
   reveal. The phone was left byte-identical on purpose and there was a test that
   said so.

   Two of those four additions — the stick signal and the entry reveal — were
   deleted one session later, when the layout they served was (item 5). That is
   worth stating rather than tidying away: they were built to a stated design,
   measured, and removed with it. The `Stage.tsx` work and the nav survive
   unchanged, and the Chrome traps the entry reveal cost are recorded in CLAUDE.md
   under a heading that says why they outlived their code.

   Four defects surfaced only because each new check was deliberately falsified
   before it was trusted, and every one of them looked like something else:

   - `usePresence` instead of `useIsPresent` left exiting blocks mounted forever.
     It presented as chapter 3 overflowing the viewport by 88px.
   - The CSS minifier folded `animation-timeline: view()` into the `animation`
     shorthand, producing a declaration Chrome discards. The source was right,
     the keyframes shipped, and `animation-name` computed to `none`.
   - `IntersectionObserver` with five thresholds never fires inside a chapter
     four viewports tall, so the nav silently stopped keeping up.
   - A view-timeline animation on the sticky figure made the "every stage fits in
     the viewport" spec fail on a different chapter each run — the same "never
     transform the sticky element" rule this repo had already learned twice.

   The first two of those were found by mutations that were *supposed* to make a
   test go red and did not. Six of the twelve mutations came back green on the
   first sweep; four were weak tests and two were live bugs [`b8cb51d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/b8cb51d).

7. **Removing a chapter.** "Past the paper" — decoder-only stacks, RoPE, RMSNorm,
   and what survived — came out of the page. It was the only section making claims
   the 2017 paper does not support, so it had carried a visible "beyond the paper"
   flag and a spec test asserting the flag was there; both went with it. The page
   now ends where the paper ends.

   The removal is small evidence of something the harness got right: the chapter
   was one component, one entry in `chapters.ts`, one island, one contiguous CSS
   block and a handful of named tests, and taking it out touched nothing else. The
   nav, the beat counts and the anchor list all derive from `CHAPTERS`, so they
   followed on their own. What did not follow automatically was the prose in
   `CLAUDE.md` — nine present-tense claims about "eleven chapters" and one
   interaction-contract entry for a control that no longer exists — which is the
   same stale-comment failure mode this file keeps recording, and the reason the
   figure-height numbers were re-measured rather than adjusted by arithmetic.

## Before you ship

`pnpm check` runs typecheck, build, lint and 113 tests; `pnpm check:evidence` checks
these citations. `pnpm test:e2e` is a local gate of 167, axe-core included.

### The motion checks, and the mutation that makes each one fail

A check nobody has seen fail is not evidence. Each was applied, observed red, and
reverted. Three rows were removed when the checks they describe were deleted along
with the stick signal and the entry reveal; the rest still hold.

| Check | Mutation | Result |
| --- | --- | --- |
| a block arrives from the side the reader is travelling from | flip `dir * SHIFT` in `BLOCK.enter` | red |
| nothing is left resting at reduced opacity | `BLOCK.active` → `opacity: 0.6` | red |
| the outgoing block actually leaves | `AnimatePresence` back inside the condition | red |
| a leaving block is hidden from assistive technology | drop `aria-hidden` from `PresenceBlock` | red |
| nothing is left mounted once a transition is over | `useIsPresent` → `usePresence` | build refused it |
| the nav marks the right chapter | the script's `LINE` → 1.5 | red |
| the nav says where it is to assistive tech | drop the `aria-current` branch | red |
| reduced motion reaches the end state | remove the `animated` early return | red |
| the chapter layout is the same at every width | put `.chapter__prose { display: flex }` back in a `@media (width >= 900px)` block | red |
| the figure card fits inside the viewport | `padding-block: 50vh` on `.chapter__viz` | red |
| landing on a chapter puts its stepper on screen | `padding-block: 95vh` on `.chapter` | red |
| everything inside a chapter starts on one left edge | `margin-inline: auto` on `.chapter__figure` | red |
| the chapter column is centred in the viewport | `margin-inline: 0` on `.chapter` | red |
| one active paragraph, above its visual | `display: none` on `.chapter__active-beat` | red |
