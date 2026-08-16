import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { D_MODEL, D_V, DIM_LABELS, N_HEADS, TOKENS } from "../../lib/transformer/constants.js";
import { runForward } from "../../lib/transformer/forward.js";
import { W_O } from "../../lib/transformer/weights.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";
import { StageBlock } from "./primitives/Stage.tsx";

// Chapter 7. The claims each head's caption makes about what it attends to are
// computed here from `argmaxPerRow`, not written by hand — and the unit suite
// asserts them, so a caption cannot drift away from the numbers under it.

const CHAPTER = chapterById("07")!;

export default function Ch07MultiHead() {
  const pass = runForward();
  const tokens = [...TOKENS];
  const dims = [...DIM_LABELS];
  const [focus, setFocus] = useState<number | null>(null);

  const concatLabels = pass.heads.flatMap((_head, i) =>
    Array.from({ length: D_V }, (_, d) => `h${i}·${d}`),
  );

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Multi-head attention">
      {(stage) => (
        <>
          <div className="heads" data-heads>
            {pass.heads.map((head, i) => {
              const visible =
                stage === 0
                  ? focus === null || focus === i
                  : stage <= 2
                    ? i === 0
                    : stage === 3
                      ? i === 1
                      : false;
              return (
                <section
                  key={i}
                  className="head"
                  data-head={i}
                  data-lit="true"
                  hidden={!visible}
                >
                  <h3 className="head__title">
                    Head {i} — {head.label}
                  </h3>
                  <p className="head__desc">{head.description}</p>
                  <Matrix
                    name={`weights-h${i}`}
                    rows={head.weights}
                    label={`Head ${i} weights`}
                    rowLabels={tokens}
                    colLabels={tokens}
                    scale="sequential"
                    role={i === 0 ? "query" : "position"}
                  />
                  <ul className="head__argmax" data-argmax={i}>
                    {head.argmaxPerRow.map((j, q) => (
                      <li key={q} className="num">
                        {tokens[q]} → <strong>{tokens[j]}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <StageBlock id="head-output" when={stage >= 4}>
            <div className="pair head-output" tabIndex={0} role="group" aria-label="Concatenate and mix the two head outputs">
              <Matrix
                name="concat"
                rows={pass.concat}
                label={`concat — ${N_HEADS} heads × ${D_V} dims = ${D_MODEL}`}
                rowLabels={tokens}
                colLabels={concatLabels}
                scale="diverging"
                role="value"
              />
              <Matrix
                name="w-o"
                rows={W_O}
                label="W_O — mixes what the heads found"
                rowLabels={concatLabels}
                colLabels={dims}
                scale="diverging"
                domainMax={1}
                role="neutral"
              />
              <Matrix
                name="attn-out"
                rows={pass.attnOut}
                label="Attention output, back at the stream's width"
                rowLabels={tokens}
                colLabels={dims}
                scale="diverging"
                role="neutral"
              />
            </div>
          </StageBlock>

          {stage === 0 ? <div className="controls">
            <div className="control">
              <p className="control__legend" id="head-picker-label">
                Show
              </p>
              <div className="row-picker" role="group" aria-labelledby="head-picker-label">
                {pass.heads.map((head, i) => (
                  <button
                    key={i}
                    type="button"
                    data-head-select={i}
                    aria-pressed={focus === i}
                    onClick={() => setFocus(focus === i ? null : i)}
                  >
                    {head.label}
                  </button>
                ))}
                <button
                  type="button"
                  data-head-select="both"
                  aria-pressed={focus === null}
                  onClick={() => setFocus(null)}
                >
                  both
                </button>
              </div>
            </div>
          </div> : null}

          {stage > 0 && stage < 4 ? <p className="ramp-legend">
            <span>0</span>
            <span className="ramp-legend__bar" data-scale="sequential" aria-hidden="true" />
            <span>1</span>
            <span>both heads share one weight scale, so they are comparable</span>
          </p> : null}
        </>
      )}
    </ChapterFrame>
  );
}
