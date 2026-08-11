# Process overview

A single-page, interactive redraw of the Transformer encoder from ["Attention Is All You
Need"](https://arxiv.org/pdf/1706.03762): a four-stage tablist (embedding, positional
encoding, self-attention with an 8-head selector, feed-forward) drives both an original SVG
architecture diagram and a live computation panel, all running real toy math over a fixed
4-token sentence — never a fabricated "model output".

## The moments that mattered

1. **Committing the spec test red, without breaking the build.** The one-week rule is "never
   commit a red build or typecheck", but the course's one stated exception is a spec test
   committed before the implementation exists. Importing `stages.ts`/`toy-example.ts` into
   the test before they existed would have failed typecheck, which the exception doesn't
   cover — so instead the test hardcoded the expected constants (`STAGE_IDS`, `TOKENS`,
   `HEAD_COUNT`) directly, keeping only the *assertions* red.
   [`1863fae`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/1863fae)
   committed the 27-assertion contract red; it turned green three commits later once the
   stepper and panels actually existed
   [`1863fae...8b69c53`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/compare/1863fae...8b69c53).

2. **The unit test caught a real dimensionality bug before it shipped.** `selfAttention()`
   projects each head's values into `HEAD_DIM`-space (2) via `Wv` and never concatenates the
   8 heads back into `MODEL_DIM`-space (4) — there's no output-projection matrix in this toy
   scope. The first draft of `toy-example.test.ts` asserted the output had length `MODEL_DIM`
   anyway, out of habit rather than by reading what the function actually returns; running
   `pnpm test` failed immediately and precisely, before the wrong assumption reached a
   commit. Fixed by asserting `HEAD_DIM` instead and documenting the decision honestly in the
   feed-forward panel's caption rather than quietly faking a `Wo`-projected data path that
   doesn't exist.
   [`27c3251`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/27c3251).

3. **A copy bug only the rendered page showed.** The intro paragraph's two citation links used
   Astro's `</a\n>` whitespace-trimming trick to keep punctuation glued to the link text on
   the closing side — but the same trimming ate the newline on the *opening* side too,
   so the built HTML read `architecture from<a href=...>` with no space at all. `astro check`,
   the build, and every test stayed green throughout; nothing mechanical would have caught
   it. Only looking at the actual rendered page in Chrome surfaced "fromAttention Is All You
   Need" running together. Fixed with an explicit `{" "}` at both sites.
   [`fdcaff3`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/fdcaff3).

4. **A tooling limitation, worked around and written into the harness.** The marking spec asks
   for verification at 1920×1080 and 390×844, but this machine's window manager silently
   clamps `resize_window` — `window.innerWidth` stayed at ~864px no matter what size was
   requested, so the two marking viewports couldn't be tested by literally resizing the
   window. Rather than skip the check or claim it was "probably fine", the workaround was a
   same-origin `<iframe>` with an explicit `width`/`height`: each iframe gets its own viewport
   for media-query purposes, so `getComputedStyle` inside it verified the `720px` breakpoint's
   grid math (`1.2fr 1fr` at 1920px, single column at 390px) at both exact marking sizes. That
   technique — and its limits (it can't stand in for the click-driven interaction checks,
   which still ran in the real tab) — is now written into `CLAUDE.md` so it doesn't have to be
   rediscovered next week.
   [`41f96eb`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/41f96eb).

5. **The checks were all green and the page was still wrong.** Every sensor passed — build,
   typecheck, lint, 27 spec assertions — while the page was a dashboard: two columns of
   controls, Tailwind-default indigo, 16px system-ui, a `72rem` cap that ran the intro prose
   to about 160 characters a line, and exactly one CSS transition in the entire repo. Nothing
   in the harness measures whether a page reads as an explanation, so nothing went red. The
   fix was a genre change rather than a restyle: a single-column essay at a 62ch measure with
   real prose either side of one breakout `<figure>`, and every colour, size and duration
   moved into `src/styles/global.css` as tokens no component may re-declare.
   [`ee3300d`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-Arvinyuchen/commit/ee3300d).

   Two of the bugs it surfaced were only findable by measuring the rendered page, not by
   reading the source. Astro scopes `.prose > *` to `.prose[cid] > [cid]`, which outranks a
   bare `.figure[cid]`, so the breakout figure silently stayed trapped in the measure column —
   visible only as a `getBoundingClientRect()` of 655px where 1152px was intended, read out of
   the same iframe probe from moment 4. And adding fifteen lines to `interactive.ts` pushed
   the hoisted script bundle to 4194 bytes, one step past the 4 KB limit under which Astro
   inlines it, so the build started emitting a base-prefixed `<script src>` that 404s under
   `linkinator ./dist` — the stylesheet trap already written into `CLAUDE.md`, reappearing in
   a different tag. Both are now in `CLAUDE.md` as rules rather than as scar tissue.

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that the
current reflection entry is in `reflections/`, and that your `CLAUDE.md` is
there --- before a marker ever opens the file. It checks that your map is
traceable, not that it is good: the marker judges whether your small,
deliberately chosen set of moments shows real judgement and reflection. A green
check is not a substitute for that curation.

Images are deliberately not checked, because whether one renders is visible the
moment you look. Open this file on GitHub and look at it before you ship.
