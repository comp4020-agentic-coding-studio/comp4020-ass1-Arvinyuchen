import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// The page's signature.
//
// The paper's equation 1, set large, with each term as an addressable slot. The
// `qk` slot is not a label sitting above a diagram — the diagram is rendered
// *into* it, so when the 6 × 6 score grid appears it genuinely expands in place
// where the QKᵀ glyph was, and collapses back to the glyph afterwards. Motion's
// layout animation is what makes that one continuous transformation rather than
// a cut between two states.

export type Slot = "qk" | "scale" | "softmax" | "v";

export interface FormulaProps {
  /** Which term the current beat is about. Everything else recedes. */
  active?: Slot | null;
  /** Rendered inside the QKᵀ slot. When absent the slot shows the glyph. */
  qk?: ReactNode;
  /** The denominator, or null when the reader has switched scaling off — in which
   * case the fraction collapses to a bare numerator, which is exactly what the
   * maths does. A node rather than a string so it can carry a real radical. */
  divisor: ReactNode | null;
  /** Spoken reading of the divisor, for the equation's `sr-only` summary. */
  divisorLabel: string | null;
  /** Rendered after the closing bracket. */
  v?: ReactNode;
}

export function Formula({ active = null, qk, divisor, divisorLabel, v }: FormulaProps) {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : { duration: 0.52, ease: [0.2, 0.6, 0.2, 1] as const };

  const dim = (slot: Slot) => (active === null || active === slot ? "true" : "false");

  return (
    <motion.div className="formula" layout={!reduced} transition={transition}>
      <span className="formula__fn math" data-slot="softmax" data-lit={dim("softmax")}>
        softmax
      </span>
      <span className="formula__paren math" aria-hidden="true">
        (
      </span>

      <motion.span
        className="formula__fraction"
        data-slot="scale"
        data-lit={dim("scale")}
        layout={!reduced}
        transition={transition}
      >
        <motion.span
          className="formula__numerator"
          data-slot="qk"
          data-lit={dim("qk")}
          data-expanded={qk ? "true" : "false"}
          layout={!reduced}
          transition={transition}
        >
          {qk ?? (
            <span className="math formula__glyph">
              QK<sup>T</sup>
            </span>
          )}
        </motion.span>

        {divisor ? (
          <motion.span
            className="formula__denominator math"
            layout={!reduced}
            transition={transition}
          >
            {divisor}
          </motion.span>
        ) : null}
      </motion.span>

      <span className="formula__paren math" aria-hidden="true">
        )
      </span>
      <span className="formula__v math" data-slot="v" data-lit={dim("v")}>
        {v ?? "V"}
      </span>

      <span className="sr-only">
        softmax of Q times K transpose
        {divisorLabel ? `, divided by ${divisorLabel},` : ","} times V
      </span>
    </motion.div>
  );
}
