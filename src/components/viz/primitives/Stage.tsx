import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { createContext, useContext, type ReactNode } from "react";
import {
  DUR,
  DUR_FAST,
  DUR_LAYOUT,
  EASE,
  EASE_EXIT,
  SHIFT,
  STAGGER,
} from "../../../lib/viz/motion.js";

// What a beat change looks like inside a figure.
//
// The primitive this replaces could not animate an exit at all, and the reason
// was structural rather than a wrong duration. `AnimatePresence` lived *inside*
// `Reveal`, while every call site mounted `Reveal` conditionally:
//
//     {stage < 2 ? <Reveal id="qk-pair">…</Reveal> : null}
//
// React unmounted the presence container along with its child, so the `exit`
// variant never had anything left to play on. All four of chapter 5's reveals
// were in that shape and no mounted `Reveal` ever changed its `id`, which is why
// the only transition on any chapter was the frame's height morph — ten of
// eleven chapters were swapping their contents in a single frame.
//
// So the condition moves inside the container. `StageBlock` is always mounted;
// what changes is whether it has a child. That is the whole fix.

interface StageMotion {
  /** +1 when the reader is moving forward through the chapter, -1 back. */
  direction: 1 | -1;
  /** False under `prefers-reduced-motion`, which is the only thing that turns
   * this off. It used to also be true that the phone changed stages differently
   * from the desktop; it doesn't — one layout, one driver, at every width. */
  animated: boolean;
}

const StageMotionContext = createContext<StageMotion>({ direction: 1, animated: false });

export function StageMotionProvider({
  direction,
  children,
}: {
  direction: 1 | -1;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <StageMotionContext.Provider value={{ direction, animated: !reduced }}>
      {children}
    </StageMotionContext.Provider>
  );
}

// Moving forward, the arriving block rises from below and the leaving one
// departs upward; moving back, both reverse. One sign covers all four cases.
//
// `custom` rather than a prop is not a style preference. An exiting child is no
// longer being rendered by its parent, so props cannot reach it — `custom` on
// `AnimatePresence` is the channel that still can.
//
// Opacity is animated here and rests at 1. That is the line this page draws:
// opacity may be animated, never asserted. The contrast rule that bans it
// elsewhere is about content a reader is being asked to read while it sits
// faded, and nothing here sits.
const BLOCK: Variants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, y: dir * SHIFT }),
  active: { opacity: 1, y: 0 },
  exit: (dir: 1 | -1) => ({
    opacity: 0,
    y: dir * -SHIFT,
    transition: { duration: DUR_FAST, ease: EASE_EXIT },
  }),
};

export interface StageBlockProps {
  /** Identity. Two blocks with different ids replace each other; one block whose
   * id is unchanged is never re-animated, however its contents change. */
  id: string;
  /** Whether the active beat wants this block. */
  when: boolean;
  /** Position in the cascade when several blocks arrive together:
   * 0 the figure the beat is about, 1 the working under it, 2 the legend.
   * Controls are never wrapped — a control that animates in is one you click at
   * the wrong moment. */
  order?: number;
  children: ReactNode;
}

/** The animated box, rendered inside `AnimatePresence` so it can ask whether it
 * is on its way out.
 *
 * A leaving block is a duplicate: for the length of its exit the old matrix and
 * the new one are both in the document, and `popLayout` has taken the old one
 * out of flow so it is sitting on top of its own replacement. Screen readers
 * would read both. axe-core noticed first — it scanned during an exit and
 * reported 1423 contrast failures against a block that was two-thirds faded,
 * which is what a duplicate at partial opacity over another element measures
 * as. `aria-hidden` and `inert` take the departing copy out of the accessibility
 * tree and out of the tab order for the ~120ms it still exists.
 *
 * `useIsPresent`, not `usePresence`. The latter hands removal to the caller —
 * it returns a `safeToRemove` you are then responsible for calling — so reading
 * presence with it left every exiting block mounted forever. Chapter 3 stacked
 * its stage-0 pair under its stage-2 working and overflowed the viewport by
 * 88px, which is a stuck exit wearing a layout bug's clothes. */
function PresenceBlock({
  direction,
  order,
  children,
}: {
  direction: 1 | -1;
  order: number;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      className="reveal"
      custom={direction}
      variants={BLOCK}
      initial="enter"
      animate="active"
      exit="exit"
      aria-hidden={isPresent ? undefined : true}
      inert={!isPresent}
      // No `layout` here, deliberately: `StageFrame` below owns the one layout
      // animation per chapter. With both, `y` would be driven by the variant and
      // by the projection at once and the block would bounce.
      transition={{ duration: DUR, ease: EASE, delay: order * STAGGER }}
    >
      {children}
    </motion.div>
  );
}

export function StageBlock({ id, when, order = 0, children }: StageBlockProps) {
  const { direction, animated } = useContext(StageMotionContext);

  // Under reduced motion the tree contains no `AnimatePresence` at all, so the
  // end state is reached synchronously rather than in a zero-length animation.
  if (!animated) return when ? <div className="reveal">{children}</div> : null;

  return (
    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
      {when ? (
        <PresenceBlock key={id} direction={direction} order={order}>
          {children}
        </PresenceBlock>
      ) : null}
    </AnimatePresence>
  );
}

/** Wraps a whole figure so its height changes are animated rather than jumped.
 *
 * Without this, mounting a 6-row table shoves everything below it down a few
 * hundred pixels in one frame. `mode="popLayout"` above takes the exiting child
 * out of flow, so the frame's height collapses immediately and this animates it.
 *
 * Exactly one of these per chapter. It is the only node on the page carrying
 * `layout`, and that is what keeps the measured scroll cost where it is. */
export function StageFrame({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      layout={!reduced}
      transition={reduced ? { duration: 0 } : { duration: DUR_LAYOUT, ease: EASE }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {children}
    </motion.div>
  );
}
