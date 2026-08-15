# COMP4020 prototype

This is your starter repo for a COMP4020 prototype: a static site written in
HTML/CSS/TypeScript that builds to plain HTML/CSS/JS and deploys to GitHub
Pages. The **deployed site is what gets marked** --- not this repo, and not "it
works on my machine". It's marked live in Chrome against the deployed URL at two
viewports --- 1920×1080 (desktop) and 390×844 (phone) --- and both count in
full, so make that artefact good at both and use the checks below to know
whether it is.

What you're building this week — the spec — is published on the course website,
and this repo's name tells you which deliverable it is. Run the course plugin's
**start** skill at the start of each week: it pulls the right spec from the
course API, carries your harness forward from last week, and helps you turn the
spec's checkable lines into tests of your own. Read the spec before you build,
and see `spec/README.md` for how the checks in this repo relate to it.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Before you push, run `pnpm check`. It runs most of what CI runs --- build,
  lint, and the spec --- so you catch those in seconds instead of waiting for
  the pipeline. The links check, the evidence check, the secrets scan, and the
  deploy itself only run in CI; run `pnpm dlx linkinator ./dist --silent`
  locally against a fresh `pnpm build` for the links check without waiting for
  CI.
- To see what the page actually looks like rather than what you assume it looks
  like, open it in a browser (the `agent-browser` CLI, documented on
  [the course site](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/backpressure/#agent-browser-the-rendered-page-as-ground-truth),
  works well for this). The rendered page is the truth; your mental model of it
  isn't.
- When a check fails, read its output before changing anything. Each check below
  names what it measures, and the failure message is the instruction: it tells
  you the file, the line, or the contract. Treat a red check as authoritative
  --- the page is wrong until the check is green, not until you decide it should
  be.
- Commit when the checks pass. Never commit a red state --- with **one stated
  exception**: a spec test may be committed before the implementation that
  satisfies it, so the contract is in the history before the code that answers
  it. A red build, typecheck, or lint is never acceptable. Amending this rule
  rather than quietly working around it is the point of having it written down.

## The checks (your sensors)

CI runs these on every push once your repo is public. GitHub's checks UI shows
two jobs, `check` and `deploy` --- not one status per sensor below --- and
within `check` the steps run in sequence (`pnpm check` chains typecheck, build,
lint, and the spec with `&&`), so an early failure like a broken build stops the
later sensors from running for that push; fix it and push again to see the rest.
While the repo is private (all week, until you ship) the CI jobs stay skipped
--- `pnpm check` is the same roster on your machine, and it's the faster loop
anyway. They aren't hoops. Each is a different way of finding out something true
about the site that you can't reliably see by looking at it.

They also carry a mark at a crit: the sweep runs fifteen minutes after your
cutoff, and green checks there are worth half that week's shipped mark. Still
running counts as not green, so ship with time for CI to finish.

- **typecheck** --- `tsc --noEmit` runs first in `pnpm check`, so a type error
  stops the roster before the build even starts. The types are extra
  backpressure: a red here is the compiler telling you a claim in the code is
  false.
- **build** --- the site must build (`pnpm build`). A build failure means the
  deployed site is broken or stale, so nothing else matters until this is green.
- **deploy / online** --- the live GitHub Pages URL must load and return the
  page you expect. An asset that 404s on the deployed URL counts as broken even
  if it loads locally.
- **spec** --- `spec/invariants.test.ts` asserts what's true of any good
  website, whatever the week's brief asks; the tests you write for the week's
  own spec run alongside it (any `spec/*.test.ts`). A failure names the contract
  you haven't met yet.
- **lint** --- `stylelint` for CSS, `oxlint` for TypeScript. Flags code that's
  wrong, fragile, or non-idiomatic. Read the rule it names.
- **tests** --- any other tests you write, wherever you put them (co-located
  with your source is fine, not just `spec/`), must pass. Vitest picks up both
  this and the spec suite in one `vitest run`, the last step of `pnpm check`. A
  failing test is a claim about the site that's no longer true.
- **evidence** (`pnpm check:evidence`) --- checks your process evidence:
  `PROCESS.md`'s citations resolve to real commits, the current deliverable's
  exact reflection is in `reflections/` (worked out from this repo's name
  against the public course API), and your `CLAUDE.md` is present. Evidence
  gates the deploy --- `deploy` needs `check` to pass, so failing evidence
  blocks the deploy alongside everything else. See
  [Your process is part of the mark](#your-process-is-part-of-the-mark) below,
  and the course website's
  [assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
  for what counts as evidence.
- **links** --- internal links must resolve. A broken link is a dead end you
  didn't mean to ship.
- **secrets** --- the repo is scanned for committed credentials. Never put a
  key, token, or password in a tracked file. If one leaks, rotate it. A local
  pre-commit hook (`.githooks/pre-commit`, installed by `pnpm install`) also
  blocks any commit containing something shaped like an API key --- by the time
  CI sees a key it's already pushed, so the hook is the sensor that matters.

Nothing in the shipped roster measures **accessibility** or **performance**.
Some of the first is now wired locally: the Playwright suite tabs through the
page, drives controls by keyboard, and checks a resize mid-interaction, and
`spec/` asserts every matrix has a caption and every control is a real
`<button>` or `<a>`. That is a floor, not an audit --- there is still no
`axe-core` and no Lighthouse, and later in the course the spec will ask you to
show how you tested both. When you do,
read a green performance result honestly: it's a lab estimate from one run on a
CI machine, not proof the site is fast for real users.

## The stack is swappable

Out of the box this is plain HTML/CSS/TypeScript on Vite, and every `.html` file
in the repo is a page: add pages, link them, and the build picks them up with no
config. That's a default, not a rule (unless the week's spec says otherwise).
You can swap in Astro or any other static generator, because nothing in CI names
a tool --- the whole contract is:

- `pnpm build` emits the complete site into `dist/`
- the `package.json` scripts (`check`, `check:evidence`, `build`) keep working
- whatever lands in `dist/` still passes the invariants in `spec/`

Two things bite in a swap. The deployed site lives under a path
(`…github.io/<repo>/`), so configure your generator's base path --- this
template's Vite config uses relative asset URLs to sidestep that, but most
generators (Astro included) need `base` set explicitly, and getting it wrong
looks fine locally while every asset 404s on the live URL. And commit the
updated `pnpm-lock.yaml`: CI installs with `--frozen-lockfile`.

### This repo: on Astro

Carried forward from last week's prototype. Pages live in `src/pages/*.astro`;
`astro.config.mjs` sets `base` to `/comp4020-ass1-Arvinyuchen` for the deployed
org-Pages path --- that value is per-repo, so it needs setting again here, not
copied from last week's. `pnpm typecheck` runs `astro check` instead of raw
`tsc`. Internal `<a>` hrefs stay **relative** (`./`, not `import.meta.env.BASE_URL`)
--- an absolute base-prefixed href is correct once deployed but 404s under
`linkinator`'s local `./dist` crawl, since the on-disk tree doesn't mirror the
deployed subpath. Keep it that way rather than reaching for the base-aware
helper.

Three build options exist for the same reason, and all are load-bearing:

- `build.format: "file"` --- every page lands at `dist/*.html`, so one set of
  relative hrefs works from every page. Under the default directory format the
  nav would have to know its own depth.
- `build.inlineStylesheets: "always"` --- past ~4 KB Astro would emit a
  `<link href="/comp4020-ass1-Arvinyuchen/_astro/*.css">`, which is the
  absolute-href trap again, this time in a tag nobody hand-writes.
- `vite.build.assetsInlineLimit: 65536` --- the same trap in `<script>`. Astro
  inlines a hoisted script only while its bundle is under 4 KB; one line past
  that it emits `<script src="/comp4020-ass1-Arvinyuchen/_astro/*.js">` and the
  links check goes red with nothing in the source looking wrong. This was found
  the hard way: adding ~15 lines to the previous hand-rolled client script (since removed)
  pushed its bundle to 4194
  bytes and broke `linkinator ./dist`. It also inlines the two `.woff2` faces,
  which is why `dist/index.html` is large.

**This limit is no longer sufficient on its own.** A `client:*` island is emitted
as a separate module chunk plus a renderer entrypoint however high the limit goes
--- inlining cannot apply to a graph that imports across chunks. So
`linkinator.config.json` skips `_astro/`, which linkinator auto-discovers, and
which `comp4020-crit2-Arvinyuchen` already precedents against a byte-identical
workflow step. That file also turns `checkFragments` on, so the eleven chapter
anchors are genuinely validated, and skips external links --- linkinator was
previously following the page's arxiv and github URLs, so an upstream 404 could
fail a perfectly good build.

Two things about that skip, both learned by getting it wrong:

- **Anchor the pattern to nothing.** It was first written
  `^/comp4020-ass1-Arvinyuchen/_astro/`, which never matched, because linkinator
  reports these as `dist/comp4020-.../_astro/...`. It looked like it worked for
  weeks: **linkinator does not check `<script src>` at all**, so the island chunks
  were never being tested. The first `<img>` with a base-prefixed src failed the
  step immediately.
- **The skip hides a real failure, so cover it elsewhere.** A missing `_astro/`
  asset now passes the links check. `spec/assignment-1.test.ts` asserts every
  base-prefixed asset URL in the built page resolves to a file in `dist/`. Verify
  by moving one aside and watching it fail.

If you find yourself fighting any of these, the fix is upstream of the config.

### The design layer

`src/styles/global.css` is the **only** place a colour, size, radius, or
duration literal may be written. It defines the token set (`--ink*`,
`--surface*`, `--role-*`, `--seq-*`, `--div-*`, `--rule*`, `--grid-unit`,
`--text-*`, `--measure*`, `--space-*`, `--radius-*`, `--dur*`, `--ease`) plus the
`@font-face` rules, the reset, the prose base, `.num`, `.math`, `.sr-only`, the
ramp utilities, the focus ring, dark mode, and the `prefers-reduced-motion`
guard. Token names must be kebab-case (`--text-sm`, not `--step--1`, which
`custom-property-pattern` rejects).

Component CSS lives in `src/styles/viz.css` and contains **only `var()`
references** --- no literals. It is a second real stylesheet rather than Astro
scoped blocks for one reason: `stylelint` only sees `.css` files, `<style>` blocks
in `.astro` files are invisible to it, and React islands have no scoped-style
mechanism at all. So both stylesheets are linted and neither is a blind spot.

Continuous ramps without breaking the literal rule: a component sets a numeric
`--t` (sequential) or `--m` plus `data-sign` (diverging) and `color-mix()` in
`global.css` does the interpolation. Nothing outside `global.css` names a colour,
including the heatmaps.

`src/layouts/Base.astro` owns the document shell; `src/pages/index.astro` is the
hero, the glyph nav and eleven islands.

Layout is described in the week-specific section below, along with the
`min-width: 0` rule that any ancestor of a matrix needs.

## Your process is part of the mark

The deployed page is only half of it. How you got there is marked too: your
commit history, your agent files, and the decisions visible across them. The
checks above can't see any of that, so a person reads it directly --- which
means building legibly is part of building well.

- **Commit as you go.** Small, frequent commits are the record of how the work
  came together, and that record is read, not just the final state. A trail that
  grew alongside the code is the strongest evidence of your process; a single
  dump the night before is the weakest.
- **Keep a process overview** (`PROCESS.md`). A short reading-guide, not an
  essay: what you built, the moments that mattered --- each pointing at a
  commit, a `CLAUDE.md` change, or a prompt and the commit it produced --- and
  where to look in the history. It points a marker at the evidence; it doesn't
  stand in for it, and claims the history doesn't back don't count. The
  `PROCESS.md` in this repo is a template showing the shape and the citation
  format (link text the commit hash or range, target the commit or compare URL);
  `pnpm check:evidence` verifies your citations resolve to real commits before
  you ship. Markers follow those citations and don't trawl the repo for evidence
  you didn't cite.
- **Write your reflection in `reflections/`** --- a short markdown file in this
  repo, named for the deliverable it answers, so the number in the filename is
  the number in this repo's name (`crit-1.md` in `comp4020-crit1-<you>`,
  `assignment-1.md` in `comp4020-ass1-<you>`); `reflections/README.md` has the
  full rule. `pnpm check:evidence` checks the exact current name against the
  course API, not merely the presence of any well-named file. It answers the two
  standing prompts: the breakthrough that moved the work forward, and what this
  work changed about the developer you want to be. It stays out of the deployed
  site. It's due at the cutoff, and if it isn't in the repo by then the week
  doesn't count as shipped, however good the prototype is.
- **This file is process evidence.** The harness you build to direct the agent,
  this `CLAUDE.md` and any `AGENTS.md`, is itself read as part of how you
  worked. Keep it honest and current (see below).

You don't need a name, a student number, or any identity file in the repo: we
know whose repo it is. Spend the effort on the work.

### This week: an interactive explainer of "Attention Is All You Need"

One page, eleven chapters, one stateful visualisation each, over a single six-token
sentence defined once in `src/lib/transformer/constants.ts`:
`the cat chased the small mouse`. `the` appears twice on purpose — two identical
embedding rows are the only honest motivation for positional encoding, and chapter
3 is about pulling them apart.

`d_model` is 4 with two heads of `d_k = 2`. Not smaller: at `d_model = 2` a
two-head split gives `d_k = 1`, a "dot product" of two 1-vectors is just
multiplication, and chapter 5 would be teaching something that isn't the thing.

**Every number is real output of `src/lib/transformer/`, never an invented "model
output".** Weights are literals from {-1, -0.5, 0, 0.5, 1} so the arithmetic is
checkable by hand; the previous seeded-sine generator was reproducible but emitted
values like `-0.537` that no reader could verify.

`derive.ts` is the load-bearing piece and the rule that goes with it is: **a
component never formats its own arithmetic.** It renders `dotTerms` /
`softmaxTerms` / `aggregationTerms` output. That makes "the working matches the
matrices" a property test over all 36 q·k pairs instead of a claim in a caption.
Chapter 8's ablations go through `runLayerVariant()` for the same reason — an
ablation computed in the UI would be a second implementation of the layer, free to
disagree with the real one.

Head weights were tuned against what they actually compute, and one wrong answer
is kept deliberately: the syntax head sends `cat` to `small`, a modifier belonging
to another noun, because it has no notion of distance. Chapter 7 is built on that
failure. The unit suite asserts it, so the on-screen claim cannot drift from the
numbers.

#### The interaction contract

Fixed before the components existed, so the spec and the markup agree on names:

- `[data-chapter="01".."11"]` — chapter section, anchored at its slug.
- `[data-viz="<slug>"]` — the island root.
- `[data-stepper="<id>"]` with `data-testid="interaction-trigger"` — the beat
  stepper, `role="group"`, containing `button[data-stage][data-stage-index]` with
  `aria-current="step"` on the active one, plus `[data-step-prev]` /
  `[data-step-next]`.
- `.beat[data-stage][data-stage-active]` — the prose beats. Always visible.
- `[data-matrix="<name>"]` — a matrix, rendered as a real `<table
  data-table-view>`; `[data-cell="i,j"]` carries `data-value` at six decimals
  alongside the visible rounded text.
- `[data-term-expansion]` — rendered working; `[data-operand]`, `[data-product]`,
  `[data-dot-sum]`, `[data-scaled-value]`.
- `[data-slot="softmax|qk|scale|v"]` — the equation's addressable terms.
- Controls: `[data-query-select]`, `[data-row-select]`, `[data-scale-toggle]`,
  `[data-pe-toggle]`, `[data-residual-toggle]`, `[data-norm-toggle]`,
  `[data-generation-step]`, `[data-temperature]`, `[data-change-toggle]`.
- `[data-glyph]` — the page's `<nav>`, which is also the attention matrix.
- `[aria-live="polite"]` — one per chapter, announcing the step.

**The stepper is deliberately not a tablist.** A tablist implies panels that show
and hide; these beats are always visible because they are what the reader scrolls
through. Announcing them as tabs would misdescribe the page to a screen reader.

#### Sensors, and what each can and cannot see

`spec/assignment-1.test.ts` (JSDOM, against `dist/`) can only assert the markup
contract — it never executes scripts. **Scope every chapter-specific selector to
`[data-chapter]`:** unscoped, `.beat` matches 46 elements across eleven chapters
and assertions pass for the wrong reason. That happened.

`pnpm test:e2e` (Playwright, 113 tests over 3 projects: 1920×1080, 390×844, and
reduced motion) is what actually verifies interaction, and it is the gate to run
before shipping. It is outside CI on purpose: it needs a browser download, and a
flake inside `check` would block the `deploy` job that depends on it.

**Read its summary line, not the tail of its output.** Playwright prints the
failure list *above* the `N passed` line, so `| tail -3` shows a reassuring pass
count with the failures scrolled off. Two runs were reported here as fully green
while five phone accessibility tests were failing. Use
`| grep -E "passed|failed"`.

`e2e/accessibility.spec.ts` runs axe-core over the whole page, each chapter
individually, dark mode, and chapter 5 with the grid open. Two rules it keeps
catching, both of which cost real usability:

- **`opacity` for de-emphasis composites onto text.** A muted 12px label at 0.4
  opacity measures 1.61:1. Use `filter: saturate()`, which removes the colour cue
  and leaves luminance alone. Content that is merely inactive is still content
  someone may want to read; genuinely inapplicable content gets `hidden`, not a
  fade.
- **`overflow-x` creates a scrollable region that needs a tab stop.** Any strip
  that scrolls sideways and has no focusable content inside it cannot be scrolled
  by keyboard at all, so its far columns are unreachable without a mouse. Matrices
  with clickable cells already qualify; read-only ones, chapter 6's step table and
  chapter 3's curve strip carry `tabIndex={0}` with a `role`/`aria-label`.

**Cell text is one ink, and the ramp poles are capped so it always clears 4.5:1.**
Do not reintroduce a light-on-dark flip past a lightness threshold: the fill has to
be dark enough for white *before* it is too light for black, and with these ramps
there is no such crossover — 54 cells sat in the gap. Poles are chosen for the most
chroma available at a compliant luminance, because contrast depends on luminance
only and giving away saturation buys nothing.

**Text never wears an identity hue.** Those hues are picked for 3:1 as marks; as
12px text several measure ~3.6:1. Identity goes in a border or a swatch, the label
stays in an ink token.

### The figure has to fit the viewport

`.chapter__viz` is inside a `position: sticky` container, and **a sticky element
taller than the viewport cannot stick** — it scrolls away and the scrollytelling
premise collapses. This was true on ten of eleven chapters at 390×844 before it was
measured, up to 2306px in an 844px viewport, and hand-checking never caught it.

Two rules follow. Groups of side-by-side figures stay in a row on narrow screens
and the row scrolls (`.pair`, `.projection`, `.heads`, `.lanes`, `.spine`,
`.curves`), with children at `flex: 0 0 auto` so the strip owns the overflow rather
than flex shrinking each matrix and clipping its cells mid-number. And a chapter
showing a pipeline discloses it a step at a time instead of rendering every stage
at once.

Re-measure after any change to what a beat renders. Current state: desktop 0/11
over, tallest 961px; phone 4/11 over, worst 1012px, three of those by under 50px.

### Scroll performance is fine; do not "fix" it

Measured at deviceScaleFactor 2 across a 250-frame scroll and across stage changes
with Motion running: 8.3ms median, zero frames over 32ms, no long tasks. Disabling
the tiled background, the box shadows or the sticky positioning changes nothing.

If you try to measure this in a real browser tab and see catastrophic numbers — 45
second timeouts for a dozen frames — the tab is backgrounded and
`requestAnimationFrame` is throttled. That is the measurement, not the page. Use a
headless run with an explicit `deviceScaleFactor`.

What *was* rough was the absence of transitions: stage changes were hard cuts and
the figure's height jumped. `Reveal` / `RevealFrame` and a `background-color`
transition on cells handle that.

Two things that will waste an hour if you don't know them:

- **`astro preview` cannot be the test server.** It daemonises when it has no
  TTY — exactly how Playwright launches it — so Playwright reports
  "Process from config.webServer exited early" while the server runs fine. Use
  `scripts/preview-server.ts`, which stays in the foreground and mounts `dist/` at
  the deployed base path (without the base path, every island chunk 404s and the
  specs test a page with no JavaScript).
- **Islands hydrate late.** `client:visible` server-renders the markup but its
  handlers arrive later, so a single click can hit a button that isn't wired up
  yet and the failure is indistinguishable from a broken control. Route
  interactions through the retrying helpers in `e2e/`.

And a rule earned the hard way: **confirm a check can fail before trusting it.**
`linkinator` prints "scanned 1 links" with 25 anchors on the page and looks inert;
it was verified by pointing an anchor at a missing id and watching it exit 1.

#### Notation, and whose diagram is whose

**Every equation is KaTeX, rendered at build time.** TeX sources live in
`src/lib/transformer/notation.ts`; `src/lib/viz/tex.ts` is the only thing that calls
KaTeX. It runs with `throwOnError` and `strict: "error"`, so a malformed formula
fails the build rather than shipping red error text, and `trust: false`, so an
equation can typeset and nothing else. Never render it in the browser: the sources
are constants, and a parser on the client would re-derive identical markup.

Three things that were learned by doing them wrong first:

- **Do not hand-build equations.** Before KaTeX this page used four mechanisms —
  CSS flex for fractions, MathML for radicals, `<sup>`/`<sub>` for scripts, Unicode
  inside strings — and the giveaway was a 40px fraction bar under a 900px numerator,
  because the bar was a border on a denominator that shrank to its own text. A bare
  U+221A is the same class of mistake: it is the hook alone, with no bar and no
  stretching.
- **Chapter 5 is the one exception, and it is a real one.** KaTeX turns a string
  into markup and cannot host foreign DOM inside a `\frac`, so the live 6 × 6 grid
  can never sit in one. Its equation is composed from KaTeX fragments around a hand
  built fraction bar. Do not "fix" this by rendering it whole — that deletes the
  signature.
- **`assetsInlineLimit` must exclude the KaTeX fonts.** All twenty woff2 faces are
  under 64KB, so the numeric limit base64'd every one into `katex.min.css`, which
  `inlineStylesheets: "always"` then inlines into the HTML. The hook also has to
  reimplement the 64KB rule, because returning `undefined` falls back to Vite's 4KB
  default rather than the value it replaced.

Three spec tests cover the failure a typecheck cannot see — if KaTeX stops running,
the page ships raw TeX as visible text. They exclude KaTeX's own `<annotation>`
element, where keeping the source is correct.

There is deliberately **no `--font-math` and no `.math` class**. That token asked for
"Latin Modern Roman" without self-hosting it, so every visitor fell through to Times
while these notes claimed an authentic LaTeX texture. KaTeX ships its own Computer
Modern, which is the first time the claim has been true. Numbers are still
`--font-mono` with `tabular-nums`: notation is typeset, computed values are tabular,
and the two are different jobs.

More generally: **prose in `chapters.ts` is plain text with no markdown step**, so
notation there has to be written as the characters it should render as (`dₖ`, not
`d_k`), and a spec test asserts no rendered prose contains a backtick or a `d_k`.

**The originality rule, amended rather than worked around.** Chapter 10's
architecture diagram is original: own palette, proportions and typography,
redrawing Figure 1's diagrammatic grammar (boxed sublayers, stacked ×N repetition,
encoder/decoder columns) rather than tracing the paper's figure or copying The
Illustrated Transformer's illustrations. That still holds and is the thing being
marked.

