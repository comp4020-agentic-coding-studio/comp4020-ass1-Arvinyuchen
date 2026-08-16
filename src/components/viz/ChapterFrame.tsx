import type { ReactNode } from "react";
import type { Chapter } from "../../lib/transformer/chapters.js";
import { useStage } from "../../lib/viz/useStage.js";
import { StageFrame, StageMotionProvider } from "./primitives/Stage.tsx";

// The shell every chapter shares, and it is the same shell at every width now: a
// heading, one active paragraph, and a figure whose stepper is the only thing
// that changes it.
//
// The desktop half of this used to be different — a rail of viewport-tall prose
// beats scrolling past a `position: sticky` figure. That was built, measured and
// replaced; CLAUDE.md has the arc. What survives is the arrangement the phone
// already had.
//
// The stepper is deliberately NOT a tablist, and the original reason for that no
// longer holds: it was "the beats are always visible, they are what the reader
// scrolls through", and the beats are now hidden at every width. The conclusion
// still stands on two others. There are no panels — one continuous figure whose
// blocks change, with no `aria-controls` relationship for a tablist to describe.
// And `role="group"` is fixed by the interaction contract in
// `spec/assignment-1.test.ts`, so changing it is a contract change rather than a
// styling one. Worth revisiting deliberately rather than by inertia.
//
// The `aria-live` line is what makes stage changes perceivable without sight.

export interface ChapterFrameProps {
  chapter: Chapter;
  /** The visualisation, given the active beat index. */
  children: (stage: number) => ReactNode;
  /** Short description of the figure, for the stepper's group label. */
  vizLabel: string;
}

export function ChapterFrame({ chapter, children, vizLabel }: ChapterFrameProps) {
  const count = chapter.beats.length;
  const { stage, direction, setStage } = useStage(count);
  const active = chapter.beats[stage];

  return (
    <section className="chapter" data-chapter={chapter.id} id={chapter.slug}>
      {/* The heading is a sibling of the body, not a child of it. That is simply
          document order now, but it was hard-won: the figure once painted its
          opaque card over this heading, because `translate: 0 -50%` escaped the
          containing block sticky is clamped to. Nothing is sticky any more, and
          the `no figure ever paints over prose` e2e spec still guards it. */}
      <header className="chapter__head">
        <p className="chapter__eyebrow num">
          <span className="sr-only">Chapter </span>
          {String(chapter.number).padStart(2, "0")}
        </p>
        <h2>{chapter.title}</h2>
        <p className="chapter__thesis">{chapter.thesis}</p>
      </header>

      <div className="chapter__body">
        <div className="chapter__figure">
          {/* The reader's whole view of the prose: the beat for the step they are
              on, above the figure it describes. It introduces the diagram before
              the diagram appears, rather than putting eleven paragraphs above or
              below one figure. */}
          <p className="chapter__active-beat" data-active-beat={active?.id}>
            {active?.body}
          </p>

          <div className="chapter__viz" data-viz={chapter.slug}>
            <div
              className="stepper"
              role="group"
              aria-label={`${vizLabel} — step through`}
              data-testid="interaction-trigger"
              data-stepper={chapter.id}
            >
              <button
                type="button"
                className="stepper__arrow"
                data-step-prev
                disabled={stage === 0}
                onClick={() => setStage(stage - 1)}
              >
                <span aria-hidden="true">←</span>
                <span className="sr-only">Previous step</span>
              </button>

              <ol className="stepper__dots">
                {chapter.beats.map((beat, i) => (
                  <li key={beat.id}>
                    <button
                      type="button"
                      className="stepper__dot"
                      data-stage={beat.id}
                      data-stage-index={i}
                      aria-current={stage === i ? "step" : undefined}
                      aria-label={`Step ${i + 1} of ${count}`}
                      onClick={() => setStage(i)}
                    />
                  </li>
                ))}
              </ol>

              <button
                type="button"
                className="stepper__arrow"
                data-step-next
                disabled={stage === count - 1}
                onClick={() => setStage(stage + 1)}
              >
                <span aria-hidden="true">→</span>
                <span className="sr-only">Next step</span>
              </button>

              <p className="stepper__count num" aria-hidden="true">
                {stage + 1}/{count}
              </p>
            </div>

            {/* Height changes are animated so mounting a table doesn't shove the
                prose below it down in a single frame. */}
            <div className="chapter__viz-content">
              <StageMotionProvider direction={direction}>
                <StageFrame>{children(stage)}</StageFrame>
              </StageMotionProvider>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {`Step ${stage + 1} of ${count}. ${active?.body ?? ""}`}
          </p>
        </div>

        {/* Server-rendered at every width and `display: none` at every width.
            Not dead markup: `spec/assignment-1.test.ts` asserts against it
            heavily — beat counts per chapter, more than 40 characters of prose
            in each, no backticks or `d_k`, chapter 5's beat ids, chapter 11's
            hedging, and a `.beat__line` inside every one of them. It runs in
            JSDOM against `dist/` without executing a script, so the markup is
            all it can see, and deleting these paragraphs would delete the only
            machine-readable statement that each chapter's prose exists and says
            what it should. The reader reaches the same text through
            `.chapter__active-beat` and the stepper. */}
        <div className="chapter__prose">
          {chapter.beats.map((beat, i) => (
            <p
              key={beat.id}
              className="beat"
              data-stage={beat.id}
              data-stage-active={stage === i ? "true" : "false"}
            >
              {/* The span stays. Its original reason is gone — it existed so the
                  prose could translate without moving the paragraph the scroll
                  observer was measuring — but `spec/` asserts one `.beat__line`
                  inside every beat, so it is part of the contract now. */}
              <span className="beat__line">{beat.body}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
