# Assignment 1 — reflection

**The breakthrough that moved the work forward** was reading my own CLAUDE.md
back and treating a sentence in it as a bug report. It said, honestly, that JSDOM
never executes scripts, so the spec could only check markup and real interaction
was "verified by hand in Chrome at both marking viewports". I had written that as
a caveat. This week I read it as a missing sensor and went and built it. Getting
Playwright running took a detour — `astro preview` daemonises when it has no TTY,
so Playwright insisted the server had exited while it was serving happily — but
within minutes of the first green run it had found three defects I could not have
found by looking: a stepper that silently undid its own clicks because a timer was
racing a smooth scroll, a chapter that threw away the reader's place whenever the
window was resized, and a table that dragged the whole page sideways on a phone.
The middle one is precisely the "resizes mid-use" case the marking notes describe.
I had used that page by hand a dozen times and never once resized it.

**What this changed about the developer I want to be** is that I now reach for the
instrument before the inspection, and I distrust green. Two of this week's worst
moments were things that passed: a spec whose selectors were unscoped, so once
there were eleven chapters its assertions matched 46 elements and succeeded for
entirely the wrong reason, and a links check that printed reassuring output while
validating almost nothing until I broke an anchor to see whether it would notice.
Confirming a check can fail is now part of writing it.
