// MathML element types for JSX.
//
// React 19 ships types for HTML and SVG but not MathML, so `<math>`, `<msqrt>`
// and friends are unknown intrinsic elements and `astro check` rejects them.
// Astro renders whatever the JSX describes, so this is purely a typing gap.
//
// Only the elements actually used are declared, rather than the whole of MathML
// Core: an unused declaration is a claim nothing checks, and if a future chapter
// needs `<mfrac>` or `<mrow>` it should be added here deliberately.

import type { HTMLAttributes } from "react";

interface MathElementAttributes<T> extends HTMLAttributes<T> {
  /** `"block"` for a displayed equation, `"inline"` for one set in running text. */
  display?: "block" | "inline";
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathElementAttributes<HTMLElement>;
      msqrt: HTMLAttributes<HTMLElement>;
      msub: HTMLAttributes<HTMLElement>;
      mi: HTMLAttributes<HTMLElement>;
    }
  }
}
