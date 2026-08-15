import { D_MODEL, N_HEADS, SCALE, SEQ_LEN, TOKENS } from "./constants.js";
import {
  addVec,
  argmax,
  layerNorm,
  matmul,
  relu,
  softmax,
  transpose,
  type LayerNormResult,
  type Mat,
} from "./linalg.js";
import { positionalMatrix } from "./positional.js";
import { B_1, B_2, EMBEDDINGS, HEADS, W_1, W_2, W_O } from "./weights.js";

// One forward pass, with every intermediate kept.
//
// The visualisations do not compute anything. They read fields off this record,
// which means a number can't appear in two chapters with two different values,
// and "the numbers are real" is structural rather than a promise in a caption.

export interface HeadPass {
  index: number;
  label: string;
  description: string;
  /** (SEQ_LEN × D_K) */
  q: number[][];
  k: number[][];
  /** (SEQ_LEN × D_V) */
  v: number[][];
  /** `Q · Kᵀ`, before scaling. (SEQ_LEN × SEQ_LEN) */
  rawScores: number[][];
  /** `Q · Kᵀ / √d_k`. (SEQ_LEN × SEQ_LEN) */
  scores: number[][];
  /** Row-wise softmax of `scores`. Every row sums to 1. */
  weights: number[][];
  /** `weights · V`. (SEQ_LEN × D_V) */
  out: number[][];
  /** `scores` with everything above the diagonal set to −∞. Chapter 9. */
  maskedScores: number[][];
  /** Row-wise softmax of `maskedScores`. Row `i` is exactly 0 past column `i`. */
  maskedWeights: number[][];
  maskedOut: number[][];
  /** For each query row, the index of the token it attends to most. Chapter 7
   * displays a claim about what this head does; the spec checks that claim
   * against this array. */
  argmaxPerRow: number[];
}

export interface ForwardPass {
  tokens: readonly string[];
  /** (SEQ_LEN × D_MODEL) — the embedding table, looked up per position. Rows 0
   * and 3 are the same array contents, by construction. */
  e: number[][];
  /** (SEQ_LEN × D_MODEL) — the paper's sinusoids, computed. */
  pe: number[][];
  /** `E + PE`. The input to the first layer. */
  x: number[][];
  heads: HeadPass[];
  /** Heads' outputs concatenated: (SEQ_LEN × N_HEADS·D_V) = (6 × 4). */
  concat: number[][];
  /** `concat · W_O`. (SEQ_LEN × D_MODEL) */
  attnOut: number[][];
  /** `X + attnOut` — the first residual connection. */
  residual1: number[][];
  norm1: LayerNormResult[];
  /** `relu(norm1 · W_1 + b_1)`. (SEQ_LEN × D_FF) */
  ffnHidden: number[][];
  /** Pre-ReLU, so chapter 8 can show which entries got clipped and to what. */
  ffnPreRelu: number[][];
  /** `ffnHidden · W_2 + b_2`. (SEQ_LEN × D_MODEL) */
  ffnOut: number[][];
  /** `norm1 + ffnOut` — the second residual connection. */
  residual2: number[][];
  norm2: LayerNormResult[];
}

function addBias(rows: number[][], bias: readonly number[]): number[][] {
  return rows.map((row) => addVec(row, bias));
}

/** Upper triangle → −∞, so softmax sends it to exactly 0. Using `-Infinity`
 * rather than a large negative number matters: chapter 9 asserts the masked
 * weights are *exactly* zero, and `Math.exp(-1e9)` is only approximately zero. */
function causalMask(scores: number[][]): number[][] {
  return scores.map((row, i) => row.map((value, j) => (j > i ? -Infinity : value)));
}

function runHead(index: number, x: number[][]): HeadPass {
  const head = HEADS[index]!;
  const q = matmul(x, head.wq);
  const k = matmul(x, head.wk);
  const v = matmul(x, head.wv);

  const rawScores = matmul(q, transpose(k));
  const scores = rawScores.map((row) => row.map((value) => value / SCALE));
  const weights = scores.map((row) => softmax(row));
  const out = matmul(weights, v);

  const maskedScores = causalMask(scores);
  const maskedWeights = maskedScores.map((row) => softmax(row));
  const maskedOut = matmul(maskedWeights, v);

  return {
    index,
    label: head.label,
    description: head.description,
    q,
    k,
    v,
    rawScores,
    scores,
    weights,
    out,
    maskedScores,
    maskedWeights,
    maskedOut,
    argmaxPerRow: weights.map((row) => argmax(row)),
  };
}