Separately, the hero now reproduces **the paper's actual Figure 1** beside the
equation, as an orientation cue. Reproducing someone else's figure carries three
obligations, all met in `Hero.astro`: a credit line linking arXiv:1706.03762; alt
text describing the architecture rather than naming the file; and an honest
statement of the basis, since that paper is under arXiv's *perpetual
non-exclusive* licence --- **not** a Creative Commons grant --- so this is a
fair-dealing reproduction for study and review, not a licensed one. The caption
also points at chapter 10, so a reader can see which diagram is ours.

If a future week wants to drop the reproduction, drop it; do not quietly retitle
chapter 10's diagram to cover for it.

#### Layout and design

Chapters are React islands (`@astrojs/react`), one per chapter, `client:visible`.
`src/styles/viz.css` holds component CSS — a second stylesheet rather than Astro
scoped blocks, because stylelint only sees real `.css` files and React has no
scoped-style mechanism at all. `global.css` still owns every colour, size, radius
and duration literal; `viz.css` contains only `var()` references.

`.stylelintrc.json` now enforces BEM explicitly. `stylelint-config-standard`
rejects `__`, which never bit while all the CSS lived in `.astro` blocks it
couldn't see.

The four identity hues were chosen with a validator, not by eye, and two earlier
candidates were rejected on grounds no amount of looking would have surfaced (a
rose/teal query-key pair collapses under deuteranopia at ΔE 7.3). Hue carries
identity, fill carries magnitude, and the two are never conflated. See the header
comment in `global.css`.

