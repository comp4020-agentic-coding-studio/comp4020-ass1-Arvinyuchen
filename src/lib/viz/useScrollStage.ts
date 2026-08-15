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

    const observer = new IntersectionObserver(
      (entries) => {
        if (manualRef.current) return;
        // Pick the entry closest to the middle of the viewport rather than the
        // first intersecting one: with short beats several are visible at once,
        // and "first" changes the figure a beat too early.
        const middle = window.innerHeight / 2;
        let best: { index: number; distance: number } | undefined;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodes.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          const box = entry.boundingClientRect;
          const distance = Math.abs(box.top + box.height / 2 - middle);
          if (!best || distance < best.distance) best = { index, distance };
        }
        if (best) setStageRaw(best.index);
      },
      // A band across the middle of the viewport is the "active" zone.
      { rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.5, 1] },
    );

    for (const node of nodes) observer.observe(node);

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
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", onKey);
    };
  }, [count]);

  return { stage, setStage, registerBeat, manual };
}
