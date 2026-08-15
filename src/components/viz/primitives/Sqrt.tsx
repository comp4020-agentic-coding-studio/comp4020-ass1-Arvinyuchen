// A square root with a real, joined vinculum — via MathML.
//
// Two wrong answers came first. `&#8730;d&#8342;` is a bare U+221A: the hook only,
// no bar, no stretching, so at display size it reads as a tick mark beside a `d`.
// Replacing it with `text-decoration: overline` on the radicand got a bar but not a
// radical — the bar broke into one segment per inline box, so `d` and `k` each got
// their own stub, and nothing joined it to the hook.
//
// `<msqrt>` is the element for this. The browser stretches the hook to the
// radicand's height and joins the bar to it, which is exactly the thing CSS cannot
// express. MathML Core ships in Chrome, Safari and Firefox, and screen readers
// announce it as mathematics rather than as punctuation, so the `sr-only` gloss the
// CSS version needed is gone too.
//
// The JSX types for these elements live in src/types/mathml.d.ts — React ships
// HTML and SVG types but not MathML.

import type { ReactNode } from "react";

export interface SqrtProps {
  /** MathML content for the radicand, e.g. an `<msub>`. */
  children: ReactNode;
}

export function Sqrt({ children }: SqrtProps) {
  return (
    <math className="sqrt" display="inline">
      <msqrt>{children}</msqrt>
    </math>
  );
}

/** `√dₖ`, the denominator in equation 1 — the one radical this site draws
 * repeatedly. */
export function SqrtDk() {
  return (
    <Sqrt>
      <msub>
        <mi>d</mi>
        <mi>k</mi>
      </msub>
    </Sqrt>
  );
}
