import { D_MODEL, SEQ_LEN } from "./constants.js";

// The paper's fixed sinusoidal positional encoding, equation unchanged:
//
//   PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
//   PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))
//
// Carried over from the previous `toy-example.ts` implementation. Computed, never
// tabulated — chapter 3 claims these are the paper's values, and the only honest
// way to back that claim is to evaluate the formula.

/** The wavelength divisor for dimension pair `i`: `10000^(2i / d_model)`.
 * Exported because chapter 3 draws one sine curve per pair and labels it with
 * its actual frequency. At `d_model = 4` there are two pairs, giving divisors
 * `1` and `100`. */
export function frequencyDivisor(pair: number, dim: number = D_MODEL): number {
  return Math.pow(10000, (2 * pair) / dim);
}

/** Number of sine/cosine pairs at this width — 2 when `d_model` is 4. */
export function pairCount(dim: number = D_MODEL): number {
  return Math.ceil(dim / 2);
}

export function positionalEncoding(pos: number, dim: number = D_MODEL): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dim; i++) {
    const angle = pos / frequencyDivisor(Math.floor(i / 2), dim);
    vec.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
  }
  return vec;
}

/** The whole PE matrix for the example sentence — (SEQ_LEN × D_MODEL). */
export function positionalMatrix(): number[][] {
  return Array.from({ length: SEQ_LEN }, (_, pos) => positionalEncoding(pos));
}
