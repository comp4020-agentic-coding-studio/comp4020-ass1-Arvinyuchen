import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { D_K, SCALE, TOKENS } from "../../lib/transformer/constants.js";
import { scaledDotTerms } from "../../lib/transformer/derive.js";
import { runForward } from "../../lib/transformer/forward.js";
import { fmt } from "../../lib/transformer/format.js";
import { absMax } from "../../lib/viz/ramp.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Formula, type Slot } from "./primitives/Formula.tsx";
import { Matrix } from "./primitives/Matrix.tsx";
import { StageBlock } from "./primitives/Stage.tsx";
import { TermExpansion } from "./primitives/TermExpansion.tsx";

// Chapter 5. The one the page is built around.
//
// Chapters 4 to 6 show HEADS[0] as simply "the" projections, because the idea of
// multiple heads doesn't exist yet at this point in the argument. Chapter 7 is
// where it turns out to have been one of two.

const CHAPTER = chapterById("05")!;
const DIM_LABELS = ["dim 0", "dim 1"] as const;

/** Which term of the equation each beat is about. */
const SLOT_BY_STAGE: readonly (Slot | null)[] = [null, "qk", "qk", "qk", "scale"];

export default function Ch05ScaledDotProduct() {
  const pass = runForward();
  const head = pass.heads[0]!;

  const [row, setRow] = useState(2); // `chased` — the row with the best story
  const [col, setCol] = useState(5); // `mouse` — its object
  const [scaled, setScaled] = useState(true);

  const divisor = scaled ? SCALE : 1;
  const scores = scaled ? head.scores : head.rawScores;
  const expansion = scaledDotTerms(head.q[row]!, head.k[col]!, divisor);

  // The domain is the displayed matrix's own extreme, so the grid uses the whole
  // ramp.
  //
  // It was pinned to the *unscaled* extreme, on the theory that switching scaling
  // on should visibly desaturate the grid. That cost far more than it bought:
  // scaled values are all smaller than the unscaled maximum, so every cell sat in
  // the bottom third of the ramp and the whole grid read as pale grey in the
  // default state. The toggle does not need help — it changes every number on
  // screen, the working shows the division, and the legend's bounds move with it.
  const domainMax = absMax(scores);

  const tokens = [...TOKENS];

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Scaled dot-product attention">
      {(stage) => (
        <>
          <Formula
            active={SLOT_BY_STAGE[stage] ?? null}
            scaled={scaled}
            qk={
              stage >= 3 ? (
                <Matrix
                  name="scores"
                  rows={scores}
                  label={scaled ? "Scores — QKᵀ scaled" : "Raw scores — QKᵀ"}
                  rowLabels={tokens}
                  colLabels={tokens}
                  scale="diverging"
                  domainMax={domainMax}
                  role="query"
                  selectedRow={row}
                  selectedCol={col}
                  onCell={(i, j) => {
                    setRow(i);
                    setCol(j);
                  }}
                  describeCell={(i, j, value) =>
                    `query ${tokens[i]} against key ${tokens[j]}: ${fmt(value)}`
                  }
                />
              ) : undefined
            }
          />

          {/* Shown from the first beat rather than the second, so the
              server-rendered HTML carries real matrices: a reader with no
              JavaScript still gets Q, K and the equation, not an empty frame. */}
          <StageBlock id="qk-pair" when={stage < 2}>
            <div className="pair">
              <Matrix
                name="q"
                rows={head.q}
                label="Q — one query per token"
                rowLabels={tokens}
                colLabels={DIM_LABELS}
                scale="diverging"
                role="query"
                selectedRow={row}
                focusRow={stage >= 2}
                onRow={setRow}
              />
              <Matrix
                name="k"
                rows={head.k}
                label="K — one key per token"
                rowLabels={tokens}
                colLabels={DIM_LABELS}
                scale="diverging"
                role="key"
                selectedRow={col}
                focusRow={stage >= 2}
                onRow={setCol}
              />
            </div>
          </StageBlock>

          <StageBlock id="selected-qk-pair" when={stage === 2}>
            <div className="pair pair--compact">
              <Matrix
                name="q-selected"
                rows={[head.q[row]!]}
                label={`q — “${tokens[row]}” asks`}
                rowLabels={[tokens[row]!]}
                colLabels={DIM_LABELS}
                scale="diverging"
                role="query"
              />
              <Matrix
                name="k-selected"
                rows={[head.k[col]!]}
                label={`k — “${tokens[col]}” answers`}
                rowLabels={[tokens[col]!]}
                colLabels={DIM_LABELS}
                scale="diverging"
                role="key"
              />
            </div>
          </StageBlock>

          <StageBlock id="working" when={stage === 2} order={1}>
            <TermExpansion
              expansion={expansion}
              aTex={String.raw`q_{\mathrm{${tokens[row]}}}`}
              bTex={String.raw`k_{\mathrm{${tokens[col]}}}`}
              divisorTex={String.raw`\sqrt{d_k} = \sqrt{${D_K}} = ${fmt(SCALE, 4)}`}
              scaled={scaled}
            />
          </StageBlock>

          {stage === 0 || stage === 2 || stage === 4 ? (
            <div className="controls" hidden={stage === 0}>
              {stage === 0 || stage === 2 || stage === 4 ? (
                <div className="control">
                  <p className="control__legend" id="query-picker-label">
                    Query
                  </p>
                  <div className="row-picker" role="group" aria-labelledby="query-picker-label">
                    {tokens.map((token, i) => (
                      <button
                        key={`q-${i}`}
                        type="button"
                        data-query-select={i}
                        aria-pressed={row === i}
                        onClick={() => setRow(i)}
                      >
                        {token}
                        <span className="sr-only"> at position {i}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {stage === 4 ? (
              <div className="control">
                <button
                  type="button"
                  className="toggle"
                  data-scale-toggle
                  aria-pressed={scaled}
                  onClick={() => setScaled((on) => !on)}
                >
                  scaling {scaled ? "on" : "off"}
                </button>
              </div>
              ) : null}
            </div>
          ) : null}

          <StageBlock id="legend" when={stage === 3} order={2}>
            <p className="ramp-legend">
              <span>{fmt(-domainMax)}</span>
              <span className="ramp-legend__bar" data-scale="diverging" aria-hidden="true" />
              <span>{fmt(domainMax)}</span>
              <span>negative ← zero → positive</span>
            </p>
          </StageBlock>
        </>
      )}
    </ChapterFrame>
  );
}
