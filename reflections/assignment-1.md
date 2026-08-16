# Assignment 1 — reflection

**The breakthrough that moved the work forward** was reading my own CLAUDE.md
back and treating a sentence in it as a bug report. It said, honestly, that JSDOM
never executes scripts, so the spec could only check markup and real interaction
was "verified by hand in Chrome at both marking viewports". I had written that as
a caveat. This week I read it as a missing sensor and built it. Within minutes of
the first green Playwright run it had found three defects I could not have found
by looking: a stepper that silently undid its own clicks because a timer was
racing a smooth scroll, a chapter that threw away the reader's place whenever the
window was resized, and a table that dragged the page sideways on a phone. The
middle one is precisely the "resizes mid-use" case the marking notes describe. I
had used that page by hand a dozen times and never once resized it.

**What this changed about the developer I want to be** is that I distrust green,
and I have stopped defending work because I built it. Writing a check now
includes breaking the thing it watches to confirm it notices: on one sweep of
twelve deliberate mutations, six tests stayed green — four were weak tests, two
were live bugs I would otherwise have shipped. The harder version came at the
end. I had built a two-column scrollytelling layout with a scroll observer, a
latch, and three fixed races. Beside the phone's one paragraph and a stepper, it
taught nothing extra, so I deleted it and two features I had shipped the day
before. The history says so rather than tidying it away. I would rather show a
design being tested and losing than only ever show the answer.