function compute(): ForwardPass {
  const e = TOKENS.map((token) => [...EMBEDDINGS[token]!]);
  const pe = positionalMatrix();
  const x = e.map((row, i) => addVec(row, pe[i]!));

  const heads = Array.from({ length: N_HEADS }, (_, i) => runHead(i, x));

  // Concatenate along the feature axis: head 0's D_V columns, then head 1's.
  const concat = Array.from({ length: SEQ_LEN }, (_, i) =>
    heads.flatMap((head) => head.out[i]!),
  );

  const attnOut = matmul(concat, W_O);
  const residual1 = x.map((row, i) => addVec(row, attnOut[i]!));
  const norm1 = residual1.map((row) => layerNorm(row));

  const normed1 = norm1.map((result) => result.out);
  const ffnPreRelu = addBias(matmul(normed1, W_1), B_1);
  const ffnHidden = ffnPreRelu.map((row) => relu(row));
  const ffnOut = addBias(matmul(ffnHidden, W_2), B_2);

  const residual2 = normed1.map((row, i) => addVec(row, ffnOut[i]!));
  const norm2 = residual2.map((row) => layerNorm(row));

  return {
    tokens: TOKENS,
    e,
    pe,
    x,
    heads,
    concat,
    attnOut,
    residual1,
    norm1,
    ffnHidden,
    ffnPreRelu,
    ffnOut,
    residual2,
    norm2,
  };
}

let cached: ForwardPass | undefined;

/** The whole pass. Memoised — it runs once per module instance, at build time in
 * Astro frontmatter and once more in the browser for the hydrated islands. */
export function runForward(): ForwardPass {
  cached ??= compute();
  return cached;
}

/** Attention scores recomputed with scaling switched off, for chapter 5's
 * toggle. Kept as a separate accessor rather than a fourth field on `HeadPass`
 * so the default path can't accidentally read the unscaled numbers. */
export function unscaledScores(headIndex: number): number[][] {
  return runForward().heads[headIndex]!.rawScores;
}

/** Convenience for the chapters that only ever look at one head. */
export function head(index: number): HeadPass {
  return runForward().heads[index]!;
}

export interface LayerOptions {
  /** Add the sublayer's input to its output, as the paper does. */
  residual: boolean;
  /** Normalise each row after the addition. */
  norm: boolean;
}

export interface LayerVariant {
  /** Attention's contribution, with or without the input added back. */
  afterAttention: number[][];
  norm1: LayerNormResult[] | null;
  /** What actually feeds the feed-forward network. */
  stream1: number[][];
  ffnPreRelu: number[][];
  ffnHidden: number[][];
  ffnOut: number[][];
  afterFfn: number[][];
  norm2: LayerNormResult[] | null;
  out: number[][];
}

/** The same layer with the residual connection or the normalisation switched
 * off, so chapter 8 can ablate them.
 *
 * Deliberately here rather than inside the chapter component: an ablation
 * computed in the UI would be a second implementation of the layer, free to
 * disagree with the real one, and the whole point of the chapter is that turning
 * a piece off changes numbers the reader has already seen. Not memoised — it
 * takes arguments, and it runs in microseconds. */
export function runLayerVariant({ residual, norm }: LayerOptions): LayerVariant {
  const pass = runForward();
  const { x, attnOut } = pass;

  const afterAttention = residual ? x.map((row, i) => addVec(row, attnOut[i]!)) : attnOut;
  const norm1 = norm ? afterAttention.map((row) => layerNorm(row)) : null;
  const stream1 = norm1 ? norm1.map((r) => r.out) : afterAttention;

  const ffnPreRelu = addBias(matmul(stream1, W_1), B_1);
  const ffnHidden = ffnPreRelu.map((row) => relu(row));
  const ffnOut = addBias(matmul(ffnHidden, W_2), B_2);

  const afterFfn = residual ? stream1.map((row, i) => addVec(row, ffnOut[i]!)) : ffnOut;
  const norm2 = norm ? afterFfn.map((row) => layerNorm(row)) : null;
  const out = norm2 ? norm2.map((r) => r.out) : afterFfn;

  return {
    afterAttention,
    norm1,
    stream1,
    ffnPreRelu,
    ffnHidden,
    ffnOut,
    afterFfn,
    norm2,
    out,
  };
}

/** Shape of each named tensor, derived from the constants rather than written
 * out — chapter 10 labels every block in the architecture diagram with these,
 * and a hardcoded "6×4" would be a claim nothing checks. */
export const SHAPES = {
  embedding: [SEQ_LEN, D_MODEL],
  positional: [SEQ_LEN, D_MODEL],
  input: [SEQ_LEN, D_MODEL],
  perHeadQkv: [SEQ_LEN, HEADS[0]!.wq[0]!.length],
  scores: [SEQ_LEN, SEQ_LEN],
  concat: [SEQ_LEN, N_HEADS * HEADS[0]!.wv[0]!.length],
  output: [SEQ_LEN, D_MODEL],
} as const satisfies Record<string, readonly [number, number]>;

/** Re-exported so components can render a matrix without importing the weights
 * module directly — they display these, they never re-derive them. */
export const DISPLAY_WEIGHTS = { W_O, W_1, W_2, B_1, B_2 } satisfies Record<
  string,
  Mat | readonly number[]
>;
