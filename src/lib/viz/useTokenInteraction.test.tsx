// @vitest-environment jsdom
//
// First hook test in the repo, so there's no existing harness to reuse and no
// `@testing-library/react` in the dependency tree. React 19 exports `act`
// itself, and `react-dom/client` is already a dependency (the Astro React
// integration needs it), so a tiny manual render harness covers this without a
// new package.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHASE_DURATIONS, useTokenInteraction, type TokenInteraction } from "./useTokenInteraction.js";

// No test harness in this repo sets this yet — `act` from React 19 checks it
// directly, and without it every `act(...)` call above logs a false-positive
// warning even though updates are flushed synchronously.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const motionState = vi.hoisted(() => ({ reducedMotion: false }));
vi.mock("motion/react", () => ({
  useReducedMotion: () => motionState.reducedMotion,
}));

function Harness({ onReady }: { onReady: (api: TokenInteraction) => void }) {
  const api = useTokenInteraction();
  onReady(api);
  return null;
}

function advanceAllPhases() {
  act(() => {
    vi.advanceTimersByTime(PHASE_DURATIONS.compare + PHASE_DURATIONS.weight + PHASE_DURATIONS.mix);
  });
}

describe("useTokenInteraction", () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: TokenInteraction;

  // A fresh mount, not a rerender of the existing one: `useReducedMotion` is
  // mocked as a plain function read at render time, so a test that flips
  // `motionState` needs a new render to actually observe it — mutating the
  // module state doesn't itself trigger React to re-render the old tree.
  function mount() {
    container = document.createElement("div");
    root = createRoot(container);
    act(() => {
      root.render(
        <Harness
          onReady={(api) => {
            current = api;
          }}
        />,
      );
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    motionState.reducedMotion = false;
    mount();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle with nothing selected", () => {
    expect(current.phase).toBe("idle");
    expect(current.selectedPosition).toBeNull();
    expect(current.hasCompletedOnce).toBe(false);
  });

  it("walks compare -> weight -> mix -> settled on the documented timing", () => {
    act(() => current.selectToken(2));
    expect(current.phase).toBe("compare");
    expect(current.selectedPosition).toBe(2);

    act(() => {
      vi.advanceTimersByTime(PHASE_DURATIONS.compare);
    });
    expect(current.phase).toBe("weight");

    act(() => {
      vi.advanceTimersByTime(PHASE_DURATIONS.weight);
    });
    expect(current.phase).toBe("mix");

    act(() => {
      vi.advanceTimersByTime(PHASE_DURATIONS.mix);
    });
    expect(current.phase).toBe("settled");
    expect(current.hasCompletedOnce).toBe(true);
  });

  it("a reselection mid-animation cancels the stale run rather than layering on top of it", () => {
    act(() => current.selectToken(1));
    act(() => {
      vi.advanceTimersByTime(PHASE_DURATIONS.compare);
    });
    expect(current.phase).toBe("weight");

    act(() => current.selectToken(3));
    expect(current.phase).toBe("compare");
    expect(current.selectedPosition).toBe(3);

    advanceAllPhases();
    expect(current.phase).toBe("settled");
    expect(current.selectedPosition).toBe(3);
  });

  it("skips straight to settled under reduced motion, with no pending timers", () => {
    motionState.reducedMotion = true;
    mount();
    act(() => current.selectToken(0));
    expect(current.phase).toBe("settled");
    expect(current.hasCompletedOnce).toBe(true);

    // If a timer had still been scheduled, this would move the phase again.
    advanceAllPhases();
    expect(current.phase).toBe("settled");
  });

  it("replaySelectedToken re-runs the animation for the same position", () => {
    act(() => current.selectToken(4));
    advanceAllPhases();
    expect(current.phase).toBe("settled");

    act(() => current.replaySelectedToken());
    expect(current.phase).toBe("compare");
    expect(current.selectedPosition).toBe(4);

    advanceAllPhases();
    expect(current.phase).toBe("settled");
    expect(current.selectedPosition).toBe(4);
  });

  it("does nothing when replayed before any token has ever been selected", () => {
    act(() => current.replaySelectedToken());
    expect(current.phase).toBe("idle");
    expect(current.selectedPosition).toBeNull();
  });

  it("clears pending timers on unmount, so no state update fires after", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => current.selectToken(1));
    act(() => {
      root.unmount();
    });

    act(() => {
      vi.advanceTimersByTime(
        PHASE_DURATIONS.compare + PHASE_DURATIONS.weight + PHASE_DURATIONS.mix,
      );
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
