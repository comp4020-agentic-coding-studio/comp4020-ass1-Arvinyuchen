import { useCallback, useState } from "react";

// Which beat of a chapter is active. One input, at every width: the stepper.
//
// This used to arbitrate two. Desktop had a prose rail of viewport-tall beats and
// an IntersectionObserver that measured every beat's live rect against a line 45%
// down the viewport; the phone had the stepper; and a `manual` latch decided which
// one won. The rail is gone — one layout at every width now — and everything that
// existed to serve it went with it: the observer, the live-rect measurement, the
// `manual` latch, the wheel/touchmove/keydown release that handed control back,
// the resize listener, and the `matchMedia("(max-width: 899px)")` guard that made
// this hook inert on a phone.
//
// One thing that deletion did NOT make obsolete, and it is the reason this comment
// is longer than the code: **the stepper does not scroll anything.** It changes the
// figure in place. The first version had it call `scrollIntoView` on the chosen
// beat and suppress the observer for 700ms, and the smooth scroll routinely
// outlasted the timer — the observer woke mid-flight, recalculated from a position
// that was still moving, and silently reverted the reader's choice. The e2e specs
// saw it as a stepper click that did nothing. There is no observer left to race,
// but a `scrollIntoView` here would still yank the page under a reader who only
// wanted the next step. Don't add one.

export interface StageState {
  stage: number;
  /** +1 when the last change moved forward through the chapter, -1 back.
   *
   * Derived from the stage delta, and it always was — never from scroll. A
   * stepper click has no scroll direction but has an unambiguous delta: clicking
   * the last dot means forward however the reader got there. `StageBlock` reads
   * this to decide which side an arriving block comes from and which side the
   * leaving one departs to. */
  direction: 1 | -1;
  setStage: (next: number) => void;
}

export function useStage(count: number): StageState {
  // Stage and direction are one piece of state, committed together, so they can
  // never describe different changes. That mattered when two inputs wrote to it,
  // and it still matters: `direction` has to be the delta of the change that
  // actually happened, not of the last one anybody recorded.
  const [{ stage, direction }, commit] = useState<{ stage: number; direction: 1 | -1 }>({
    stage: 0,
    direction: 1,
  });

  const setStage = useCallback(
    (next: number) => {
      // Clamped because the arrows call this with `stage ± 1`.
      const clamped = Math.min(count - 1, Math.max(0, next));
      commit((prev) =>
        prev.stage === clamped
          ? prev
          : { stage: clamped, direction: clamped > prev.stage ? 1 : -1 },
      );
    },
    [count],
  );

  return { stage, direction, setStage };
}
