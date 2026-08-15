// The shape of the worked example, fixed once and read by every chapter.
//
// Why these numbers: a student has to be able to check the arithmetic by hand,
// which rules out realistic dimensions. But `d_model = 2` would break chapter 7
// — with two heads you'd get `d_k = 1`, and a "dot product" of two 1-vectors is
// just multiplication, so scaled dot-product attention would stop being the
// thing being taught. `d_model = 4` with two 2-dimensional heads is the smallest
// shape where multi-head attention is honest: every q/k/v vector the reader
// verifies is 2-D, `√d_k = √2` is a real scale factor, and 2 heads × 2 dims
// genuinely reconstitutes the 4-wide residual stream.

/** The sentence, as tokens. Position matters, so this is an array and not a set:
 * `the` appears at positions 0 and 3 with a byte-identical embedding, which is
 * the whole reason chapter 3 has something to show. */
export const TOKENS = ["the", "cat", "chased", "the", "small", "mouse"] as const;

export type Token = (typeof TOKENS)[number];

/** Sequence length — 6. Named so the code reads like the paper. */
export const SEQ_LEN = TOKENS.length;

export const D_MODEL = 4;
export const N_HEADS = 2;
export const D_K = 2;
export const D_V = 2;
export const D_FF = 8;

/** The paper stacks 6 identical layers in both the encoder and the decoder. We
 * show one layer's internals and refer to this for the stack, rather than
 * unrolling six copies of the same arithmetic. */
export const N_LAYERS = 6;

/** `√d_k`, the denominator in the paper's equation 1. Kept as a named constant
 * because chapter 5 lets the reader switch it off, and both the code path and
 * the on-screen label have to agree about what "off" means (divide by 1). */
export const SCALE = Math.sqrt(D_K);

/** The four embedding dimensions were authored to mean something, so the
 * matrices are readable rather than a wall of noise. These labels are shown in
 * the UI as column headers. */
export const DIM_LABELS = ["det", "noun", "act", "mod"] as const;
