import type { Mat } from "./linalg.js";

// Every weight in the worked example, written out as a literal.
//
// The previous version generated these from a seeded sine (`pseudoWeight`).
// That was reproducible, which is what it was for, but it produced entries like
// `-0.537` — so a reader could see the matrices on screen and still not be able
// to check a single product without a calculator. These are hand-authored from
// {-1, -0.5, 0, 0.5, 1} instead, which makes every term mental arithmetic and
// makes the zeros meaningful: a zero says "this head ignores that dimension".
//
// The embedding axes are authored to mean something (see DIM_LABELS):
//
//   dim 0 — det   determiner-ness
//   dim 1 — noun  noun-ness
//   dim 2 — act   action-ness
//   dim 3 — mod   modifier / size
//
// Note `the` at positions 0 and 3 shares one row here. That is the point, not an
// oversight: the embedding table is indexed by token, so identical tokens are
// identical vectors, and only positional encoding can tell them apart.

/** Token → embedding. Keyed by the token string, so the two `the`s resolve to
 * the same row by construction rather than by coincidence. */
export const EMBEDDINGS: Record<string, readonly number[]> = {
  the: [1.0, 0.0, 0.0, 0.0],
  cat: [0.0, 1.0, 0.0, 0.5],
  chased: [0.0, 0.0, 1.0, 0.0],
  small: [0.0, 0.0, 0.0, 1.0],
  mouse: [0.0, 1.0, 0.0, -0.5],
};

export interface HeadWeights {
  /** What this head is for, in one phrase. Shown on screen in chapter 7 and
   * asserted against the computed argmax pattern by the spec, so it cannot
   * drift into a decorative caption. */
  readonly label: string;
  readonly description: string;
  /** (D_MODEL × D_K) — right-multiplied, so `q = xᵢ · wq`. */
  readonly wq: Mat;
  readonly wk: Mat;
  readonly wv: Mat;
}

// Both heads read the same X and differ only in which dimensions they select.
// Written as selection matrices — mostly zeros with a single 1 per column — so
// the projection reads as "this head looks at these two dimensions" rather than
// as an opaque rotation.
//
// Order matters for the teaching sequence. Chapters 4–6 introduce attention
// before the idea of multiple heads exists, so they show HEADS[0] as simply "the"
// projections; chapter 7 then reveals it was one of two. HEADS[0] is therefore
// the head with the more legible linguistic story.
export const HEADS: readonly HeadWeights[] = [
  {
    label: "syntax",
    description: "matches verbs to their arguments and nouns to their modifiers",
    // q = [x·noun, x·act], k = [x·mod, x·noun].
    // So score = noun(i)·mod(j) + act(i)·noun(j): a noun scores modifiers, and
    // an action scores nouns. Two relations out of one bilinear form, which is
    // the smallest honest demonstration of what a single head can encode.
    //
    // What this actually produces (see the spec): `chased` attends to `mouse`
    // then `cat` — its object, then its subject — and `mouse` attends to
    // `small`. It also has `cat` attend to `small`, which is simply wrong: the
    // head has no notion of proximity, so it picks the strongest modifier
    // anywhere in the sentence rather than the one attached to it. That failure
    // is kept rather than tuned away, because it is what motivates chapter 7 —
    // the other head is the one that knows about position.
    wq: [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 0],
    ],
    wk: [
      [0, 0],
      [0, 1],
      [0, 0],
      [1, 0],
    ],
    // v = [x·det, x·mod]
    wv: [
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 1],
    ],
  },
  {
    label: "position",
    description: "matches tokens by where they sit, not by what they mean",
    // q = [x·det, x·noun], k = [x·det, x·noun + ½·x·mod].
    // Dimensions 0 and 1 carry the highest-frequency sine/cosine pair, so a dot
    // product between two of these is dominated by cos(posᵢ − posⱼ) — the
    // relative-position property the paper's choice of sinusoids buys. Every
    // query in this head lands within one position of itself, which the spec
    // asserts.
    //
    // The ½ on `mod` in wk is load-bearing, not decoration: without it wq and wk
    // are identical, QKᵀ comes out symmetric, and chapter 5 would be teaching a
    // special case that doesn't generalise.
    wq: [
      [1, 0],
      [0, 1],
      [0, 0],
      [0, 0],
    ],
    wk: [
      [1, 0],
      [0, 1],
      [0, 0],
      [0, 0.5],
    ],
    // v = [x·noun, x·act]
    wv: [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 0],
    ],
  },
];

/** (N_HEADS·D_V × D_MODEL) = (4 × 4). Mixes the concatenated head outputs back
 * into the residual stream's width. Not the identity — if it were, chapter 7's
 * `W_O` step would look like a no-op and the reader would reasonably conclude
 * the output projection is decorative. */
export const W_O: Mat = [
  [1, 0, 0.5, 0],
  [0, 1, 0, 0.5],
  [0.5, 0, 1, 0],
  [0, 0.5, 0, 1],
];

/** (D_MODEL × D_FF) = (4 × 8). First feed-forward layer. */
export const W_1: Mat = [
  [1, -1, 0, 0, 0.5, 0, -0.5, 0],
  [0, 0, 1, -1, 0, 0.5, 0, -0.5],
  [0.5, 0, -1, 0, 1, 0, 0, 0.5],
  [0, 0.5, 0, 1, 0, -1, 0.5, 0],
];

export const B_1: readonly number[] = [0, 0, -0.5, 0, 0, -0.5, 0, 0];

/** (D_FF × D_MODEL) = (8 × 4). Second feed-forward layer. */
export const W_2: Mat = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [0.5, 0, 0.5, 0],
  [0, 0.5, 0, 0.5],
  [-0.5, 0, 0, 0.5],
  [0, -0.5, 0.5, 0],
];

export const B_2: readonly number[] = [0, 0, 0, 0];
