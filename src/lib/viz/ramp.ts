import type { CSSProperties } from "react";

// Turns a number into the custom properties `global.css` needs to colour a cell.
//
// No colour ever appears here. The stylesheet owns the ramp endpoints and
// `color-mix()` does the interpolation, so CLAUDE.md's rule that global.css is
// the only file holding a colour literal survives having heatmaps.

export interface FillAttrs {
  className: string;
  style: CSSProperties;
  "data-sign"?: string;
}

/** Sequential fill for a probability. `value` is expected in [0, 1] and the
 * domain is fixed there — never rescaled per row, so a weight of 0.3 is the same
 * colour in every chapter and every grid. */
export function sequentialFill(value: number): FillAttrs {
  const t = clamp01(value);
  return { className: "fill-seq", style: { "--t": t } as CSSProperties };
}

/** Diverging fill for a signed value. `max` is the domain half-width: pass the
 * largest absolute value in the whole matrix so cells stay comparable across
 * rows rather than each row rescaling to its own extreme. */
export function divergingFill(value: number, max: number): FillAttrs {
  if (!Number.isFinite(value)) {
    // A masked cell. Not a magnitude at all, so it gets no fill — chapter 9
    // labels it instead.
    return { className: "fill-div", style: { "--m": 0 } as CSSProperties, "data-sign": "0" };
  }
  const m = max === 0 ? 0 : clamp01(Math.abs(value) / max);
  return {
    className: "fill-div",
    style: { "--m": m } as CSSProperties,
    "data-sign": value < 0 ? "-1" : "1",
  };
}

/** Largest absolute finite value in a matrix — the diverging domain. */
export function absMax(rows: readonly (readonly number[])[]): number {
  let max = 0;
  for (const row of rows) {
    for (const value of row) {
      if (Number.isFinite(value)) max = Math.max(max, Math.abs(value));
    }
  }
  return max;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** The four identity hues, as the CSS variable names that carry them. Components
 * pass a role and get a variable reference, so no component names a colour. */
export type Role = "query" | "key" | "value" | "position" | "neutral";

export function roleVar(role: Role): string {
  return role === "neutral" ? "var(--ink-3)" : `var(--role-${role})`;
}
