import { describe, expect, it } from "vitest";
import { D_K, D_MODEL, N_HEADS, SCALE, SEQ_LEN, TOKENS } from "./constants.js";
import {
  aggregationTerms,
  dotTerms,
  expansionAgrees,
  scaledDotTerms,
  softmaxTerms,
} from "./derive.js";
import { runForward } from "./forward.js";
import { fmt } from "./format.js";
import { argmax, dot, layerNorm, matmul, relu, softmax, transpose } from "./linalg.js";
import { positionalEncoding } from "./positional.js";

const pass = runForward();

describe("linalg", () => {
  it("multiplies matrices with the inner dimension contracted", () => {
    const a = [
      [1, 2],
      [3, 4],
    ];
    const b = [
      [5, 6, 7],
      [8, 9, 10],
    ];
    expect(matmul(a, b)).toEqual([
      [21, 24, 27],
      [47, 54, 61],
    ]);
  });

  it("transposes", () => {
    expect(
      transpose([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it("softmaxes to a distribution", () => {
    const out = softmax([1, 2, 3, -1]);
    expect(out.reduce((sum, v) => sum + v, 0)).toBeCloseTo(1, 12);
    for (const value of out) expect(value).toBeGreaterThan(0);
    expect(argmax(out)).toBe(2);
  });

  it("is unaffected by the stability shift", () => {
    // Adding a constant to every score must not change the distribution — which
    // is the licence for subtracting the max before exponentiating.
    const plain = softmax([0.5, -0.25, 2]);
    const shifted = softmax([100.5, 99.75, 102]);
    plain.forEach((value, i) => expect(shifted[i]!).toBeCloseTo(value, 12));
  });

  it("layer-normalises to zero mean and unit variance", () => {
    const { out, mean, variance } = layerNorm([1, 2, 3, 10]);
    expect(mean).toBeCloseTo(4, 12);
    expect(variance).toBeGreaterThan(0);
    const outMean = out.reduce((sum, v) => sum + v, 0) / out.length;
    const outVar = out.reduce((sum, v) => sum + (v - outMean) ** 2, 0) / out.length;
    expect(outMean).toBeCloseTo(0, 9);
    expect(outVar).toBeCloseTo(1, 9);
  });

  it("clips negatives to exactly zero", () => {
    expect(relu([-1, -0.001, 0, 0.5])).toEqual([0, 0, 0, 0.5]);
  });
});

describe("positional encoding", () => {
  // An independent transcription of the paper's equation, written out longhand
  // rather than reusing the implementation, so the test can disagree with it.
  function paperFormula(pos: number, i: number, dModel: number): number {
    const pair = Math.floor(i / 2);
    const angle = pos / 10000 ** ((2 * pair) / dModel);
    return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  }

  it("matches the paper's formula for every position and dimension", () => {
    for (let pos = 0; pos < SEQ_LEN; pos++) {
      const computed = positionalEncoding(pos);
      for (let i = 0; i < D_MODEL; i++) {
        expect(computed[i]!).toBeCloseTo(paperFormula(pos, i, D_MODEL), 4);
      }
    }
  });

  it("starts at sin 0 / cos 0", () => {
    expect(positionalEncoding(0)).toEqual([0, 1, 0, 1]);
  });

  it("gives every position a different vector", () => {
    const seen = new Set(pass.pe.map((row) => row.join(",")));
    expect(seen.size).toBe(SEQ_LEN);
  });
});

describe("the worked example's shape", () => {
  it("is six tokens wide", () => {
    expect(TOKENS).toHaveLength(6);
    expect(SEQ_LEN).toBe(6);
  });

  it("splits d_model into whole heads", () => {
    expect(N_HEADS * D_K).toBe(D_MODEL);
  });

  it("scales by √d_k", () => {
    expect(SCALE).toBeCloseTo(Math.SQRT2, 12);
  });
});

describe("embeddings vs positions", () => {
  it("gives both `the`s an identical embedding", () => {
    expect(TOKENS[0]).toBe("the");
    expect(TOKENS[3]).toBe("the");
    expect(pass.e[0]).toEqual(pass.e[3]);
  });

  it("pulls them apart once position is added", () => {
    // This is chapter 3's entire claim, so it is asserted rather than described.
    expect(pass.x[0]).not.toEqual(pass.x[3]);
  });

  it("renders them as different strings, not just different floats", () => {
    // A difference smaller than the display precision would be a lie on screen.
    const row = (r: readonly number[]) => r.map((v) => fmt(v)).join(",");
    expect(row(pass.x[0]!)).not.toBe(row(pass.x[3]!));
  });
});

describe("the displayed working matches the displayed matrices", () => {
  // The site's central promise. Every visualisation renders `derive.ts` output
  // instead of formatting its own arithmetic, so this property is the guarantee
  // that the working under a cell adds up to the cell.
  it("expands every q·k pair in the example to its own dot product", () => {
    for (const head of pass.heads) {
      for (let i = 0; i < SEQ_LEN; i++) {
        for (let j = 0; j < SEQ_LEN; j++) {
          expect(expansionAgrees(head.q[i]!, head.k[j]!)).toBe(true);
        }
      }
    }
  });

  it("produces one term per input dimension", () => {
    const expansion = dotTerms(pass.heads[0]!.q[0]!, pass.heads[0]!.k[1]!);
    expect(expansion.terms).toHaveLength(D_K);
    for (const term of expansion.terms) {
      expect(term.product).toBeCloseTo(term.a * term.b, 12);
    }
  });

  it("lands the scaled expansion on the score cell the grid shows", () => {
    const head = pass.heads[0]!;
    for (let i = 0; i < SEQ_LEN; i++) {
      for (let j = 0; j < SEQ_LEN; j++) {
        const expansion = scaledDotTerms(head.q[i]!, head.k[j]!, SCALE);
        expect(expansion.scaled).toBeCloseTo(head.scores[i]![j]!, 12);
        expect(expansion.sum).toBeCloseTo(head.rawScores[i]![j]!, 12);
      }
    }
  });

  it("expands softmax into steps that reproduce the weights", () => {
    const head = pass.heads[0]!;
    for (let i = 0; i < SEQ_LEN; i++) {
      const expansion = softmaxTerms(head.scores[i]!);
      expect(expansion.weightSum).toBeCloseTo(1, 12);
      expansion.steps.forEach((step, j) => {
        expect(step.shifted).toBeCloseTo(step.score - expansion.max, 12);
        expect(step.exp).toBeCloseTo(Math.exp(step.shifted), 12);
        expect(step.weight).toBeCloseTo(head.weights[i]![j]!, 12);
      });
      expect(expansion.total).toBeCloseTo(
        expansion.steps.reduce((sum, step) => sum + step.exp, 0),
        12,
      );
    }
  });

  it("expands the weighted value sum into the output vector", () => {
    const head = pass.heads[0]!;
    for (let i = 0; i < SEQ_LEN; i++) {
      const expansion = aggregationTerms(head.weights[i]!, head.v);
      expect(expansion.dims).toHaveLength(head.v[0]!.length);
      expansion.dims.forEach((entry) => {
        expect(entry.sum).toBeCloseTo(head.out[i]![entry.dim]!, 12);
        expect(entry.terms).toHaveLength(SEQ_LEN);
      });
    }
  });
});

describe("scaled dot-product attention", () => {
  it("divides the raw scores by exactly √d_k", () => {
    for (const head of pass.heads) {
      for (let i = 0; i < SEQ_LEN; i++) {
        for (let j = 0; j < SEQ_LEN; j++) {
          expect(head.scores[i]![j]!).toBeCloseTo(head.rawScores[i]![j]! / SCALE, 12);
        }
      }
    }
  });

  it("computes each raw score as q·k", () => {
    for (const head of pass.heads) {
      for (let i = 0; i < SEQ_LEN; i++) {
        for (let j = 0; j < SEQ_LEN; j++) {
          expect(head.rawScores[i]![j]!).toBeCloseTo(dot(head.q[i]!, head.k[j]!), 12);
        }
      }
    }
  });

  it("is not symmetric", () => {
    // Q and K use different projections, so QKᵀ must not be symmetric. A
    // symmetric grid would teach the reader that attention is mutual, which is
    // exactly the misconception the masked-decoder chapter has to undo.
    for (const head of pass.heads) {
      const symmetric = head.scores.every((row, i) =>
        row.every((value, j) => Math.abs(value - head.scores[j]![i]!) < 1e-12),
      );
      expect(symmetric).toBe(false);
    }
  });

  it("gives every query row a distribution", () => {
    for (const head of pass.heads) {
      for (const row of head.weights) {
        expect(row.reduce((sum, v) => sum + v, 0)).toBeCloseTo(1, 9);
        for (const value of row) expect(value).toBeGreaterThan(0);
      }
    }
  });
});

describe("what each head actually attends to", () => {
  // Chapter 7 states these relations on screen. They are computed consequences
  // of the hand-authored weights, so they are asserted here — a caption that
  // claims a pattern the numbers don't have is the failure mode this prevents.
  const syntax = pass.heads[0]!;
  const position = pass.heads[1]!;

  it("labels the heads in the order the chapters introduce them", () => {
    expect(syntax.label).toBe("syntax");
    expect(position.label).toBe("position");
  });

  it("has the syntax head send `chased` to its object `mouse`", () => {
    expect(TOKENS[2]).toBe("chased");
    expect(syntax.argmaxPerRow[2]).toBe(5);
    expect(TOKENS[5]).toBe("mouse");
  });

  it("has the syntax head rank `cat`, the subject, second for `chased`", () => {
    const row = [...syntax.weights[2]!];
    const order = row
      .map((weight, index) => ({ weight, index }))
      .sort((a, b) => b.weight - a.weight);
    expect(order[0]!.index).toBe(5); // mouse — the object
    expect(order[1]!.index).toBe(1); // cat — the subject
  });

  it("has the syntax head send `mouse` to its modifier `small`", () => {
    expect(syntax.argmaxPerRow[5]).toBe(4);
    expect(TOKENS[4]).toBe("small");
  });

  it("has the syntax head get `cat` wrong, which is why a second head exists", () => {
    // `cat` attends to `small`, a modifier that belongs to `mouse`. The head has
    // no notion of distance, so it picks the strongest modifier anywhere. Kept
    // deliberately; chapter 7 is built on it.
    expect(syntax.argmaxPerRow[1]).toBe(4);
  });

  it("keeps every position-head query within one token of itself", () => {
    position.argmaxPerRow.forEach((j, i) => {
      expect(Math.abs(j - i)).toBeLessThanOrEqual(1);
    });
  });

  it("makes the two heads attend differently", () => {
    expect(syntax.weights).not.toEqual(position.weights);
  });
});

describe("causal masking", () => {
  it("zeroes everything after the current token, exactly", () => {
    for (const head of pass.heads) {
      head.maskedWeights.forEach((row, i) => {
        row.forEach((value, j) => {
          if (j > i) expect(value).toBe(0);
          else expect(value).toBeGreaterThan(0);
        });
      });
    }
  });

  it("still leaves each row a distribution", () => {
    for (const head of pass.heads) {
      for (const row of head.maskedWeights) {
        expect(row.reduce((sum, v) => sum + v, 0)).toBeCloseTo(1, 9);
      }
    }
  });

  it("gives the first token nowhere to look but itself", () => {
    for (const head of pass.heads) {
      expect(head.maskedWeights[0]).toEqual([1, 0, 0, 0, 0, 0]);
    }
  });

  it("uses −∞ rather than a large negative number", () => {
    // `Math.exp(-1e9)` is merely very small; only −∞ exponentiates to exactly 0,
    // and chapter 9 asserts exact zeros.
    expect(pass.heads[0]!.maskedScores[0]![1]).toBe(-Infinity);
  });
});

describe("the rest of the layer", () => {
  it("concatenates the heads back to the residual width", () => {
    expect(pass.concat[0]).toHaveLength(N_HEADS * D_K);
    expect(pass.concat[0]).toHaveLength(D_MODEL);
    pass.concat.forEach((row, i) => {
      expect(row.slice(0, D_K)).toEqual(pass.heads[0]!.out[i]);
      expect(row.slice(D_K)).toEqual(pass.heads[1]!.out[i]);
    });
  });

  it("keeps every tensor at the residual width after W_O", () => {
    for (const row of pass.attnOut) expect(row).toHaveLength(D_MODEL);
    for (const row of pass.ffnOut) expect(row).toHaveLength(D_MODEL);
  });

  it("adds the residual rather than replacing the stream", () => {
    pass.residual1.forEach((row, i) => {
      row.forEach((value, d) => {
        expect(value).toBeCloseTo(pass.x[i]![d]! + pass.attnOut[i]![d]!, 12);
      });
    });
  });

  it("normalises every row to zero mean and unit variance", () => {
    for (const result of [...pass.norm1, ...pass.norm2]) {
      const mean = result.out.reduce((sum, v) => sum + v, 0) / result.out.length;
      const variance =
        result.out.reduce((sum, v) => sum + (v - mean) ** 2, 0) / result.out.length;
      expect(mean).toBeCloseTo(0, 9);
      expect(variance).toBeCloseTo(1, 9);
    }
  });

  it("reports the mean and variance it actually used", () => {
    pass.norm1.forEach((result, i) => {
      const row = pass.residual1[i]!;
      const mean = row.reduce((sum, v) => sum + v, 0) / row.length;
      expect(result.mean).toBeCloseTo(mean, 12);
    });
  });

  it("clips at least one feed-forward entry to zero, so the ReLU is visible", () => {
    const clipped = pass.ffnPreRelu.flat().filter((value) => value < 0);
    expect(clipped.length).toBeGreaterThan(0);
    pass.ffnHidden.forEach((row, i) => {
      row.forEach((value, j) => {
        if (pass.ffnPreRelu[i]![j]! < 0) expect(value).toBe(0);
      });
    });
  });
});
