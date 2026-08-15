import type { ReactNode } from "react";
import type { Chapter } from "../../lib/transformer/chapters.js";
import { useScrollStage } from "../../lib/viz/useScrollStage.js";
import { RevealFrame } from "./primitives/Reveal.tsx";

// The shell every chapter shares: a sticky visualisation, prose beats that scroll
// past it, and a stepper.
//
// The stepper is deliberately NOT a tablist, which is a change from the previous
// four-stage page. A tablist implies panels that show and hide, and here the
// beats are always visible — they are the thing being scrolled through, and
// hiding them would remove the scroll-driven disclosure this page is built on.
// Announcing them as tabs would be a lie to a screen reader, so the stepper is a
// labelled group of buttons carrying `aria-current="step"`, which is what it
// actually is. The `aria-live` line is what makes stage changes perceivable
// without sight.

export interface ChapterFrameProps {
  chapter: Chapter;
  /** The visualisation, given the active beat index. */
  children: (stage: number) => ReactNode;
  /** Short description of the figure, for the stepper's group label. */
  vizLabel: string;
}

export function ChapterFrame({ chapter, children, vizLabel }: ChapterFrameProps) {
  const count = chapter.beats.length;
  const { stage, setStage, registerBeat } = useScrollStage(count);
  const active = chapter.beats[stage];

  return (
    <section className="chapter" data-chapter={chapter.id} id={chapter.slug}>
      {/* The heading sits inside the grid, in the same column as the prose.
          Outside it, the sticky figure — which is vertically centred in the
          viewport at desktop widths — floated across the thesis and covered it,
          because the heading was free to run the full width of the chapter. */}
      <div className="chapter__body">
        <div className="chapter__figure">
          <div className="chapter__viz" data-viz={chapter.slug}>
            {/* Height changes are animated so mounting a table doesn't shove the
                prose below it down in a single frame. */}
            <RevealFrame>{children(stage)}</RevealFrame>
          </div>

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

          <p className="sr-only" aria-live="polite">
            {`Step ${stage + 1} of ${count}. ${active?.body ?? ""}`}
          </p>
        </div>

        <div className="chapter__text">
          <header className="chapter__head">
            <p className="chapter__eyebrow num">
              <span className="sr-only">Chapter </span>
              {String(chapter.number).padStart(2, "0")}
            </p>
            <h2>{chapter.title}</h2>
            <p className="chapter__thesis">{chapter.thesis}</p>
          </header>

          <div className="chapter__prose">
            {chapter.beats.map((beat, i) => (
              <p
                key={beat.id}
                ref={registerBeat(i)}
                className="beat"
                data-stage={beat.id}
                data-stage-active={stage === i ? "true" : "false"}
              >
                {beat.body}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
