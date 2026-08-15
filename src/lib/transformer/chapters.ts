// The teaching sequence, as data.
//
// The navigation glyph, the chapter headings and the spec all read this list, so
// there is one place where the order of the argument lives. `status` is not
// decoration: a chapter still being built renders as an inert nav entry rather
// than a link to nothing, so the page never claims to contain something it
// doesn't.
//
// Prose lives here as plain strings and is rendered as text — there is no
// markdown step, so notation has to be written as the characters it should
// appear as (dₖ, not d_k).

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
      "A recurrent model reads the sixth word only after it has read the five before it. Attention reads all six at once, and pays for it in comparisons rather than in time.",
    status: "ready",
    beats: [
      {
        id: "recurrent",
        body: "Before this paper, the standard way to read a sentence was one word at a time, carrying a hidden state forward. To get information from the first word to the last, it has to be passed hand to hand through every word in between.",
      },
      {
        id: "path-length",
        body: "That hand-to-hand passing is the problem. The number of steps between two words grows with the distance between them, and each step is a chance to lose what was being carried. It also means the work cannot be spread across a machine: step five cannot start until step four has finished.",
      },
      {
        id: "parallel",
        body: "Attention throws out the chain. Every word is compared directly with every other word, in one step, so the distance between any two words is always one. Nothing is carried, so nothing is dropped along the way.",
      },
      {
        id: "cost",
        body: "This is a trade, not a free win. The chain does work proportional to the number of words; comparing every pair does work proportional to that number squared. Drag the slider — the chain's depth grows in a straight line while attention's stays at one, but watch the comparison count climb.",
      },
    ],
  },
  {
    id: "02",
    number: 2,
    slug: "token-embeddings",
    title: "Words become vectors",
    thesis:
      "Every token is looked up in a table of vectors. Identical tokens get identical vectors — which is a problem, because this sentence contains the word “the” twice.",
    status: "ready",
    beats: [
      {
        id: "lookup",
        body: "A model cannot multiply a word. The first thing that happens to “chased” is that it is replaced by a row of numbers, looked up from a table with one row per word in the vocabulary.",
      },
      {
        id: "dimensions",
        body: "In the paper each row is 512 numbers long. Here it is four, and each of the four was chosen to mean something so that the table can be read: how determiner-like the word is, how noun-like, how action-like, and a size or modifier axis. Click a token to see its row on its own.",
      },
      {
        id: "collision",
        body: "Now look at rows 0 and 3. They are not merely similar, they are identical — the same four numbers, because the lookup is by word and both words are “the”. At this point in the pipeline the model has no way at all to tell the first “the” from the second, and no amount of later arithmetic can invent a difference that is not in the input.",
      },
    ],
  },
  {
    id: "03",
    number: 3,
    slug: "positional-encoding",
    title: "Telling the two “the”s apart",
    thesis:
      "Adding a fixed pattern of sines and cosines to each embedding gives every position its own vector, without the model having to learn what order means.",
    status: "ready",
    beats: [
      {
        id: "problem",
        body: "The fix has to distinguish positions without destroying meaning, and it should work for sentences longer than any the model was trained on. The paper's answer is to add a fixed pattern that depends only on position.",
      },
      {
        id: "sinusoids",
        body: "The pattern is built from sine and cosine waves at different frequencies. Each pair of dimensions gets its own wavelength: the first pair cycles once per position, the next a hundred times more slowly. Drag the position scrubber and watch the sampled dots move along the curves.",
      },
      {
        id: "sum",
        body: "The positional vector is simply added to the embedding, element by element. Nothing is concatenated and nothing is replaced — position rides along inside the same four numbers that carry meaning.",
      },
      {
        id: "resolved",
        body: "Switch the addition off and on. With it off, rows 0 and 3 are the identical “the” rows from the last chapter. With it on they differ, and all six positions now have a vector no other position has. This is the matrix every remaining chapter starts from.",
      },
    ],
  },
  {
    id: "04",
    number: 4,
    slug: "query-key-value",
    title: "Three questions about the same vector",
    thesis:
      "Each token is projected three ways: what it is looking for, what it can be found by, and what it hands over when it is found.",
    status: "ready",
    beats: [
      {
        id: "three-roles",
        body: "Attention needs each token to play three separate parts. As a query it asks a question; as a key it advertises what it can answer; as a value it carries the content it contributes if it is picked. One vector cannot do all three at once, so three are made from it.",
      },
      {
        id: "projection",
        body: "Each is made by multiplying the token's row by a small matrix — one for queries, one for keys, one for values. In a real model these are the learned parameters. Here they are hand-picked and mostly zeros, so you can read straight off which dimensions each one looks at.",
      },
      {
        id: "verify",
        body: "Click any cell in Q, K or V and the working appears beneath: four products, one per input dimension, and their sum. Notice the narrowing from four columns to two — each projection throws information away, and that is what makes the three copies genuinely different rather than three names for one thing.",
      },
    ],
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
        body: "Now divide every cell by √dₖ. Here dₖ is 2, so that is √2 ≈ 1.4142, and every number shrinks by the same factor. Switch it off and watch the spread: large dot products push softmax towards putting almost all its weight on one token, where the gradient nearly vanishes. The division is the paper's fix, and it is the only reason the word “scaled” is in the name.",
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
    status: "ready",
    beats: [
      {
        id: "one-row",
        body: "Take one row of the score grid — one token's view of the whole sentence. Six numbers, some of them negative, on no particular scale. To use them as a mixture they have to become proportions.",
      },
      {
        id: "exponentiate",
        body: "Softmax does that in three steps. Subtract the largest score from every score, so the biggest becomes zero and nothing overflows. Exponentiate, which makes everything positive and stretches the gaps. Then divide by the total.",
      },
      {
        id: "sums-to-one",
        body: "The result is a distribution: six weights, none negative, adding to exactly 1.00. This is the row of numbers people are pointing at when they say a model “attends to” a word.",
      },
      {
        id: "aggregate",
        body: "Now the weights get used. Each token's value vector is multiplied by that token's weight, and the six scaled vectors are added together. The result is one vector, and it is the output of attention for this token.",
      },
      {
        id: "temperature",
        body: "The temperature slider divides the scores before softmax, which is exactly what √dₖ did in the last chapter. Push it low and the distribution collapses onto one token; push it high and it flattens towards a plain average. The row sums to one at every setting.",
      },
    ],
  },
  {
    id: "07",
    number: 7,
    slug: "multi-head-attention",
    title: "Two heads, two kinds of question",
    thesis:
      "Running attention twice with different projections lets one head track grammatical roles while the other tracks position — and neither is much use on its own.",
    status: "ready",
    beats: [
      {
        id: "two-heads",
        body: "Everything so far used one set of Q, K and V projections. The paper runs several in parallel, each with its own matrices, over the same input. It uses eight; there are two here, so that two heads of two dimensions each rebuild the four-wide stream exactly.",
      },
      {
        id: "syntax-head",
        body: "The first head scores nouns against modifiers and actions against nouns. It works: “chased” attends most to “mouse”, its object, and then to “cat”, its subject. “mouse” attends to “small”. A grammatical relation, found by nothing but a dot product.",
      },
      {
        id: "the-failure",
        body: "It also gets one badly wrong. “cat” attends to “small” — a modifier belonging to “mouse”, three words away. This head has no notion of distance, so it picks the strongest modifier anywhere in the sentence. That is not a flaw in the example; it is what one head is like.",
      },
      {
        id: "position-head",
        body: "The second head does nothing but position. Because the first two dimensions carry the fastest sine and cosine pair, a dot product between two of them depends mostly on how far apart the tokens are — so every query in this head lands on itself or an immediate neighbour. Useless alone, and exactly what the first head was missing.",
      },
      {
        id: "concat",
        body: "The two outputs are concatenated back into four columns and multiplied by one more matrix, W_O, which lets the model mix what the heads found. That is all “multi-head” means: run it more than once on different projections, and join the answers up.",
      },
    ],
  },
  {
    id: "08",
    number: 8,
    slug: "residual-norm-ffn",
    title: "Keeping the signal alive",
    thesis:
      "Around every sublayer sits an addition and a normalisation, and after attention comes a small network applied to each position separately.",
    status: "ready",
    beats: [
      {
        id: "residual",
        body: "Attention's output does not replace the token's vector — it is added to it. The original is still in there, which is what lets six of these layers stack without the input being washed away. Switch the addition off and watch the input vanish from the result.",
      },
      {
        id: "normalise",
        body: "Then each row is normalised: subtract the row's mean, divide by its standard deviation. The mean and variance shown are computed from the row directly above them, and every row comes out centred on zero with a variance of one, whatever went in.",
      },
      {
        id: "feed-forward",
        body: "Next, the same two-layer network is applied to every position independently. It widens four dimensions to eight, clips everything negative to zero, and narrows back to four. The clipped entries are marked — that hard floor at zero is the only non-linear thing in the entire layer.",
      },
      {
        id: "again",
        body: "Then the same add-and-normalise happens again, around the feed-forward network. Attention, add, normalise, feed-forward, add, normalise: that is one layer, and the paper stacks six of them.",
      },
    ],
  },
  {
    id: "09",
    number: 9,
    slug: "masked-attention",
    title: "Not allowed to look ahead",
    thesis:
      "Setting the upper triangle of the score grid to negative infinity before softmax makes every future weight exactly zero — which is what lets a decoder write one word at a time.",
    status: "ready",
    beats: [
      {
        id: "why",
        body: "A model that generates text has to be trained on the task it will actually perform: predict the next word from the words so far. If it can see the whole sentence while learning, it can read the answer off the input, and it will have learned nothing worth having.",
      },
      {
        id: "the-mask",
        body: "The fix is blunt. Take the same score grid from chapter 5 and, before softmax, replace everything above the diagonal with negative infinity. Nothing else about the operation changes.",
      },
      {
        id: "exact-zeros",
        body: "Negative infinity exponentiates to exactly zero, so those weights are not merely small — they are zero, and the rows still sum to one. Row 0 becomes a single 1.00 in the first column: the first token has nowhere to look but itself.",
      },
      {
        id: "generation",
        body: "Drag the generation step. At step k only the first k + 1 rows exist, because that is genuinely all the model has written so far. The triangle is not a decoration on the diagram; it is the shape of writing left to right.",
      },
    ],
  },
  {
    id: "10",
    number: 10,
    slug: "encoder-decoder",
    title: "The architecture of the paper",
    thesis:
      "Six encoder layers, six decoder layers, and one step where the decoder's queries meet the encoder's keys and values.",
    status: "ready",
    beats: [
      {
        id: "encoder",
        body: "The left column is the encoder. Embed, add position, then six identical layers of exactly what chapter 8 described. Its job is to turn the source sentence into a representation, and every layer sees the whole sentence at once.",
      },
      {
        id: "decoder",
        body: "The right column is the decoder, and it has three sublayers rather than two. First masked self-attention over what has been written so far — chapter 9. Then a second attention step. Then the feed-forward network.",
      },
      {
        id: "cross-attention",
        body: "That middle sublayer is the join, and the only place the two halves touch. The queries come from the decoder; the keys and values come from the encoder's output. The question is asked by the translation and answered by the source — the same operation as everywhere else, with its inputs drawn from two different places.",
      },
      {
        id: "shapes",
        body: "Every block is labelled with the shape actually flowing through it, derived from this page's constants rather than written on by hand. Nothing changes width: the residual stream is four wide from the embedding to the output, and that is what makes stacking possible. Click a block to jump back to the chapter that explained it.",
      },
    ],
  },
  {
    id: "11",
    number: 11,
    slug: "modern-llms",
    title: "Past the paper",
    thesis:
      "The models people use today kept scaled dot-product attention and deleted half the diagram. Here is what changed, and what did not.",
    status: "ready",
    beats: [
      {
        id: "decoder-only",
        body: "The biggest change is a deletion. Most of the well-known language models today keep only the right-hand column, with the cross-attention sublayer removed: a stack of masked self-attention and feed-forward layers, and no encoder at all. Translation stops being an architecture and becomes something you ask for in the prompt.",
      },
      {
        id: "changes",
        body: "Several other pieces have commonly been replaced since 2017. Toggle each one to see where it sits and what it displaced. These are widespread choices rather than universal ones — which of them a particular model uses is a question about that model, and worth checking rather than assuming.",
      },
      {
        id: "unchanged",
        body: "What survived is the part this page spent nine chapters on. Scaled dot-product attention is unchanged. Multiple heads, unchanged. Residual connections around every sublayer, a normalisation step, a position-wise feed-forward network, causal masking: all still there. The 2017 equation is still the equation.",
      },
    ],
  },
];

export const READY_CHAPTERS = CHAPTERS.filter((chapter) => chapter.status === "ready");

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}
