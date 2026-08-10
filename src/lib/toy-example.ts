// The one source of truth for every number this prototype shows. Everything
// here is a small, fixed, illustrative example — a 4-token sentence, 4-dim
// embeddings, 8 toy attention heads — not a trained model's weights. The
// point isn't realistic scale, it's that every value on screen is the real
// output of these functions, never a hardcoded string pretending to be one.
// See src/lib/toy-example.test.ts for the correctness checks these functions
// have to pass (softmax rows summing to 1, dimensions matching, etc).

export const TOKENS = ["the", "cat", "sat", "down"] as const;
export type Token = (typeof TOKENS)[number];

export const MODEL_DIM = 4;
export const HEAD_DIM = 2;
export const HEAD_COUNT = 8;
export const FFN_HIDDEN = 6;

const EMBEDDINGS: Record<Token, number[]> = {
  the: [0.1, -0.2, 0.3, 0.0],
  cat: [0.4, 0.1, -0.1, 0.2],
  sat: [-0.3, 0.2, 0.1, 0.4],
  down: [0.2, -0.1, -0.3, 0.1],
};

/** A fixed, reproducible "random-looking" number — not Math.random, so the
 * toy weights (and everything computed from them) are identical every run
 * and every environment, which is what makes them testable. */
function pseudoWeight(seed: number, i: number, j: number): number {
  return Math.round(Math.sin(seed * 12.9898 + i * 3.233 + j * 5.719 + 1) * 1000) / 1000;
}

function makeMatrix(rows: number, cols: number, seed: number): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(pseudoWeight(seed, i, j));
    }
    matrix.push(row);
  }
  return matrix;
}

function makeVector(length: number, seed: number): number[] {
  return Array.from({ length }, (_, i) => pseudoWeight(seed, i, 0) * 0.1);
}

interface HeadWeights {
  wq: number[][];
  wk: number[][];
  wv: number[][];
}

const HEAD_WEIGHTS: HeadWeights[] = Array.from({ length: HEAD_COUNT }, (_, head) => ({
  wq: makeMatrix(HEAD_DIM, MODEL_DIM, head * 3 + 1),
  wk: makeMatrix(HEAD_DIM, MODEL_DIM, head * 3 + 2),
  wv: makeMatrix(HEAD_DIM, MODEL_DIM, head * 3 + 3),
}));

const W1 = makeMatrix(FFN_HIDDEN, MODEL_DIM, 101);
const B1 = makeVector(FFN_HIDDEN, 102);
const W2 = makeMatrix(MODEL_DIM, FFN_HIDDEN, 103);
const B2 = makeVector(MODEL_DIM, 104);

function matVec(matrix: number[][], vec: number[]): number[] {
  return matrix.map((row) => row.reduce((sum, value, i) => sum + value * vec[i]!, 0));
}

function addVec(a: number[], b: number[]): number[] {
  return a.map((value, i) => value + b[i]!);
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i]!, 0);
}

export function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

/** The paper's fixed sinusoidal positional encoding: even dims get sine,
 * odd dims get cosine, both at a frequency that shrinks with dimension. */
export function positionalEncoding(pos: number, dim: number = MODEL_DIM): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dim; i++) {
    const exponent = (2 * Math.floor(i / 2)) / dim;
    const angle = pos / Math.pow(10000, exponent);
    vec.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
  }
  return vec;
}

export function embed(token: Token): number[] {
  return [...EMBEDDINGS[token]];
}

/** Embedding plus positional encoding for the token at this position in the
 * fixed toy sentence — the actual input every stage after "embedding" reads. */
export function inputVector(position: number): number[] {
  const token = TOKENS[position]!;
  return addVec(embed(token), positionalEncoding(position, MODEL_DIM));
}

export interface AttentionResult {
  weights: number[];
  output: number[];
}

/** Scaled dot-product attention for one query position, one head, over the
 * whole toy sentence — real Q·Kᵗ/√d softmaxed into weights that sum to 1. */
export function selfAttention(queryPosition: number, head: number): AttentionResult {
  const { wq, wk, wv } = HEAD_WEIGHTS[head]!;
  const inputs = TOKENS.map((_, position) => inputVector(position));
  const query = matVec(wq, inputs[queryPosition]!);
  const scale = Math.sqrt(HEAD_DIM);
  const scores = inputs.map((input) => dot(query, matVec(wk, input)) / scale);
  const weights = softmax(scores);
  const values = inputs.map((input) => matVec(wv, input));
  const output = values[0]!.map((_, d) =>
    weights.reduce((sum, weight, i) => sum + weight * values[i]![d]!, 0),
  );
  return { weights, output };
}

/** Position-wise feed-forward: two linear layers with a ReLU between them,
 * the same weights applied independently to every position. */
export function feedForward(x: number[]): number[] {
  const hidden = matVec(W1, x).map((value, i) => Math.max(0, value + B1[i]!));
  return matVec(W2, hidden).map((value, i) => value + B2[i]!);
}
