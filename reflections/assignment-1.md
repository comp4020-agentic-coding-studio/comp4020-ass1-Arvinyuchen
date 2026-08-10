# Assignment 1 reflection

**The breakthrough that moved the work forward** was deciding, before any component existed,
on the exact `data-*` vocabulary the interaction would use — `data-stage`, `data-stage-panel`,
`data-diagram-block`, `data-token`, `data-head` — and writing it into both `CLAUDE.md` and a
red spec test in the same sitting. Once that contract existed, the rest of the build stopped
being "build something interactive" and became "make these 27 assertions true", which is a
much smaller and more checkable problem. It also exposed a real limit early rather than late:
JSDOM parses the built HTML but never runs the `<script>` tag, so the spec test could only ever
prove the markup was wired correctly, not that a click actually did anything. Knowing that
going in meant manual Chrome verification wasn't an afterthought bolted on at the end — it was
budgeted for from the start, and it's where I actually found the real bugs (a whitespace
character silently eaten by Astro's HTML compiler, a window manager that wouldn't give Chrome
a true 1920px viewport). Every one of those was invisible to `pnpm check` and only showed up
because I made myself look at the rendered page instead of trusting green output.

**What this changed about the developer I want to be** is a sharper distrust of "the tests
pass" as a stopping point. A green suite told me the contract was met; it never told me the
page was actually good to look at, or that a number on screen was honest rather than invented.
The habit I want to keep is the one from this week: treat automated checks as a floor, and
still open the browser.
