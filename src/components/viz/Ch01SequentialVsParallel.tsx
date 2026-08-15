import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { SEQ_LEN, TOKENS } from "../../lib/transformer/constants.js";
import { ChapterFrame } from "./ChapterFrame.tsx";

// Chapter 1. The only chapter with no model arithmetic in it — the claim is about
// the shape of the computation, not about any particular numbers, so the figures
// are derived from the sequence length alone.

const CHAPTER = chapterById("01")!;
const MAX_N = 24;

export default function Ch01SequentialVsParallel() {
  // Annotated, because `TOKENS` is a const tuple so `SEQ_LEN` has the literal
  // type 6 and the state would otherwise refuse any other length.
  const [n, setN] = useState<number>(SEQ_LEN);

  // The two quantities the chapter is actually about.
  const recurrentSteps = n;
  const recurrentPath = n - 1; // hops from the first token to the last
  const attentionPath = 1;
  const comparisons = n * n;

  const labels = Array.from({ length: n }, (_, i) => (i < SEQ_LEN ? TOKENS[i]! : `w${i}`));

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="Recurrence against attention">
      {(stage) => (
        <div className="lanes" data-lanes>
          <section className="lane" data-lane="recurrent" data-lit={stage <= 1 ? "true" : "false"}>
            <h3 className="lane__title">One at a time</h3>
            <ol className="lane__track">
              {labels.map((label, i) => (
                <li key={i} className="lane__node" data-node={i}>
                  <span className="lane__word">{label}</span>
                  {i < n - 1 ? (
                    <span className="lane__hop" aria-hidden="true">
                      →
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <dl className="lane__stats">
              <div>
                <dt>Sequential steps</dt>
                <dd className="num" data-recurrent-steps>
                  {recurrentSteps}
                </dd>
              </div>
              <div>
                <dt>Longest path between two words</dt>
                <dd className="num" data-recurrent-path>
                  {recurrentPath}
                </dd>
              </div>
            </dl>
          </section>

          <section className="lane" data-lane="attention" data-lit={stage >= 2 ? "true" : "false"}>
            <h3 className="lane__title">All at once</h3>
            <ol className="lane__track lane__track--flat">
              {labels.map((label, i) => (
                <li key={i} className="lane__node" data-node={i}>
                  <span className="lane__word">{label}</span>
                </li>
              ))}
            </ol>
            <dl className="lane__stats">
              <div>
                <dt>Sequential steps</dt>
                <dd className="num" data-attention-steps>
                  1
                </dd>
              </div>
              <div>
                <dt>Longest path between two words</dt>
                <dd className="num" data-attention-path>
                  {attentionPath}
                </dd>
              </div>
              <div>
                <dt>Pairs compared</dt>
                <dd className="num" data-comparisons>
                  {comparisons}
                </dd>
              </div>
            </dl>
          </section>

          <div className="controls">
            <label className="control" htmlFor="seq-len">
              <span className="control__legend">Sentence length</span>
              <input
                id="seq-len"
                type="range"
                min={SEQ_LEN}
                max={MAX_N}
                step={1}
                value={n}
                data-seq-len
                onChange={(event) => setN(Number(event.target.value))}
              />
              <output className="num" htmlFor="seq-len">
                {n} words
              </output>
            </label>
          </div>

          <p className="figure-note">
            At {n} words, recurrence needs {recurrentSteps} steps in order and carries
            information up to {recurrentPath} hops; attention needs one step and{" "}
            {comparisons} comparisons. That is the trade the paper makes.
          </p>
        </div>
      )}
    </ChapterFrame>
  );
}
