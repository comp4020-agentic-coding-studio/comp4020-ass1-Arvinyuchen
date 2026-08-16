import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { D_MODEL, DIM_LABELS, TOKENS } from "../../lib/transformer/constants.js";
import { scaledDotTerms } from "../../lib/transformer/derive.js";
import { runForward } from "../../lib/transformer/forward.js";
import { transpose } from "../../lib/transformer/linalg.js";
import { HEADS } from "../../lib/transformer/weights.js";
import type { Role } from "../../lib/viz/ramp.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";
import { TermExpansion } from "./primitives/TermExpansion.tsx";
import { StageBlock } from "./primitives/Stage.tsx";

const CHAPTER = chapterById("04")!;
const KD = ["dim 0", "dim 1"] as const;

type Which = "q" | "k" | "v";

const LANES: readonly { key: Which; role: Role; weight: "wq" | "wk" | "wv"; caption: string }[] = [
  { key: "q", role: "query", weight: "wq", caption: "Q — what each token is looking for" },
  { key: "k", role: "key", weight: "wk", caption: "K — what each token can be found by" },
  { key: "v", role: "value", weight: "wv", caption: "V — what each token hands over" },
];

export default function Ch04QueryKeyValue() {
  const pass = runForward();
  const head = pass.heads[0]!;
  const weights = HEADS[0]!;

  const [which, setWhich] = useState<Which>("q");
  const [row, setRow] = useState(2);
  const [col, setCol] = useState(0);

  const tokens = [...TOKENS];
  const dims = [...DIM_LABELS];

  const lane = LANES.find((l) => l.key === which)!;
  const weightMatrix = weights[lane.weight];
  const output = which === "q" ? head.q : which === "k" ? head.k : head.v;

  // The working is `X row · W column`, so the column has to be pulled out of the
  // weight matrix — divisor 1 because a projection is a plain dot product.
  const weightColumn = transpose(weightMatrix)[col]!;
  const expansion = scaledDotTerms(pass.x[row]!, weightColumn, 1);

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Query, key and value projections">
      {(stage) => (
        <>
          {/* The whole-lane view and the single-cell derivation are two blocks
              rather than the two arms of a ternary, so moving between them is a
              replacement with a direction rather than a resize. */}
          <StageBlock id="lanes" when={stage === 0}>
            <div className="pair">
              {LANES.map((l) => (
                <Matrix
                  key={l.key}
                  name={l.key}
                  rows={l.key === "q" ? head.q : l.key === "k" ? head.k : head.v}
                  label={l.caption}
                  rowLabels={tokens}
                  colLabels={[...KD]}
                  scale="diverging"
                  role={l.role}
                />
              ))}
            </div>
          </StageBlock>

          <StageBlock id="projection" when={stage === 1}>
            <div className="projection" data-projection={which}>
              <Matrix
                name="x"
                rows={pass.x}
                label="X — embedding plus position"
                rowLabels={tokens}
                colLabels={dims}
                scale="diverging"
                role="neutral"
                selectedRow={row}
                focusRow
                onRow={setRow}
              />

              <p className="projection__op math" aria-hidden="true">
                ×
              </p>

              <Matrix
                name={`w-${which}`}
                rows={weightMatrix}
                label={`W_${which.toUpperCase()} — ${D_MODEL} in, 2 out`}
                rowLabels={dims}
                colLabels={[...KD]}
                scale="diverging"
                domainMax={1}
                role={lane.role}
                selectedCol={col}
              />

              <p className="projection__op math" aria-hidden="true">
                =
              </p>

              <Matrix
                name={which}
                rows={output}
                label={lane.caption}
                rowLabels={tokens}
                colLabels={[...KD]}
                scale="diverging"
                role={lane.role}
                selectedRow={row}
                selectedCol={col}
                onCell={(i, j) => {
                  setRow(i);
                  setCol(j);
                }}
              />
            </div>
          </StageBlock>

          <StageBlock id="projection-detail" when={stage >= 2}>
            <div className="projection projection--compact" data-projection={which}>
              <Matrix
                name="x-selected"
                rows={[pass.x[row]!]}
                label={`X row for “${tokens[row]}”`}
                rowLabels={[tokens[row]!]}
                colLabels={dims}
                scale="diverging"
                role="neutral"
              />

              <p className="projection__op math" aria-hidden="true">×</p>

              <Matrix
                name={`w-${which}-column`}
                rows={weightColumn.map((value) => [value])}
                label={`Column ${col} of W_${which.toUpperCase()}`}
                rowLabels={dims}
                colLabels={[KD[col]!]}
                scale="diverging"
                domainMax={1}
                role={lane.role}
              />

              <p className="projection__op math" aria-hidden="true">=</p>

              <Matrix
                name={`${which}-selected`}
                rows={[[output[row]![col]!]]}
                label="One projected value"
                rowLabels={[tokens[row]!]}
                colLabels={[KD[col]!]}
                scale="diverging"
                role={lane.role}
              />
            </div>
          </StageBlock>

          <StageBlock id="working" when={stage === 2} order={1}>
            <TermExpansion
              expansion={expansion}
              aTex={String.raw`X_{\mathrm{${tokens[row]}}}`}
              bTex={String.raw`W^{${which.toUpperCase()}}_{\,${col}}`}
              divisorTex="1"
              scaled={false}
            />
          </StageBlock>

          <div className="controls">
            <div className="control">
              <p className="control__legend" id="lane-picker-label">
                Projection
              </p>
              <div className="row-picker" role="group" aria-labelledby="lane-picker-label">
                {LANES.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    data-lane-select={l.key}
                    aria-pressed={which === l.key}
                    onClick={() => setWhich(l.key)}
                  >
                    {l.key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="control">
              <p className="control__legend" id="qkv-token-label">
                Token
              </p>
              <div className="row-picker" role="group" aria-labelledby="qkv-token-label">
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
