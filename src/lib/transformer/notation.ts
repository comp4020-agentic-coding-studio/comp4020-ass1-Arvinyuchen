// The equation, as TeX, written once.
//
// Rendered by KaTeX at build time — see `src/lib/viz/tex.ts`. Kept here rather
// than inline at each call site so the hero and chapter 5 cannot drift into
// showing subtly different equations, which is exactly what happened when both
// were hand-assembled from CSS flex boxes.

/** Equation 1 of the paper. */
export const ATTENTION_TEX = String.raw`\operatorname{softmax}\!\left(\frac{QK^{T}}{\sqrt{d_k}}\right)V`;

/** The scaling denominator on its own, for chapter 5's live fraction. */
export const SQRT_DK_TEX = String.raw`\sqrt{d_k}`;

/** `QKᵀ`, the numerator — used as the collapsed glyph chapter 5 expands from. */
export const QK_TEX = String.raw`QK^{T}`;

/** `softmax(` and `)V`, the pieces either side of chapter 5's live fraction. */
export const SOFTMAX_OPEN_TEX = String.raw`\operatorname{softmax}\!\big(`;
export const CLOSE_V_TEX = String.raw`\big)V`;
