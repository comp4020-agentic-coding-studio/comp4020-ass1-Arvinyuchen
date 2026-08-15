import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import {
  CLOSE_V_TEX,
  QK_TEX,
  SOFTMAX_OPEN_TEX,
  SQRT_DK_TEX,
} from "../../../lib/transformer/notation.js";
import { tex } from "../../../lib/viz/tex.js";

// The page's signature: the equation is the diagram.
//
// The `qk` slot is not a label sitting above a figure — the figure is rendered
// *into* it, so when the 6 × 6 score grid appears it expands in place where the QKᵀ
// glyph was, and collapses back. Motion's layout animation is what makes that one
// continuous transformation rather than a cut.
//
// This is also the one place on the page where the equation is *composed* from
// KaTeX fragments instead of rendered whole from a single TeX string, and the reason
// is that requirement: KaTeX turns a string into markup and cannot host foreign DOM
// inside a `\frac`, so a live React grid can never live inside one. The parts that
// are purely typographic — `softmax(`, the denominator, `)V`, and the collapsed QKᵀ
// glyph — therefore come from KaTeX, and only the fraction bar and the numerator
// slot are assembled here. Every glyph still comes out of the same faces with the
// same metrics as the hero, which the previous hand-built version could not promise.
//
// Rendered once at module scope: these fragments are constants, so re-parsing them
// on every state change would be waste.

const SOFTMAX_OPEN_HTML = tex(SOFTMAX_OPEN_TEX);
const CLOSE_V_HTML = tex(CLOSE_V_TEX);
const SQRT_DK_HTML = tex(SQRT_DK_TEX);
const QK_HTML = tex(QK_TEX);

export type Slot = "qk" | "scale" | "softmax" | "v";

export interface FormulaProps {
  /** Which term the current beat is about. Everything else recedes. */
  active?: Slot | null;
  /** Rendered inside the QKᵀ slot. When absent the slot shows the glyph. */
  qk?: ReactNode;
  /** False when the reader has switched scaling off, in which case the fraction
   * collapses to a bare numerator — which is exactly what the maths does. */
  scaled: boolean;
  /** Rendered after the closing bracket. */
  v?: ReactNode;
}

export function Formula({ active = null, qk, scaled, v }: FormulaProps) {
  const reduced = useReducedMotion();
  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.52, ease: [0.2, 0.6, 0.2, 1] as const };

  const dim = (slot: Slot) => (active === null || active === slot ? "true" : "false");

  return (
    <motion.div className="formula" layout={!reduced} transition={transition}>
      <span
        className="formula__fn"
        data-slot="softmax"
        data-lit={dim("softmax")}
        dangerouslySetInnerHTML={{ __html: SOFTMAX_OPEN_HTML }}
      />

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
            <span className="formula__glyph" dangerouslySetInnerHTML={{ __html: QK_HTML }} />
          )}
        </motion.span>

        {scaled ? (
          <motion.span
            className="formula__denominator"
            layout={!reduced}
            transition={transition}
            dangerouslySetInnerHTML={{ __html: SQRT_DK_HTML }}
          />
        ) : null}
      </motion.span>

      <span
        className="formula__v"
        data-slot="v"
        data-lit={dim("v")}
        dangerouslySetInnerHTML={{ __html: CLOSE_V_HTML }}
      />
      {v}
    </motion.div>
  );
}
