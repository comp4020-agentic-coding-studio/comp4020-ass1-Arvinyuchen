// Pure linear algebra. No model knowledge, no constants, no formatting — just
// the operations, so they can be tested in isolation and reused by every
// chapter.
//
// `matVec`, `addVec`, `dot` and `softmax` are carried over unchanged from the
// previous `toy-example.ts`, promoted from module-private to exported: the
// visualisations need them directly, and there is no reason for each chapter to
// grow its own copy.

export type Vec = readonly number[];
export type Mat = readonly Vec[];

/** Matrix × vector. `matrix` is row-major, so `matrix.length` is the output
 * dimension and each row's length is the input dimension. */
export function matVec(matrix: Mat, vec: Vec): number[] {
  return matrix.map((row) => row.reduce((sum, value, i) => sum + value * vec[i]!, 0));
}

export function addVec(a: Vec, b: Vec): number[] {
  return a.map((value, i) => value + b[i]!);
}

export function dot(a: Vec, b: Vec): number {
  return a.reduce((sum, value, i) => sum + value * b[i]!, 0);
}

export function scaleVec(vec: Vec, factor: number): number[] {
  return vec.map((value) => value * factor);
}

/** Row-major matrix product. `a` is (n × k), `b` is (k × m), result is (n × m).
 *
 * The old module only ever needed matrix × vector, so this is new. Chapters 4
 * and 5 need the real thing: `X · W` and `Q · Kᵀ` are matrix products, and
 * showing them as a loop of vector operations would hide the shape story the
 * chapters are about. */
export function matmul(a: Mat, b: Mat): number[][] {
  const inner = b.length;
  const cols = b[0]?.length ?? 0;
  return a.map((row) => {
    const out: number[] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) sum += row[k]! * b[k]![j]!;
      out.push(sum);
    }
    return out;
  });
}

export function transpose(matrix: Mat): number[][] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const out: number[][] = [];
  for (let j = 0; j < cols; j++) {
    const row: number[] = [];
    for (let i = 0; i < rows; i++) row.push(matrix[i]![j]!);
    out.push(row);
  }
  return out;
}

/** Softmax over one row, shifted by the row max for numerical stability. The
 * shift cancels exactly, so it changes nothing a reader can observe — but
 * chapter 6 shows the shifted values, so it has to be the same shift the
 * arithmetic actually uses. */
export function softmax(scores: Vec): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

export function relu(vec: Vec): number[] {
  return vec.map((value) => Math.max(0, value));
}

export interface LayerNormResult {
  /** The normalised row. */
  out: number[];
  /** Kept because chapter 8 displays them next to the row they describe. */
  mean: number;
  variance: number;
}

/** Layer normalisation with unit gain and zero bias, matching the paper's
 * `LayerNorm(x + Sublayer(x))`. `mean` and `variance` come back out because
 * chapter 8's whole point is that they are computed from the row on screen, not
 * asserted. Uses the population variance (divide by n), which is what the
 * original formulation does.
 *
 * `eps` exists only to stop a division by zero on a constant row. Production
 * implementations use 1e-5, sized against fp16 underflow; at that value the
 * output variance comes out as 1 − eps/variance, which for these rows is
 * 0.99995 — close enough to display as 1.00 but not close enough to assert as 1.
 * Nothing here runs in fp16, so the guard is made small enough that chapter 8's
 * "mean 0, variance 1" is true to the precision the spec checks. */
export function layerNorm(vec: Vec, eps = 1e-12): LayerNormResult {
  const n = vec.length;
  const mean = vec.reduce((sum, value) => sum + value, 0) / n;
  const variance = vec.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
  const denom = Math.sqrt(variance + eps);
  return { out: vec.map((value) => (value - mean) / denom), mean, variance };
}

/** Index of the largest entry. Chapter 7 uses this to state which token each
 * head attends to most, and the spec asserts that claim against the numbers. */
export function argmax(vec: Vec): number {
  let best = 0;
  for (let i = 1; i < vec.length; i++) if (vec[i]! > vec[best]!) best = i;
  return best;
}