Layout splits at **900px**. Below it the figure is `position: sticky` at the top
and the prose runs beneath; above it, two columns with the figure sticky at
`top: var(--space-6)`. **Any ancestor of a matrix needs `min-width: 0`** — a grid or
flex item's default minimum is its content size, so without it the 6×6 score grid
sized the figure column to 638px inside a 390px viewport and dragged the whole
document sideways. `overflow-x` on the matrix can only work once its ancestors are
allowed to be narrower than their contents.

Three rules about the chapter grid, each of which has already been broken once:

- **The chapter head sits above the grid, not inside the text column.** It is a
  sibling of `.chapter__body`, mirroring the hero, so the prose and the figure
  below it start on the same line. That arrangement broke before — the sticky
  figure painted its opaque card over the thesis — but the cause was
  `top: 50%; translate: 0 -50%`: sticky is clamped to its containing block, and a
  transform is applied afterwards and is not. With a plain `top`, a sticky element
  can never rise above its static position. The `no figure ever paints over prose`
  e2e spec covers `.chapter__head` and `.chapter__thesis` explicitly now, which it
  did not while they were nested.
- **`.chapter__prose` needs its desktop `gap: 44vh`.** Rewriting that rule and
  letting it inherit the base 72px puts beat tops 184px apart instead of ~590, the
  whole chapter collapses to about one screen, and two wheel clicks rip through
  every stage. It looks like a stage-machine bug and is not.
