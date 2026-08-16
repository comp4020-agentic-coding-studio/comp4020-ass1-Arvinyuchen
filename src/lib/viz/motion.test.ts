import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TOKEN_MIRROR } from "./motion.js";

// `motion.ts` restates the motion tokens as numbers, because Motion takes
// seconds and a bezier array and CSS cannot export to TypeScript. This is what
// stops the restatement from drifting: it reads the real stylesheet.
//
// It is not hypothetical. `Reveal.tsx` shipped `duration: 0.28` against a
// `--dur` of `260ms` and an `ease` array hand-copied from `--ease`, so a
// component's transition and the CSS transition on the same element ran at
// different speeds and nothing could see it.
//
// Confirm this can fail before trusting it: change `--dur` in `global.css` to
// `250ms` and this suite goes red.

const css = readFileSync(resolve(import.meta.dirname, "../../styles/global.css"), "utf8");

/** Reads one custom property out of the stylesheet.
 *
 * Anchored to a line start so `--dur` cannot match `--dur-fast`, which is the
 * obvious way to write this and silently passes on the wrong declaration. */
function declared(token: string): string | undefined {
  return new RegExp(`(?:^|\\n)\\s*${token}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

describe("motion tokens", () => {
  it("reads a stylesheet that actually has tokens in it", () => {
    // Guards the whole suite passing vacuously if the path or the file changes.
    expect(TOKEN_MIRROR.length).toBeGreaterThan(0);
    expect(css).toContain("--ease:");
  });

  for (const [token, expected] of TOKEN_MIRROR) {
    it(`${token} matches its TypeScript mirror`, () => {
      expect(declared(token), `${token} is not declared in global.css`).toBe(expected);
    });
  }

  it("does not match a longer token by prefix", () => {
    // `--dur` and `--dur-fast` differ only by a suffix, and an unanchored
    // pattern reads the first of them wherever it happens to sit in the file.
    expect(declared("--dur")).not.toBe(declared("--dur-fast"));
  });
});
