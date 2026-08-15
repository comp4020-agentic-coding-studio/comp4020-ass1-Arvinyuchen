import type { ScaledDotExpansion } from "../../../lib/transformer/derive.js";
import { fmt } from "../../../lib/transformer/format.js";

// The working under a cell.
//
// It renders `derive.ts` output and nothing else — it is not given a preformatted
// string and it does no arithmetic of its own. That is the mechanism behind the
// site's central claim: the only way for this working to disagree with the matrix
// above it is for `dotTerms(a,b).sum` to disagree with `dot(a,b)`, which the unit
// suite asserts for all 36 pairs in both heads.

export interface TermExpansionProps {
  expansion: ScaledDotExpansion;
  /** Labels for the two operands, e.g. `q₂` and `k₅`. */
  aLabel: string;
  bLabel: string;
  /** Shown next to the divisor. `√2` reads better than `1.41`, and the reader
   * needs to connect it to d_k. */
  divisorLabel: string;
  /** False when the reader has switched scaling off, so the division disappears
   * from the working rather than showing a divide-by-one. */
  scaled: boolean;
}

export function TermExpansion({
  expansion,
  aLabel,
  bLabel,
  divisorLabel,
  scaled,
}: TermExpansionProps) {
  return (
    <div className="working" data-term-expansion>
      <p className="working__head">
        <span className="math">{aLabel}</span>
        <span aria-hidden="true"> · </span>
        <span className="math">{bLabel}</span>
        <span className="sr-only"> dot </span>
      </p>

      <p className="working__line num">
        {expansion.terms.map((term, i) => (
          <span key={term.index} className="working__term" data-term={term.index}>
            {i > 0 ? <span className="working__op"> + </span> : null}
            <span className="working__operand" data-operand="a">
              {fmt(term.a)}
            </span>
            <span className="working__op" aria-hidden="true">
              ×
            </span>
            <span className="working__operand" data-operand="b">
              {fmt(term.b)}
            </span>
          </span>
        ))}
      </p>

      <p className="working__line num">
        {expansion.terms.map((term, i) => (
          <span key={term.index} className="working__term">
            {i > 0 ? <span className="working__op"> + </span> : null}
            <span data-product={term.index}>{fmt(term.product)}</span>
          </span>
        ))}
        <span className="working__op" aria-hidden="true">
          {" = "}
        </span>
        <strong data-dot-sum>{fmt(expansion.sum)}</strong>
      </p>

      {scaled ? (
        <p className="working__line num" data-scaling-line>
          <span className="working__op" aria-hidden="true">
            ÷{" "}
          </span>
          <span className="math working__divisor">{divisorLabel}</span>
          <span className="working__op" aria-hidden="true">
            {" = "}
          </span>
          <strong data-scaled-value>{fmt(expansion.scaled)}</strong>
        </p>
      ) : (
        <p className="working__line working__note">
          Scaling is off, so this raw dot product is the score.
        </p>
      )}
    </div>
  );
}