- **Assert alignment on the first `.beat`, not on `.chapter__prose`.** `padding-block`
  is inside the border box, so the container's top does not move when the padding
  changes. A test written against the container passed while the 216px regression
  it was meant to catch was live.

The scroll-driven stage machine (`useScrollStage`) arbitrates two inputs into one
piece of state, and every obvious approach was wrong.
`entry.boundingClientRect` was the third: those rects are sampled when the
intersection changed, not when the callback runs, and only changed entries are in
the batch — so arriving at a chapter by anchor latched whichever beat happened to
be crossing mid-jump, and no further change ever came to correct it. Chapter 2
opened on beat 2 at 1920 and beat 1 at 1440 from identical markup. The observer is
now only a signal that something moved; the decision measures every beat's live
rect against a line 45% down the viewport, on each trigger plus once on mount plus
on resize. Suppressing the observer
for 700ms after a click raced the smooth scroll and silently reverted the reader's
choice. Resuming on `scroll` meant a window resize — which fires one via reflow —
threw the reader's place away, which is the marking notes' own "resizes mid-use"
case. It now resumes on `wheel`, `touchmove` or a scrolling key, none of which a
reflow can produce.

`chapters.ts` holds prose as plain strings and there is no markdown step, so
notation must be written as the characters it should render as (`dₖ`, not `d_k`).
A spec test asserts no rendered prose contains a backtick or a `d_k`, because both
had already shipped.

## This file is yours

This CLAUDE.md is a starting point, not a fixed rulebook. As you learn what your
prototype needs --- a convention to hold the agent to, a sensor that keeps
catching you out, a fact about the stack the agent keeps getting wrong --- write
it down here. Growing this file is the work of harness engineering, and the gap
between this boilerplate and your own version is part of what your prototype
says about the developer you're becoming.
