import { useCallback, useEffect, useRef, useState } from "react";

// Scroll position selects which beat of a chapter is active; the sticky
// visualisation reads that and changes state.
//
// Deliberately an IntersectionObserver rather than a scroll-progress
// calculation. The question being asked is "which beat is the reader looking
// at", which is what IntersectionObserver answers directly — mapping a scroll
// fraction onto beat indices means re-deriving element positions on every frame
// and getting it wrong whenever a beat's height changes. Motion still drives the
// transitions between stages; it just isn't what decides the stage.
//
// The returned `setStage` is what the mobile stepper calls, so scroll and taps
// drive one state rather than two that can disagree.

export interface ScrollStage {
  stage: number;
  setStage: (next: number) => void;
  /** Attach to each beat element, in order. */
  registerBeat: (index: number) => (node: HTMLElement | null) => void;
  /** True once the reader has taken manual control, which suspends scroll
   * selection until they scroll again — otherwise tapping "next" on a phone
   * fights the observer and snaps back. */
  manual: boolean;
}

export function useScrollStage(count: number): ScrollStage {
  const [stage, setStageRaw] = useState(0);
  const [manual, setManual] = useState(false);
  const beats = useRef<(HTMLElement | null)[]>([]);
  const manualUntil = useRef(0);

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
      setManual(true);
      // Ignore observer callbacks briefly, so the smooth-scroll the stepper
      // triggers doesn't immediately re-select a different beat.
      manualUntil.current = Date.now() + 700;
      beats.current[clamped]?.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [count],
  );

  useEffect(() => {
    const nodes = beats.current.filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < manualUntil.current) return;
        // Pick the entry closest to the middle of the viewport rather than the
        // first intersecting one: with short beats several are visible at once,
        // and "first" makes the visualisation change one beat too early.
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
        if (best) {
          setStageRaw(best.index);
          setManual(false);
        }
      },
      // A band across the middle of the viewport is the "active" zone.
      { rootMargin: "-35% 0px -35% 0px", threshold: [0, 0.5, 1] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [count]);

  return { stage, setStage, registerBeat, manual };
}
