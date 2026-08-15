import katex from "katex";

// One place that turns TeX into markup.
//
// Rendered at build time, never in the browser: the equations are fixed strings,
// so shipping a parser to every visitor to re-derive the same HTML would be waste.
// Callers hand the result to `set:html` / `dangerouslySetInnerHTML`, which is safe
// here precisely because the input is a constant in this repo and never anything a
// reader supplied.

export interface TexOptions {
  /** Centred, display-size equation rather than one set in running text. */
  display?: boolean;
}

export function tex(source: string, { display = false }: TexOptions = {}): string {
  return katex.renderToString(source, {
    displayMode: display,

    // A malformed formula fails the build instead of rendering as red error text
    // on the deployed page. `strict` promotes KaTeX's warnings to the same
    // treatment, so questionable notation is caught here rather than shipped.
    throwOnError: true,
    strict: "error",

    // No `\href`, `\includegraphics` or class injection. Nothing here needs them,
    // and leaving it on would mean the equations could do more than typeset.
    trust: false,

    output: "htmlAndMathml",
  });
}
