import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { DIM_LABELS, TOKENS } from "../../lib/transformer/constants.js";
import { runForward } from "../../lib/transformer/forward.js";
import { ChapterFrame } from "./ChapterFrame.tsx";
import { Matrix } from "./primitives/Matrix.tsx";
import { StageBlock } from "./primitives/Stage.tsx";

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
          {/* Three views of one table, one at a time. Written as three blocks
              rather than a ternary chain so each has an identity: the lookup
              replaces the table rather than the table resizing into it. */}
          <StageBlock id="e" when={stage === 0}>
            <Matrix
              name="e"
              rows={pass.e}
              label="E — one row per token, looked up by word"
              rowLabels={tokens}
              colLabels={dims}
              scale="diverging"
              role="neutral"
              selectedRow={selected}
              onRow={setSelected}
            />
          </StageBlock>

          <StageBlock id="e-selected" when={stage === 1}>
            <Matrix
              name="e-selected"
              rows={[pass.e[selected]!]}
              label={`Embedding looked up for “${tokens[selected]}”`}
              rowLabels={[tokens[selected]!]}
              colLabels={dims}
              scale="diverging"
              role="neutral"
            />
          </StageBlock>

          <StageBlock id="e-collision" when={stage >= 2}>
            <Matrix
              name="e-collision"
              rows={collision.map((i) => pass.e[i]!)}
              label="The collision — two positions, one embedding"
              rowLabels={collision.map((i) => `${tokens[i]} · ${i}`)}
              colLabels={dims}
              scale="diverging"
              role="neutral"
            />
          </StageBlock>

          <StageBlock id="collision-note" when={stage === 2} order={1}>
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
          </StageBlock>

          {stage === 1 ? (
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
          ) : null}
        </>
      )}
    </ChapterFrame>
  );
}
