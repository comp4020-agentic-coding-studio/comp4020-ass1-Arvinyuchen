import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { D_FF, DIM_LABELS, TOKENS } from "../../lib/transformer/constants.js";
import { runForward, runLayerVariant } from "../../lib/transformer/forward.js";
import { fmt } from "../../lib/transformer/format.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";

// Chapter 8. The ablations come from `runLayerVariant` in forward.ts rather than
// being recomputed here, so switching the residual off changes the same numbers
// the rest of the page shows instead of a parallel copy of them.

const CHAPTER = chapterById("08")!;

export default function Ch08ResidualNormFfn() {
  const pass = runForward();
  const [residual, setResidual] = useState(true);
  const [norm, setNorm] = useState(true);
  const [row, setRow] = useState(2);

  const variant = runLayerVariant({ residual, norm });
  const tokens = [...TOKENS];
  const dims = [...DIM_LABELS];
  const ffLabels = Array.from({ length: D_FF }, (_, i) => `h${i}`);

  const normRow = variant.norm1?.[row];
  const clipped = variant.ffnPreRelu[row]!.filter((value) => value < 0).length;

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Residual, normalisation and the feed-forward network">
      {(stage) => (
        <>
          <div className="spine" data-spine>
            <Matrix
              name="x"
              rows={pass.x}
              label="X — into the layer"
              rowLabels={tokens}
              colLabels={dims}
              scale="diverging"
              role="neutral"
              selectedRow={row}
              onRow={setRow}
            />

            <p className="spine__op num" aria-hidden="true">
              {residual ? "+ attention" : "attention only"}
            </p>

            <Matrix
              name="residual-1"
              rows={variant.afterAttention}
              label={residual ? "X + attention(X)" : "attention(X), input discarded"}
              rowLabels={tokens}
              colLabels={dims}
              scale="diverging"
              role="neutral"
              selectedRow={row}
            />

            {stage >= 1 && variant.norm1 ? (
              <>
                <p className="spine__op num" aria-hidden="true">
                  LayerNorm
                </p>
                <Matrix
                  name="norm-1"
                  rows={variant.norm1.map((r) => r.out)}
                  label="Normalised — every row mean 0, variance 1"
                  rowLabels={tokens}
                  colLabels={dims}
                  scale="diverging"
                  role="neutral"
                  selectedRow={row}
                />
              </>
            ) : null}

            {stage >= 2 ? (
              <>
                <p className="spine__op num" aria-hidden="true">
                  4 → {D_FF} → ReLU → 4
                </p>
                <Matrix
                  name="ffn-hidden"
                  rows={variant.ffnHidden}
                  label={`Hidden layer after ReLU — negatives clipped to zero`}
                  rowLabels={tokens}
                  colLabels={ffLabels}
                  scale="diverging"
                  role="neutral"
                  selectedRow={row}
                />
                <Matrix
                  name="ffn-out"
                  rows={variant.ffnOut}
                  label="Back down to the stream's width"
                  rowLabels={tokens}
                  colLabels={dims}
                  scale="diverging"
                  role="neutral"
                  selectedRow={row}
                />
              </>
            ) : null}

            {stage >= 3 ? (
              <>
                <p className="spine__op num" aria-hidden="true">
                  {residual ? "+ residual, " : ""}
                  {norm ? "LayerNorm" : "no norm"}
                </p>
                <Matrix
                  name="layer-out"
                  rows={variant.out}
                  label="Out of the layer — and into the next one, six times over"
                  rowLabels={tokens}
                  colLabels={dims}
                  scale="diverging"
                  role="neutral"
                  selectedRow={row}
                />
              </>
            ) : null}
          </div>

          {stage >= 1 ? (
            <div className="working" data-norm-readout>
              <p className="working__head">
                Row {row} — “{tokens[row]}”, measured from the row above
              </p>
              {normRow ? (
                <p className="working__line num">
                  mean <strong data-norm-mean>{fmt(normRow.mean, 4)}</strong>
                  <span className="working__op"> · </span>
                  variance <strong data-norm-variance>{fmt(normRow.variance, 4)}</strong>
                  <span className="working__op"> → normalised to mean 0, variance 1</span>
                </p>
              ) : (
                <p className="working__line working__note">
                  Normalisation is switched off, so nothing rescales this row.
                </p>
              )}
              {stage >= 2 ? (
                <p className="working__line num" data-clipped-count>
                  <span className="working__op">ReLU clipped </span>
                  <strong>{clipped}</strong>
                  <span className="working__op">
                    {" "}
                    of {D_FF} hidden units on this row to exactly zero
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="controls">
            <div className="control">
              <p className="control__legend">Ablate</p>
              <button
                type="button"
                className="toggle"
                data-residual-toggle
                aria-pressed={residual}
                onClick={() => setResidual((on) => !on)}
              >
                residual {residual ? "on" : "off"}
              </button>
              <button
                type="button"
                className="toggle"
                data-norm-toggle
                aria-pressed={norm}
                onClick={() => setNorm((on) => !on)}
              >
                normalise {norm ? "on" : "off"}
              </button>
            </div>

            <div className="control">
              <p className="control__legend" id="spine-row-label">
                Token
              </p>
              <div className="row-picker" role="group" aria-labelledby="spine-row-label">
                {tokens.map((token, i) => (
                  <button
                    key={i}
                    type="button"
                    data-row-pick={i}
                    aria-pressed={row === i}
                    onClick={() => setRow(i)}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </ChapterFrame>
  );
}
