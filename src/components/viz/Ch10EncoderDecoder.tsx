import { chapterById } from "../../lib/transformer/chapters.js";
import { D_FF, D_MODEL, N_HEADS, N_LAYERS, SEQ_LEN } from "../../lib/transformer/constants.js";
import { fmtShape } from "../../lib/transformer/format.js";
import { ChapterFrame } from "./ChapterFrame.tsx";

// Chapter 10. The paper's figure 1, redrawn rather than traced: boxed sublayers,
// a stacked ×N bracket and two columns are figure 1's diagrammatic grammar, but
// the blocks are semantic HTML with real links, which an SVG trace could not be.
//
// Every shape label is derived from the constants, so a block cannot claim a
// width the rest of the page doesn't have.

const CHAPTER = chapterById("10")!;

const STREAM = fmtShape([SEQ_LEN, D_MODEL]);
const SCORES = fmtShape([SEQ_LEN, SEQ_LEN]);
const HIDDEN = fmtShape([SEQ_LEN, D_FF]);

interface Block {
  label: string;
  shape: string;
  chapter?: string;
  slug?: string;
  note?: string;
  kind?: "sublayer" | "norm" | "io" | "cross";
}

const ENCODER: readonly Block[] = [
  { label: "Input embedding", shape: STREAM, chapter: "02", slug: "token-embeddings", kind: "io" },
  { label: "+ positional encoding", shape: STREAM, chapter: "03", slug: "positional-encoding", kind: "io" },
  {
    label: `Multi-head self-attention (${N_HEADS} heads)`,
    shape: SCORES,
    chapter: "07",
    slug: "multi-head-attention",
    note: "sees the whole sentence",
    kind: "sublayer",
  },
  { label: "Add & Norm", shape: STREAM, chapter: "08", slug: "residual-norm-ffn", kind: "norm" },
  { label: "Feed-forward", shape: HIDDEN, chapter: "08", slug: "residual-norm-ffn", kind: "sublayer" },
  { label: "Add & Norm", shape: STREAM, chapter: "08", slug: "residual-norm-ffn", kind: "norm" },
];

const DECODER: readonly Block[] = [
  { label: "Output embedding", shape: STREAM, chapter: "02", slug: "token-embeddings", kind: "io" },
  { label: "+ positional encoding", shape: STREAM, chapter: "03", slug: "positional-encoding", kind: "io" },
  {
    label: "Masked multi-head self-attention",
    shape: SCORES,
    chapter: "09",
    slug: "masked-attention",
    note: "cannot look ahead",
    kind: "sublayer",
  },
  { label: "Add & Norm", shape: STREAM, chapter: "08", slug: "residual-norm-ffn", kind: "norm" },
  {
    label: "Cross-attention",
    shape: SCORES,
    chapter: "05",
    slug: "scaled-dot-product",
    note: "Q from the decoder · K and V from the encoder",
    kind: "cross",
  },
  { label: "Add & Norm", shape: STREAM, chapter: "08", slug: "residual-norm-ffn", kind: "norm" },
  { label: "Feed-forward", shape: HIDDEN, chapter: "08", slug: "residual-norm-ffn", kind: "sublayer" },
  { label: "Add & Norm", shape: STREAM, chapter: "08", slug: "residual-norm-ffn", kind: "norm" },
];

function Column({
  title,
  blocks,
  side,
  lit,
}: {
  title: string;
  blocks: readonly Block[];
  side: "encoder" | "decoder";
  lit: boolean;
}) {
  return (
    <section className="stack" data-stack={side} data-lit={lit ? "true" : "false"}>
      <h3 className="stack__title">{title}</h3>
      <ol className="stack__blocks">
        {blocks.map((block, i) => (
          <li key={i}>
            <a
              className="block"
              data-block={block.label}
              data-kind={block.kind}
              href={`#${block.slug}`}
            >
              <span className="block__label">{block.label}</span>
              <span className="block__shape num" data-shape>
                {block.shape}
              </span>
              {block.note ? <span className="block__note">{block.note}</span> : null}
              <span className="sr-only">— explained in chapter {block.chapter}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="stack__bracket num" aria-label={`This stack repeats ${N_LAYERS} times`}>
        × {N_LAYERS}
      </p>
    </section>
  );
}

export default function Ch10EncoderDecoder() {
  return (
    <ChapterFrame chapter={CHAPTER} vizLabel="The encoder–decoder architecture">
      {(stage) => (
        <div className="architecture" data-architecture>
          <Column title="Encoder" blocks={ENCODER} side="encoder" lit={stage !== 1} />
          <Column title="Decoder" blocks={DECODER} side="decoder" lit={stage !== 0} />

          {stage === 2 ? (
            <p className="figure-note" data-cross-note>
              The cross-attention block is the only place the two columns meet. It is the
              same operation as every other attention block on this page — the only
              difference is where its three inputs come from.
            </p>
          ) : null}

          {stage >= 3 ? (
            <p className="figure-note" data-width-note>
              Every block above is labelled with the shape actually flowing through it, and
              the residual stream never changes width: {STREAM} in, {STREAM} out, all the way
              through. That is the property that lets {N_LAYERS} of them stack.
            </p>
          ) : null}
        </div>
      )}
    </ChapterFrame>
  );
}
