import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { D_MODEL, DIM_LABELS, SEQ_LEN, TOKENS } from "../../lib/transformer/constants.js";
import { runForward } from "../../lib/transformer/forward.js";
import { fmt, fmtPrecise } from "../../lib/transformer/format.js";
import { frequencyDivisor, pairCount, positionalEncoding } from "../../lib/transformer/positional.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";
import { StageBlock } from "./primitives/Stage.tsx";

// Chapter 3. The curves are drawn from the same `positionalEncoding` the matrix
// is built from, sampled finely — so a dot sitting off its curve would be a real
// disagreement, not a rendering artefact. The spec asserts they coincide.

const CHAPTER = chapterById("03")!;

const WIDTH = 320;
const HEIGHT = 96;
const PAD = 12;
const SAMPLES = 160;

export default function Ch03PositionalEncoding() {
  const pass = runForward();
  const [position, setPosition] = useState(3); // the second `the`
  const [addPe, setAddPe] = useState(true);

  const tokens = [...TOKENS];
  const dims = [...DIM_LABELS];
  const pairs = pairCount();

  // With PE switched off, the input is just the embedding table — which is
  // exactly the state chapter 2 ended on.
  const x = addPe ? pass.x : pass.e;

  const xScale = scaleLinear().domain([0, SEQ_LEN - 1]).range([PAD, WIDTH - PAD]);
  const yScale = scaleLinear().domain([-1, 1]).range([HEIGHT - PAD, PAD]);

  const curve = line<{ pos: number; value: number }>()
    .x((d) => xScale(d.pos))
    .y((d) => yScale(d.value));

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Sinusoidal positional encoding">
      {(stage) => (
        <>
          {/* The curve strip scrolls sideways on phones and contains only SVG,
              so it has no focusable content of its own and needs a tab stop —
              same reason as the matrices. */}
          <StageBlock id="curves" when={stage === 1}>
            <div
              className="curves"
              data-curves
              tabIndex={0}
              role="group"
              aria-label={`Sine and cosine curves for all ${pairs} frequency pairs`}
            >
              {Array.from({ length: pairs }, (_, pair) => {
                const divisor = frequencyDivisor(pair);
                const sine = Array.from({ length: SAMPLES }, (_, s) => {
                  const pos = (s / (SAMPLES - 1)) * (SEQ_LEN - 1);
                  return { pos, value: Math.sin(pos / divisor) };
                });
                const cosine = sine.map((d) => ({
                  pos: d.pos,
                  value: Math.cos(d.pos / divisor),
                }));
                return (
                  <figure key={pair} className="curve" data-curve-pair={pair}>
                    <figcaption className="curve__caption">
                      dims {pair * 2} and {pair * 2 + 1} — wavelength {fmt(divisor, 0)}
                      {divisor > SEQ_LEN ? (
                        // Worth saying out loud: over six positions this pair looks
                        // almost flat, which reads as a broken chart rather than as
                        // the intended behaviour.
                        <span className="curve__aside">
                          {" "}
                          — barely moves across six words, and is not meant to. The slow
                          pairs are what separate position 400 from position 401.
                        </span>
                      ) : null}
                    </figcaption>
                    <svg
                      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                      role="img"
                      aria-label={`Sine and cosine at wavelength ${fmt(divisor, 0)}, sampled at all ${SEQ_LEN} positions`}
                    >
                      <line
                        className="curve__axis"
                        x1={PAD}
                        x2={WIDTH - PAD}
                        y1={yScale(0)}
                        y2={yScale(0)}
                      />
                      <path className="curve__line" data-fn="sin" d={curve(sine) ?? undefined} />
                      <path
                        className="curve__line"
                        data-fn="cos"
                        data-dashed="true"
                        d={curve(cosine) ?? undefined}
                      />
                      {Array.from({ length: SEQ_LEN }, (_, pos) => {
                        const pe = positionalEncoding(pos);
                        return (
                          <g key={pos} data-sample={pos}>
                            <circle
                              className="curve__dot"
                              data-fn="sin"
                              data-current={pos === position ? "true" : "false"}
                              cx={xScale(pos)}
                              cy={yScale(pe[pair * 2]!)}
                              r={pos === position ? 4 : 2.5}
                            />
                            <circle
                              className="curve__dot"
                              data-fn="cos"
                              data-current={pos === position ? "true" : "false"}
                              cx={xScale(pos)}
                              cy={yScale(pe[pair * 2 + 1]!)}
                              r={pos === position ? 4 : 2.5}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </figure>
                );
              })}
            </div>
          </StageBlock>

          <StageBlock id="pe" when={stage === 0}>
            <div className="pair">
              <Matrix
                name="pe"
                rows={pass.pe}
                label="PE — computed from the paper's formula"
                rowLabels={tokens}
                colLabels={dims}
                scale="diverging"
                domainMax={1}
                role="position"
                selectedRow={position}
                onRow={setPosition}
              />
              <Matrix
                name="x"
                rows={x}
                label={addPe ? "X = E + PE — the input to every layer" : "E alone — position switched off"}
                rowLabels={tokens}
                colLabels={dims}
                scale="diverging"
                role={addPe ? "position" : "neutral"}
                selectedRow={position}
                onRow={setPosition}
              />
            </div>
          </StageBlock>

          <StageBlock id="pe-working" when={stage === 2} order={1}>
            <div className="working" data-term-expansion>
              <p className="working__head">
                Position {position} — “{tokens[position]}”, element by element
              </p>
              {pass.e[position]!.map((embedValue, d) => (
                <p key={d} className="working__line num">
                  <span className="working__op">{dims[d]}: </span>
                  <span>{fmt(embedValue)}</span>
                  <span className="working__op"> + </span>
                  <span data-pe-term={d}>{fmtPrecise(pass.pe[position]![d]!)}</span>
                  <span className="working__op"> = </span>
                  <strong data-x-term={d}>{fmtPrecise(pass.x[position]![d]!)}</strong>
                </p>
              ))}
            </div>
          </StageBlock>

          <StageBlock id="x-comparison" when={stage === 3}>
            <Matrix
              name="x-comparison"
              rows={[x[0]!, x[3]!]}
              label={addPe ? "The two ‘the’ positions now differ" : "Without position, the two ‘the’ rows collide"}
              rowLabels={["the · 0", "the · 3"]}
              colLabels={dims}
              scale="diverging"
              role={addPe ? "position" : "neutral"}
            />
          </StageBlock>

          <StageBlock id="the-comparison" when={stage === 3} order={1}>
            <p className="figure-note" data-the-comparison>
              {addPe ? (
                <>
                  Rows 0 and 3 now differ: {fmt(pass.x[0]![1]!)} against{" "}
                  {fmt(pass.x[3]![1]!)} in the second dimension alone. All {SEQ_LEN} positions
                  are distinct.
                </>
              ) : (
                <>
                  With position switched off, rows 0 and 3 are byte-identical again — both
                  are “the”, and the model is back to being unable to tell them apart.
                </>
              )}
            </p>
          </StageBlock>

          {stage >= 1 ? <div className="controls">
            {stage === 1 || stage === 2 ? (
              <label className="control" htmlFor="pe-position">
                <span className="control__legend">Position</span>
                <input
                  id="pe-position"
                  type="range"
                  min={0}
                  max={SEQ_LEN - 1}
                  step={1}
                  value={position}
                  data-position-slider
                  onChange={(event) => setPosition(Number(event.target.value))}
                />
                <output className="num" htmlFor="pe-position" data-position-value>
                  {position} — {tokens[position]}
                </output>
              </label>
            ) : null}

            {stage === 3 ? (
              <div className="control">
                <button
                  type="button"
                  className="toggle"
                  data-pe-toggle
                  aria-pressed={addPe}
                  onClick={() => setAddPe((on) => !on)}
                >
                  + PE {addPe ? "on" : "off"}
                </button>
              </div>
            ) : null}
          </div> : null}

          {stage !== 2 ? <p className="ramp-legend">
            <span>−1</span>
            <span className="ramp-legend__bar" data-scale="diverging" aria-hidden="true" />
            <span>+1</span>
            <span>
              {D_MODEL} dimensions, {pairs} sine/cosine pairs
            </span>
          </p> : null}
        </>
      )}
    </ChapterFrame>
  );
}
