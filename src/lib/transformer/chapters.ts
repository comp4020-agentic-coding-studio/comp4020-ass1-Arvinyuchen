// The teaching sequence, as data.
//
// The navigation glyph, the chapter headings and the spec all read this list, so
// there is one place where the order of the argument lives. `status` is not
// decoration: chapters still being built render as inert nav entries rather than
// as links to nothing, so the page never claims to contain something it doesn't.

export type ChapterStatus = "ready" | "planned";

export interface Beat {
  /** Stable id, used for `[data-stage]` and as the scroll target. */
  id: string;
  /** The one thing this beat says. Rendered as the prose paragraph. */
  body: string;
}

export interface Chapter {
  /** Zero-padded, so `[data-chapter]` sorts lexically: "01".."11". */
  id: string;
  number: number;
  /** URL fragment. Kept separate from `id` so the anchor reads as prose. */
  slug: string;
  title: string;
  /** One sentence: what a reader knows after this chapter that they didn't
   * before. Shown as the chapter's standfirst. */
  thesis: string;
  status: ChapterStatus;
  beats: Beat[];
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "01",
    number: 1,
    slug: "sequential-vs-parallel",
    title: "One step at a time, or all at once",
    thesis:
      "A recurrent model reads token six only after it has read the five before it. Attention reads all six in one step, and pays for it in comparisons rather than in time.",
    status: "planned",
    beats: [],
  },
  {
    id: "02",
    number: 2,
    slug: "token-embeddings",
    title: "Words become vectors",
    thesis:
      "Every token is looked up in a table. Identical tokens get identical vectors — which is a problem, because our sentence contains the word “the” twice.",
    status: "planned",
    beats: [],
  },
  {
    id: "03",
    number: 3,
    slug: "positional-encoding",
    title: "Telling the two “the”s apart",
    thesis:
      "Adding a fixed pattern of sines and cosines to each embedding gives every position a different vector, without the model having to learn what order means.",
    status: "planned",
    beats: [],
  },
  {
    id: "04",
    number: 4,
    slug: "query-key-value",
    title: "Three questions about the same vector",
    thesis:
      "Each token is projected three ways: what it is looking for, what it can be found by, and what it passes on if found.",
    status: "planned",
    beats: [],
  },
  {
    id: "05",
    number: 5,
    slug: "scaled-dot-product",
    title: "Scoring every pair",
    thesis:
      "One dot product per pair of tokens gives a 6 × 6 grid of raw compatibilities. Dividing by √dₖ keeps those numbers in a range where softmax still has a gradient.",
    status: "ready",
    beats: [
      {
        id: "formula",
        body: "This is the whole mechanism, in one line. Everything in the rest of this chapter is a way of watching one of its four parts happen to real numbers.",
      },
      {
        id: "queries-and-keys",
        body: "Attention starts with two matrices you have already seen built: Q, one query vector per token, and K, one key vector per token. Both are 6 × 2 — six tokens, two dimensions each.",
      },
      {
        id: "one-score",
        body: "A single score is a single dot product. Pick a query row and a key row, multiply them element by element, and add the results. Two dimensions means two products and one sum, which you can check in your head.",
      },
      {
        id: "all-scores",
        body: "Do that for every pair and the QKᵀ term stops being notation and becomes a 6 × 6 grid: row i is how strongly token i's query matches every other token's key. It is not symmetric, because Q and K come from different projections — token 3 asking about token 5 is a different question from token 5 asking about token 3.",
      },
      {
        id: "scaling",
        body: "Now divide every cell by √dₖ. Here dₖ is 2, so that is √2 ≈ 1.4142, and every number shrinks by the same factor. Switch it off and watch what happens to the spread: large dot products push softmax toward putting almost all its weight on one token, where the gradient nearly vanishes. The division is the paper's fix, and it is the only reason the word “scaled” is in the name.",
      },
    ],
  },
  {
    id: "06",
    number: 6,
    slug: "softmax-and-values",
    title: "From scores to a weighted average",
    thesis:
      "Softmax turns one row of scores into weights that sum to one. Those weights then mix the value vectors into a single output.",
    status: "planned",
    beats: [],
  },
  {
    id: "07",
    number: 7,
    slug: "multi-head-attention",
    title: "Two heads, two kinds of question",
    thesis:
      "Running attention twice with different projections lets one head track grammatical roles while another tracks position — and neither is much use without the other.",
    status: "planned",
    beats: [],
  },
  {
    id: "08",
    number: 8,
    slug: "residual-norm-ffn",
    title: "Keeping the signal alive",
    thesis:
      "Around every sublayer sits an addition and a normalisation, and after attention comes a small feed-forward network applied to each position independently.",
    status: "planned",
    beats: [],
  },
  {
    id: "09",
    number: 9,
    slug: "masked-attention",
    title: "Not allowed to look ahead",
    thesis:
      "Setting the upper triangle of the score grid to negative infinity before softmax makes every future weight exactly zero, which is what lets a decoder generate one token at a time.",
    status: "planned",
    beats: [],
  },
  {
    id: "10",
    number: 10,
    slug: "encoder-decoder",
    title: "The architecture of the paper",
    thesis:
      "Six encoder layers, six decoder layers, and one cross-attention step where the decoder's queries meet the encoder's keys and values.",
    status: "planned",
    beats: [],
  },
  {
    id: "11",
    number: 11,
    slug: "modern-llms",
    title: "Past the paper",
    thesis:
      "The models people use today kept scaled dot-product attention and threw away half the diagram. What changed, and what did not.",
    status: "planned",
    beats: [],
  },
];

export const READY_CHAPTERS = CHAPTERS.filter((chapter) => chapter.status === "ready");

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}
