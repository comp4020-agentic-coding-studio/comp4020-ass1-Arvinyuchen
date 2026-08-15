import { useCallback, useEffect, useRef, useState } from "react";

// Scroll position selects which beat of a chapter is active; the sticky
// visualisation reads that and changes state.
//
// Deliberately an IntersectionObserver rather than a scroll-progress
// calculation. The question being asked is "which beat is the reader looking
// at", which is what IntersectionObserver answers directly — mapping a scroll
// fraction onto beat indices means re-deriving element positions every frame and
// getting it wrong whenever a beat's height changes. Motion still drives the
// transitions between stages; it just isn't what decides the stage.
//
// Two inputs drive one piece of state, so they have to be arbitrated. The first
// attempt had the stepper scroll the chosen beat into view and suppress the
// observer for 700ms. That was a race: the smooth scroll often outlasted the
// timer, the observer woke up mid-flight, recalculated from a scroll position
// that was still moving, and silently reverted the reader's choice. The e2e specs
// caught it as a stepper click that appeared to do nothing.
//
// So the stepper no longer scrolls at all. It sets the stage, and the observer is
// suspended until the reader actually scrolls again — an event, not a deadline.
// Clicking a step now changes the figure in place, which is also the better
// behaviour on a phone.

export interface ScrollStage {
  stage: number;
  setStage: (next: number) => void;
  /** Attach to each beat element, in order. */
  registerBeat: (index: number) => (node: HTMLElement | null) => void;
  /** True while the reader's explicit choice is overriding scroll position. */
  manual: boolean;
}

export function useScrollStage(count: number): ScrollStage {
  const [stage, setStageRaw] = useState(0);
  const [manual, setManual] = useState(false);
  const beats = useRef<(HTMLElement | null)[]>([]);
  const manualRef = useRef(false);

  const registerBeat = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      beats.current[index] = node;
    },
    [],
  );

  const setStage = useCallback(
    (next: number) => {
      const clamped = Math.min(count - 1, Math.max(0, next));
      setStageRaw(clamped);
      manualRef.current = true;
      setManual(true);
    },
    [count],
  );

  useEffect(() => {
    const nodes = beats.current.filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    // The active beat is the last one whose top has crossed a line partway down
    // the viewport. Measured fresh from the live rects every time, and the
    // observer is only a signal that something moved.
    //
    // Reading `entry.boundingClientRect` off the callback's own entries was the
    // bug. Those rects are sampled when the intersection changed, not when the
    // callback runs, and only the entries that changed are in the batch — so
    // arriving at a chapter by anchor let it latch whichever beat happened to be
    // crossing mid-jump, and then no further intersection change ever came to
    // correct it. Chapter 2 opened on beat 2 at 1920 while opening on beat 1 at
    // 1440, from the same markup.
    const LINE = 0.45;

    const recompute = () => {
      if (manualRef.current) return;
      const line = window.innerHeight * LINE;
      let next = 0;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i]!.getBoundingClientRect().top <= line) next = i;
      }
      setStageRaw(next);
    };

    const observer = new IntersectionObserver(recompute, {
      // Generous band: this only needs to fire often enough, since the decision is
      // made by measuring rather than from the entries themselves.
      rootMargin: "0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    for (const node of nodes) observer.observe(node);

    // Once on mount, so a chapter reached by anchor or reload is correct before any
    // intersection changes.
    recompute();

    // A resize moves the line and every beat with it.
    window.addEventListener("resize", recompute);

    // Deliberate reader input hands control back to the observer.
    //
    // Listening for `scroll` was wrong: resizing the window fires one, because
    // the document reflows and the scroll offset clamps. So resizing the browser
    // silently threw away whichever step the reader had chosen — which is
    // precisely the "resize mid-use" case the marking notes call out, and an e2e
    // spec caught it. `wheel`, `touchmove` and the scrolling keys cannot be
    // produced by a reflow, so they mean the reader actually moved.
    const release = () => {
      if (!manualRef.current) return;
      manualRef.current = false;
      setManual(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)
      ) {
        release();
      }
    };

    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", onKey);
    };
  }, [count]);

  return { stage, setStage, registerBeat, manual };
}
