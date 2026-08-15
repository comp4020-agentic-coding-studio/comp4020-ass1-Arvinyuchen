import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { SEQ_LEN, TOKENS } from "../../lib/transformer/constants.js";
import { runForward } from "../../lib/transformer/forward.js";
import { fmt } from "../../lib/transformer/format.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";

// Chapter 9. Same head, same scores as chapter 5 — the only change is the mask,
// which is the point. The masked cells hold real −Infinity rather than a large
// negative number, so the resulting zeros are exact and the spec can assert them.

const CHAPTER = chapterById("09")!;

export default function Ch09MaskedAttention() {
  const pass = runForward();
  const head = pass.heads[0]!;
  const [step, setStep] = useState(SEQ_LEN - 1);

  const tokens = [...TOKENS];

  // At generation step k the model has written k + 1 tokens, so only those rows
  // exist. Slicing rather than dimming: a row that hasn't been generated is not
  // faint, it is absent.
  const visible = step + 1;
  const scores = head.maskedScores.slice(0, visible);
  const weights = head.maskedWeights.slice(0, visible);
  const rowLabels = tokens.slice(0, visible);

  const zerosInRow = head.maskedWeights[step]!.filter((value) => value === 0).length;

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Masked decoder attention">
      {(stage) => (
        <>
          {stage <= 1 ? (
            <Matrix
              name="scores"
              rows={head.scores}
              label="The same scores as chapter 5, unmasked"
              rowLabels={tokens}
              colLabels={tokens}
              scale="diverging"
              role="query"
            />
          ) : null}

          {stage >= 1 ? (
            <Matrix
              name="masked-scores"
              rows={scores}
              label="Everything after the diagonal set to −∞"
              rowLabels={rowLabels}
              colLabels={tokens}
              scale="diverging"
              role="query"
              describeCell={(i, j, value) =>
                Number.isFinite(value)
                  ? `${tokens[i]} attending to ${tokens[j]}: ${fmt(value)}`
                  : `${tokens[i]} cannot see ${tokens[j]} — it comes later`
              }
            />
          ) : null}

          {stage >= 2 ? (
            <Matrix
              name="masked-weights"
              rows={weights}
              label="After softmax — the future is exactly zero"
              rowLabels={rowLabels}
              colLabels={tokens}
              scale="sequential"
              role="query"
            />
          ) : null}

          {stage >= 2 ? (
            <div className="working" data-mask-readout>
              <p className="working__line num">
                Row {step} — “{tokens[step]}” — sums to{" "}
                <strong data-masked-row-sum>
                  {fmt(head.maskedWeights[step]!.reduce((a, b) => a + b, 0))}
                </strong>
                <span className="working__op">
                  {" "}
                  with <strong>{zerosInRow}</strong> weights at exactly zero
                </span>
              </p>
              <p className="working__line working__note">
                −∞ exponentiates to exactly 0, so these are true zeros. A large negative
                number would only have made them very small.
              </p>
            </div>
          ) : null}

          <div className="controls">
            <label className="control" htmlFor="gen-step">
              <span className="control__legend">Generation step</span>
              <input
                id="gen-step"
                type="range"
                min={0}
                max={SEQ_LEN - 1}
                step={1}
                value={step}
                data-generation-step
                onChange={(event) => setStep(Number(event.target.value))}
              />
              <output className="num" htmlFor="gen-step" data-generation-value>
                {step} — written “{tokens.slice(0, visible).join(" ")}”
              </output>
            </label>
          </div>

          <p className="ramp-legend">
            <span>0</span>
            <span className="ramp-legend__bar" data-scale="sequential" aria-hidden="true" />
            <span>1</span>
            <span>masked cells carry no fill at all — they are not a small weight</span>
          </p>
        </>
      )}
    </ChapterFrame>
  );
}
