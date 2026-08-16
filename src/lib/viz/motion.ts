// The motion tokens, as the numbers Motion needs.
//
// The dependency runs CSS -> TS, not the other way round. `global.css` is the
// only file in the repo allowed to write a duration or a distance literal, and
// CSS cannot export to TypeScript, so these are a mirror of that block rather
// than its source. `motion.test.ts` parses `global.css` and fails when a pair
// disagrees, which is what makes the mirror a check rather than a comment asking
// you to remember.
//
// The other two candidates were both worse. Reading `getComputedStyle` at
// runtime looks like it removes the duplication, but every chapter is an island
// that server-renders before there is a `document`, so literal fallbacks would
// exist anyway and could drift unwatched. Making TS the source and generating
// the CSS would turn the one file that is allowed to hold literals into a build
// artefact that stylelint reads after the fact.
//
// Durations are seconds because that is what Motion takes; the mirror converts.

export const DUR_FAST = 0.12;
export const DUR = 0.26;
export const DUR_LAYOUT = 0.32;
export const DUR_SLOW = 0.52;
export const STAGGER = 0.06;

export const EASE = [0.2, 0.6, 0.2, 1] as const;
export const EASE_EXIT = [0.4, 0, 0.9, 0.6] as const;

/** How far a figure block travels on its way in or out, in pixels. */
export const SHIFT = 8;

/** The pairs `motion.test.ts` checks against `global.css`.
 *
 * Keep each entry next to the constant it mirrors. Adding a constant without
 * adding it here is the one way to slip past the check, so the two lists are
 * deliberately in the same file rather than the test owning the expectations. */
export const TOKEN_MIRROR: readonly (readonly [string, string])[] = [
  ["--dur-fast", `${DUR_FAST * 1000}ms`],
  ["--dur", `${DUR * 1000}ms`],
  ["--dur-layout", `${DUR_LAYOUT * 1000}ms`],
  ["--dur-slow", `${DUR_SLOW * 1000}ms`],
  ["--dur-stagger", `${STAGGER * 1000}ms`],
  ["--ease", `cubic-bezier(${EASE.join(", ")})`],
  ["--ease-exit", `cubic-bezier(${EASE_EXIT.join(", ")})`],
  ["--motion-shift", `${SHIFT}px`],
];
