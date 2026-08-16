import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { SEQ_LEN, TOKENS } from "../../lib/transformer/constants.js";
import { aggregationTerms, softmaxTerms } from "../../lib/transformer/derive.js";
import { runForward } from "../../lib/transformer/forward.js";
import { fmt, fmtPrecise } from "../../lib/transformer/format.js";
import { softmax } from "../../lib/transformer/linalg.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";
import { StageBlock } from "./primitives/Stage.tsx";

// Chapter 6. Softmax shown as the three steps it actually is, then the weighted
// sum built term by term. Both come from derive.ts, so the arithmetic under the
// table is the arithmetic in the table.

const CHAPTER = chapterById("06")!;
const KD = ["dim 0", "dim 1"] as const;

/** Temperature is exactly what √dₖ was: a divisor applied before softmax. Shown
 * as a slider so the reader can find the two failure modes themselves. */
const TEMPS = [0.25, 0.5, 1, 2, 4] as const;

export default function Ch06SoftmaxAndValues() {
  const pass = runForward();
  const head = pass.heads[0]!;
  const [row, setRow] = useState(2);
  const [tempIndex, setTempIndex] = useState(2); // 1.0 — the real thing

  const tokens = [...TOKENS];
  const temperature = TEMPS[tempIndex]!;

  const scoreRow = head.scores[row]!;
  const tempered = scoreRow.map((value) => value / temperature);
  const expansion = softmaxTerms(tempered);
  const weights = softmax(tempered);
  const aggregation = aggregationTerms(weights, head.v);

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Softmax and weighted aggregation">
      {(stage) => (
        <>
          {/* Only while it is the subject: past beat 1 the same numbers are the
              table's "score" column, and repeating them cost 90px of a figure
              that has to stay shorter than a phone screen. */}
          <StageBlock id="score-row" when={stage === 0}>
            <Matrix
              name="score-row"
              rows={[tempered]}
              label={`Scores for “${tokens[row]}” — one row of the grid`}
              colLabels={tokens}
              rowLabels={[tokens[row]!]}
              scale="diverging"
              role="query"
            />
          </StageBlock>

          {/* Two things about this table. It scrolls horizontally at phone
              widths, so it takes a tab stop — see the note in Matrix.tsx. And it
              stays visible through the last beat on purpose: the temperature
              slider's whole point is watching these weights redistribute. */}
          <StageBlock id="softmax-steps" when={stage === 1}>
            <div
              className="softmax-steps"
              data-softmax-steps
              tabIndex={0}
              role="group"
              aria-label="Softmax, step by step"
            >
              <table data-table-view="softmax">
                <caption className="matrix__caption">Softmax, step by step</caption>
                <thead>
                  <tr>
                    <th scope="col">token</th>
                    <th scope="col">score</th>
                    <th scope="col">− max</th>
                    <th scope="col">exp</th>
                    <th scope="col">÷ total</th>
                  </tr>
                </thead>
                <tbody>
                  {expansion.steps.map((step) => (
                    <tr key={step.index} data-step={step.index}>
                      <th scope="row">{tokens[step.index]}</th>
                      <td className="num">{fmt(step.score)}</td>
                      <td className="num" data-shifted={step.index}>
                        {fmt(step.shifted)}
                      </td>
                      <td className="num" data-exp={step.index}>
                        {fmtPrecise(step.exp)}
                      </td>
                      <td className="num" data-weight={step.index}>
                        {fmt(step.weight)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">total</th>
                    <td />
                    <td />
                    <td className="num" data-exp-total>
                      {fmtPrecise(expansion.total)}
                    </td>
                    <td className="num" data-weight-sum>
                      <strong>{fmt(expansion.weightSum)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </StageBlock>

          <StageBlock id="weights" when={stage === 2 || stage === 4}>
            <Matrix
              name="weights"
              rows={[weights]}
              label="Attention weights — a distribution over the sentence"
              colLabels={tokens}
              rowLabels={[tokens[row]!]}
              scale="sequential"
              role="query"
            />
          </StageBlock>

          {/* Grouped as a `.pair` so on a phone the value matrix and its working
              sit side by side and scroll, rather than stacking to 1164px in an
              844px viewport. */}
          <StageBlock id="values" when={stage === 3}>
            <div className="pair pair--compact">
              <Matrix
                name="v"
                rows={head.v}
                label="V — one value vector per token"
                rowLabels={tokens}
                colLabels={[...KD]}
                scale="diverging"
                role="value"
              />
              <div className="working" data-term-expansion data-aggregation>
                <p className="working__head">
                  Output for “{tokens[row]}” — each value scaled by its weight, then added
                </p>
                {aggregation.dims.map((entry) => (
                  <p key={entry.dim} className="working__line num">
                    <span className="working__op">dim {entry.dim}: </span>
                    {entry.terms.map((term, k) => (
                      <span key={term.index} className="working__term">
                        {k > 0 ? <span className="working__op"> + </span> : null}
                        <span>{fmt(term.weight)}</span>
                        <span className="working__op" aria-hidden="true">
                          ×
                        </span>
                        <span>{fmt(term.value)}</span>
                      </span>
                    ))}
                    <span className="working__op" aria-hidden="true">
                      {" = "}
                    </span>
                    <strong data-output-dim={entry.dim}>{fmt(entry.sum)}</strong>
                  </p>
                ))}
              </div>
            </div>
          </StageBlock>

          <div className="controls">
            <div className="control">
              <p className="control__legend" id="sm-row-label">
                Query
              </p>
              <div className="row-picker" role="group" aria-labelledby="sm-row-label">
                {tokens.map((token, i) => (
                  <button
                    key={i}
                    type="button"
                    data-query-select={i}
                    aria-pressed={row === i}
                    onClick={() => setRow(i)}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            {stage >= 4 ? (
              <label className="control" htmlFor="temperature">
                <span className="control__legend">Temperature</span>
                <input
                  id="temperature"
                  type="range"
                  min={0}
                  max={TEMPS.length - 1}
                  step={1}
                  value={tempIndex}
                  data-temperature
                  onChange={(event) => setTempIndex(Number(event.target.value))}
                />
                <output className="num" htmlFor="temperature" data-temperature-value>
                  ÷ {fmt(temperature)}
                </output>
              </label>
            ) : null}
          </div>

          {(stage === 2 || stage === 4) ? <p className="ramp-legend">
            <span>0</span>
            <span className="ramp-legend__bar" data-scale="sequential" aria-hidden="true" />
            <span>1</span>
            <span>weights, on a fixed 0–1 scale across all {SEQ_LEN} rows</span>
          </p> : null}
        </>
      )}
    </ChapterFrame>
  );
}
