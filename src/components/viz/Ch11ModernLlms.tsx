import { useState } from "react";
import { chapterById } from "../../lib/transformer/chapters.js";
import { ChapterFrame } from "./ChapterFrame.tsx";

// Chapter 11, and the one place the page steps outside the paper.
//
// Everything here is hedged on purpose. The 2017 architecture is a fixed
// document that can be checked; "what modern models do" is a moving set of
// choices that differ between models and change between releases. So each row
// says what it replaced and why that direction was taken, and none of them claims
// a particular model does a particular thing. Getting this wrong in the
// confident direction would undermine the ten chapters that can be checked.

const CHAPTER = chapterById("11")!;

interface Change {
  id: string;
  from: string;
  to: string;
  why: string;
}

const CHANGES: readonly Change[] = [
  {
    id: "decoder-only",
    from: "Encoder and decoder, with cross-attention joining them",
    to: "Decoder only — the encoder and the cross-attention sublayer removed",
    why: "One stack that predicts the next token generalises to almost any task if the task is described in the input, so the second stack stopped paying for itself.",
  },
  {
    id: "pre-norm",
    from: "Normalise after the sublayer and the residual addition (post-norm)",
    to: "Normalise the input to each sublayer instead (pre-norm)",
    why: "Post-norm sits directly on the residual path, which makes very deep stacks hard to train without a warmup schedule. Moving it off that path is what made depth routine.",
  },
  {
    id: "rope",
    from: "A fixed sinusoid added to the embedding once, at the bottom",
    to: "Position applied by rotating Q and K inside each attention step",
    why: "Rotating the query and key encodes how far apart two tokens are directly in their dot product, rather than hoping an added offset survives every layer.",
  },
  {
    id: "gated-ffn",
    from: "Two linear layers with ReLU between them",
    to: "A gated variant, where one branch multiplies another",
    why: "For the same parameter budget a gated activation reliably fits better. This is an empirical result rather than a principled one.",
  },
  {
    id: "grouped-kv",
    from: "One key and value projection per query head",
    to: "Several query heads sharing a smaller number of key/value heads",
    why: "During generation the keys and values of every previous token are held in memory, and that cache — not the arithmetic — is the bottleneck. Sharing them shrinks it.",
  },
  {
    id: "rms-norm",
    from: "Subtract the mean, divide by the standard deviation",
    to: "Divide by the root mean square, without centring",
    why: "The mean subtraction turned out to contribute little, and dropping it removes work from a step that runs twice per layer.",
  },
];

const SURVIVES: readonly string[] = [
  "Scaled dot-product attention — the equation in chapter 5, unchanged",
  "Multiple heads over different projections",
  "A residual connection around every sublayer",
  "A normalisation step (moved, and often simplified, but still there)",
  "A position-wise feed-forward network wider than the stream",
  "Causal masking, for anything that generates",
];

export default function Ch11ModernLlms() {
  const [on, setOn] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="2017 against current practice">
      {(stage) => (
        <div className="beyond" data-beyond>
          <p className="beyond__flag" data-beyond-flag>
            Beyond the paper — everything below this point is later practice, not the 2017
            document.
          </p>

          {stage >= 1 ? (
            <ul className="diff" data-diff>
              {CHANGES.map((change) => {
                const active = on.has(change.id);
                return (
                  <li key={change.id} className="diff__row" data-change={change.id} data-on={active}>
                    <button
                      type="button"
                      className="toggle diff__toggle"
                      data-change-toggle={change.id}
                      aria-pressed={active}
                      aria-expanded={active}
                      onClick={() => toggle(change.id)}
                    >
                      {active ? change.to : change.from}
                    </button>
                    {active ? (
                      <p className="diff__why" data-why={change.id}>
                        {change.why}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {stage >= 1 ? (
            <p className="figure-note" data-hedge>
              {on.size === 0
                ? "Nothing switched on yet — this is the 2017 architecture."
                : `${on.size} of ${CHANGES.length} switched on.`}{" "}
              These are widespread directions rather than a specification: which of them any
              particular model uses is a question about that model, and worth checking
              rather than assuming.
            </p>
          ) : null}

          {stage >= 2 ? (
            <section className="survives" data-survives>
              <h3 className="survives__title">What did not change</h3>
              <ul>
                {SURVIVES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="figure-note">
                Which is why the equation at the top of this page is still worth being able
                to read.
              </p>
            </section>
          ) : null}
        </div>
      )}
    </ChapterFrame>
  );
}
