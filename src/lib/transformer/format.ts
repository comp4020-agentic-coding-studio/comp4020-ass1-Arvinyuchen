// One formatter, used by every visualisation. Two reasons it lives here rather
// than inline: a matrix whose cells round differently from the working beneath
// it looks like an arithmetic error, and `(-0).toFixed(2)` is the string
// `"-0.00"`, which reads as a negative zero and is wrong on screen.

/** Decimal places used for matrix cells and workings. Two is enough for the
 * hand-authored weights and keeps a 6×6 grid legible at 390px. */
export const DP = 2;

/** Decimal places for values a reader might check against a calculator — the
 * positional encodings, the exponentials in softmax. */
export const DP_PRECISE = 4;

export function fmt(value: number, dp: number = DP): string {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "−∞";
  // Collapse -0 to 0 before formatting, and use a real minus sign rather than
  // a hyphen so columns of tabular figures align.
  const safe = Object.is(value, -0) ? 0 : value;
  return safe.toFixed(dp).replace("-", "−");
}

export function fmtPrecise(value: number): string {
  return fmt(value, DP_PRECISE);
}

/** Formats a whole row for the table view and for `aria-label`s. */
export function fmtRow(row: readonly number[], dp: number = DP): string {
  return row.map((value) => fmt(value, dp)).join(", ");
}

/** `[6, 4]` → `"6 × 4"`. Chapter 10 labels every block with one of these. */
export function fmtShape(shape: readonly [number, number]): string {
  return `${shape[0]} × ${shape[1]}`;
}

/** A signed term as it appears mid-expression: `0.84 × 0.54`, with the operands
 * already formatted so the working and the cells can't disagree. */
export function fmtProduct(a: number, b: number, dp: number = DP): string {
  return `${fmt(a, dp)} × ${fmt(b, dp)}`;
}
