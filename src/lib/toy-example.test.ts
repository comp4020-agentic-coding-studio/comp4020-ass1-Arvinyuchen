import { describe, expect, it } from "vitest";
import {
  embed,
  feedForward,
  HEAD_COUNT,
  HEAD_DIM,
  MODEL_DIM,
  positionalEncoding,
  selfAttention,
  softmax,
  TOKENS,
} from "./toy-example";

describe("embed", () => {
  it("returns a MODEL_DIM vector for every toy token", () => {
    for (const token of TOKENS) {
      expect(embed(token)).toHaveLength(MODEL_DIM);
    }
  });
});

describe("positionalEncoding", () => {
  it("is sin on even dims and cos on odd dims, both zero-frequency at position 0", () => {
    const vec = positionalEncoding(0, MODEL_DIM);
    expect(vec).toHaveLength(MODEL_DIM);
    // sin(0) = 0 on every even dim
    expect(vec[0]).toBeCloseTo(0);
    expect(vec[2]).toBeCloseTo(0);
    // cos(0) = 1 on every odd dim
    expect(vec[1]).toBeCloseTo(1);
    expect(vec[3]).toBeCloseTo(1);
  });

  it("varies with position", () => {
    const atZero = positionalEncoding(0, MODEL_DIM);
    const atOne = positionalEncoding(1, MODEL_DIM);
    expect(atZero).not.toEqual(atOne);
  });
});

describe("softmax", () => {
  it("sums to 1 and stays within [0, 1]", () => {
    const weights = softmax([2.1, -0.4, 0.0, 1.3]);
    const total = weights.reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1);
    for (const weight of weights) {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });
});

describe("selfAttention", () => {
  it("produces attention weights that sum to 1 and lie in [0, 1], for every position and every head", () => {
    for (let position = 0; position < TOKENS.length; position++) {
      for (let head = 0; head < HEAD_COUNT; head++) {
        const { weights, output } = selfAttention(position, head);

        expect(weights).toHaveLength(TOKENS.length);
        const total = weights.reduce((sum, w) => sum + w, 0);
        expect(total).toBeCloseTo(1);
        for (const weight of weights) {
          expect(weight).toBeGreaterThanOrEqual(0);
          expect(weight).toBeLessThanOrEqual(1);
        }

        expect(output).toHaveLength(HEAD_DIM);
      }
    }
  });
});

describe("feedForward", () => {
  it("maps a MODEL_DIM vector to another MODEL_DIM vector", () => {
    const input = embed(TOKENS[0]!);
    const output = feedForward(input);
    expect(output).toHaveLength(MODEL_DIM);
  });
});
