import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Enter and exit transitions for anything a beat brings into the figure.
//
// Before this, stage changes were hard cuts: a matrix, a working or a legend
// simply existed or didn't, and the figure's height jumped as things mounted. The
// scroll itself measured clean — 8.3ms frames at both device scale factors, no
// dropped frames — so the roughness was never frame rate, it was the absence of
// any transition at all. Every element that appears now rises and fades in, and
// the figure animates its own height so the prose beneath it doesn't jump.
//
// The movement is small and quick on purpose: this is a change of state in a
// diagram, not a page transition, and anything longer than about a third of a
// second starts to feel like waiting.

export interface RevealProps {
  children: ReactNode;
  /** Distinguishes what is being revealed, so swapping one block for another
   * animates as a replacement rather than a resize. */
  id?: string;
  /** Stagger, in multiples of a beat, for blocks that appear together. */
  order?: number;
}

export function Reveal({ children, id, order = 0 }: RevealProps) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={id ?? "reveal"}
        className="reveal"
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.28, ease: [0.2, 0.6, 0.2, 1], delay: order * 0.06 }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Wraps a whole figure so its height changes are animated rather than jumped.
 * Without this, mounting a 6-row table shoves everything below it down a few
 * hundred pixels in one frame. */
export function RevealFrame({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      layout={!reduced}
      transition={reduced ? { duration: 0 } : { duration: 0.32, ease: [0.2, 0.6, 0.2, 1] }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {children}
    </motion.div>
  );
}
