import { runForward } from "./forward.js";

// Data shaping for the hero's `TokenAttentionInteraction`. It reads the same
// memoized forward pass every chapter reads — `runForward().heads[0]`, the
// "syntax" head chapters 4–6 already treat as the default — rather than
// inventing a hero-only dataset. See `weights.ts` for why head 0 is the
// non-cherry-picked choice.

export interface AttentionRow {
  queryPosition: number;
  /** Unscaled Q·Kᵀ for this query against all six keys. */
  rawScores: readonly number[];
  /** Row-softmax of the scaled scores. Sums to 1. */
  weights: readonly number[];
}

/** One row per token position, straight from the real forward pass. */
export function getAttentionRows(): AttentionRow[] {
  const head = runForward().heads[0]!;
  return head.rawScores.map((rawScores, queryPosition) => ({
    queryPosition,
    rawScores,
    weights: head.weights[queryPosition]!,
  }));
}

/** Largest-remainder rounding: floor every weight×100, then hand the leftover
 * points to the entries with the biggest fractional part, so the displayed
 * percentages always sum to exactly 100 even though naive rounding wouldn't. */
export function toDisplayPercents(weights: readonly number[]): number[] {
  const raw = weights.map((weight) => weight * 100);
  const floors = raw.map((value) => Math.floor(value));
  const distributed = floors.reduce((total, value) => total + value, 0);
  const remainder = 100 - distributed;

  const order = floors
    .map((floor, index) => ({ index, fraction: raw[index]! - floor, weight: weights[index]! }))
    .sort((a, b) => b.fraction - a.fraction || b.weight - a.weight || a.index - b.index);

  const result = [...floors];
  for (let i = 0; i < remainder; i++) {
    result[order[i]!.index]++;
  }
  return result;
}

/** Guards the invariant the whole interaction depends on: a real probability
 * distribution over the six tokens. Thrown, not returned, because a violation
 * here means the forward pass itself is broken, not something the UI should
 * degrade gracefully around. */
export function assertValidAttentionRow(row: AttentionRow, tolerance = 1e-9): void {
  for (const weight of row.weights) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`attention weight out of range: ${weight}`);
    }
  }
  const sum = row.weights.reduce((total, weight) => total + weight, 0);
  if (Math.abs(sum - 1) > tolerance) {
    throw new Error(`attention weights for position ${row.queryPosition} sum to ${sum}, not 1`);
  }
}
