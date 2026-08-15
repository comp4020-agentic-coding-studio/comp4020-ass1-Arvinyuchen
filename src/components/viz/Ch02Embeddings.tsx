import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { DIM_LABELS, TOKENS } from "../../lib/transformer/constants.js";
import { runForward } from "../../lib/transformer/forward.js";
import { fmt } from "../../lib/transformer/format.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";

const CHAPTER = chapterById("02")!;

export default function Ch02Embeddings() {
  const pass = runForward();
  const [selected, setSelected] = useState(2); // `chased`
  const tokens = [...TOKENS];
  const dims = [...DIM_LABELS];

  // The two identical rows, found rather than asserted: this is the chapter's
  // whole point, so it is computed from the matrix on screen.
  const collision = pass.e
    .map((row, i) => ({ i, key: row.join(",") }))
    .filter((entry, _, all) => all.some((other) => other.i !== entry.i && other.key === entry.key))
    .map((entry) => entry.i);

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="The embedding table">
      {(stage) => (
        <>
          <Matrix
            name="e"
            rows={pass.e}
            label="E — one row per token, looked up by word"
            rowLabels={tokens}
            colLabels={dims}
            scale="diverging"
            role="neutral"
            selectedRow={selected}
            focusRow={stage >= 1}
            onRow={setSelected}
          />

          {stage >= 1 ? (
            <div className="readout" data-token-readout>
              <p className="readout__head">
                <strong>{tokens[selected]}</strong> at position {selected}
              </p>
              <dl className="readout__dims">
                {pass.e[selected]!.map((value, d) => (
                  <div key={d}>
                    <dt>{dims[d]}</dt>
                    <dd className="num" data-dim={d}>
                      {fmt(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {stage >= 2 ? (
            <p className="figure-note" data-collision>
              Rows{" "}
              {collision.map((i, k) => (
                <span key={i}>
                  {k > 0 ? " and " : ""}
                  <strong className="num">{i}</strong>
                </span>
              ))}{" "}
              are identical — both are “{tokens[collision[0] ?? 0]}”. Nothing downstream can
              tell them apart yet.
            </p>
          ) : null}

          <div className="controls">
            <div className="control">
              <p className="control__legend" id="token-picker-label">
                Token
              </p>
              <div className="row-picker" role="group" aria-labelledby="token-picker-label">
                {tokens.map((token, i) => (
                  <button
                    key={i}
                    type="button"
                    data-token-select={i}
                    aria-pressed={selected === i}
                    onClick={() => setSelected(i)}
                  >
                    {token}
                    <span className="sr-only"> at position {i}</span>
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
