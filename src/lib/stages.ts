export type StageId =
  | "embedding"
  | "positional-encoding"
  | "self-attention"
  | "feed-forward";

export interface Stage {
  id: StageId;
  title: string;
  diagramLabel: string;
  description: string;
}

// Order here is the tab order, the panel order, and the diagram highlight
// order. One diagram block per stage (see CLAUDE.md's data-* vocabulary) —
// no stage maps to more than one block, and no block is shared by two stages.
export const STAGES: Stage[] = [
  {
    id: "embedding",
    title: "Input embedding",
    diagramLabel: "Embedding",
    description:
      "Each token in the toy sentence is looked up in a fixed embedding table and becomes a vector.",
  },
  {
    id: "positional-encoding",
    title: "Positional encoding",
    diagramLabel: "Positional encoding",
    description:
      "A sinusoidal vector, one per position, is added to the embedding so word order survives.",
  },
  {
    id: "self-attention",
    title: "Self-attention",
    diagramLabel: "Multi-head attention",
    description:
      "Each token queries every other token and takes a weighted average of their values.",
  },
  {
    id: "feed-forward",
    title: "Feed-forward",
    diagramLabel: "Feed forward",
    description:
      "The attention output for each position is passed through the same small two-layer network.",
  },
];

export const STAGE_IDS: StageId[] = STAGES.map((stage) => stage.id);
