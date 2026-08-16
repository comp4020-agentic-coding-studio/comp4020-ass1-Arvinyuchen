import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// Phase machine for the hero's `TokenAttentionInteraction`: a reader selects a
// token and watches it compare against all six, turn those comparisons into
// weights, then mix weighted value information back in.
//
// `setTimeout` chain plus a monotonically increasing `runId`, not
// `AbortController`: there's nothing asynchronous here, just fixed delays, and
// this is the same plain-state style `useStage` already uses. Re-selecting
// mid-animation bumps `runId` and clears every pending timer, so a stale run's
// callbacks can neither fire nor be mistaken for the current one — the two
// defences overlap on purpose, since either alone is enough to stop a stale
// `mix` from landing on top of a newer selection.

export type InteractionPhase = "idle" | "compare" | "weight" | "mix" | "settled";

/** Single source of truth for the timing table, so the doc's numbers and the
 * code's numbers can't drift apart. */
export const PHASE_DURATIONS = { compare: 800, weight: 700, mix: 900 } as const;

export interface TokenInteraction {
  phase: InteractionPhase;
  selectedPosition: number | null;
  /** True once any run has reached `settled` at least once — gates the §14
   * repeated-token copy switch from instruction to observation. */
  hasCompletedOnce: boolean;
  selectToken: (position: number) => void;
  replaySelectedToken: () => void;
}

export function useTokenInteraction(): TokenInteraction {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<InteractionPhase>("idle");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);

  const runId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const advancePhase = useCallback((id: number, next: InteractionPhase) => {
    if (id !== runId.current) return;
    setPhase(next);
    if (next === "settled") setHasCompletedOnce(true);
  }, []);

  const selectToken = useCallback(
    (position: number) => {
      clearTimers();
      runId.current += 1;
      const id = runId.current;
      setSelectedPosition(position);

      if (reducedMotion) {
        setPhase("settled");
        setHasCompletedOnce(true);
        return;
      }

      setPhase("compare");
      const toWeight = setTimeout(() => {
        advancePhase(id, "weight");
        const toMix = setTimeout(() => {
          advancePhase(id, "mix");
          const toSettled = setTimeout(() => {
            advancePhase(id, "settled");
          }, PHASE_DURATIONS.mix);
          timers.current.push(toSettled);
        }, PHASE_DURATIONS.weight);
        timers.current.push(toMix);
      }, PHASE_DURATIONS.compare);
      timers.current.push(toWeight);
    },
    [clearTimers, advancePhase, reducedMotion],
  );

  const replaySelectedToken = useCallback(() => {
    if (selectedPosition !== null) selectToken(selectedPosition);
  }, [selectedPosition, selectToken]);

  useEffect(() => clearTimers, [clearTimers]);

  return { phase, selectedPosition, hasCompletedOnce, selectToken, replaySelectedToken };
}
