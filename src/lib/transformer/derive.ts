import { dot, type Vec } from "./linalg.js";

// This module is how the site keeps its central promise: that the working shown
// on screen is produced from the matrices shown on screen, rather than written
// out alongside them and hoped to match.
//
// A visualisation never formats its own arithmetic. It asks for the terms and
// renders them. So the only way for the displayed working to disagree with the
// displayed matrices is for `dotTerms(a, b).sum` to disagree with `dot(a, b)` —
// which is a one-line property test, and is asserted in
// `src/lib/transformer/transformer.test.ts`.

export interface DotTerm {
  /** Index into both operands, so the UI can highlight the source cells. */
  index: number;
  a: number;
  b: number;
  product: number;
}

export interface DotExpansion {
  terms: DotTerm[];
  /** Σ of `terms[].product`. Equals `dot(a, b)` by construction. */
  sum: number;
}

/** Every product in a dot product, in order, plus their total. */
export function dotTerms(a: Vec, b: Vec): DotExpansion {
  const terms = a.map((value, index) => ({
    index,
    a: value,
    b: b[index]!,
    product: value * b[index]!,
  }));
  return { terms, sum: terms.reduce((total, term) => total + term.product, 0) };
}

/** A dot product that is then divided — the shape of one attention score.
 * `divisor` is `√d_k`, or 1 when the reader switches scaling off. */
export interface ScaledDotExpansion extends DotExpansion {
  divisor: number;
  /** `sum / divisor`. The number that lands in the score cell. */
  scaled: number;
}

export function scaledDotTerms(a: Vec, b: Vec, divisor: number): ScaledDotExpansion {
  const expansion = dotTerms(a, b);
  return { ...expansion, divisor, scaled: expansion.sum / divisor };
}

export interface SoftmaxStep {
  index: number;
  score: number;
  /** `score − max`, the numerically-stable shift. Shown because the exponent on
   * screen has to be the exponent that was actually taken. */
  shifted: number;
  exp: number;
  weight: number;
}

export interface SoftmaxExpansion {
  max: number;
  steps: SoftmaxStep[];
  /** Σ of `steps[].exp` — the denominator. */
  total: number;
  /** Σ of `steps[].weight`. Displayed, and asserted to be 1. */
  weightSum: number;
}

/** Softmax broken into the steps a reader has to follow: shift, exponentiate,
 * total, divide. */
export function softmaxTerms(scores: Vec): SoftmaxExpansion {
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  const steps = scores.map((score, index) => ({
    index,
    score,
    shifted: score - max,
    exp: exps[index]!,
    weight: exps[index]! / total,
  }));
  return {
    max,
    steps,
    total,
    weightSum: steps.reduce((sum, step) => sum + step.weight, 0),
  };
}

export interface WeightedTerm {
  index: number;
  weight: number;
  value: number;
  product: number;
}

export interface AggregationExpansion {
  /** One entry per output dimension; each holds the per-token contributions. */
  dims: { dim: number; terms: WeightedTerm[]; sum: number }[];
}

/** `Σⱼ wⱼ · vⱼ`, expanded per output dimension. Chapter 6 stacks these terms to
 * build the output vector, so it needs each contribution separately rather than
 * just the total. */
export function aggregationTerms(weights: Vec, values: readonly Vec[]): AggregationExpansion {
  const width = values[0]?.length ?? 0;
  const dims = [];
  for (let dim = 0; dim < width; dim++) {
    const terms = weights.map((weight, index) => ({
      index,
      weight,
      value: values[index]![dim]!,
      product: weight * values[index]![dim]!,
    }));
    dims.push({
      dim,
      terms,
      sum: terms.reduce((total, term) => total + term.product, 0),
    });
  }
  return { dims };
}

/** Guard used by the property test: does the expanded working agree with the
 * primitive it claims to expand? Exported so the assertion reads as a statement
 * about the site's promise rather than about floating point. */
export function expansionAgrees(a: Vec, b: Vec, tolerance = 1e-12): boolean {
  return Math.abs(dotTerms(a, b).sum - dot(a, b)) <= tolerance;
}
