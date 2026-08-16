import { useReducedMotion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  assertValidAttentionRow,
  getAttentionRows,
  toDisplayPercents,
  type AttentionRow,
} from "../../lib/transformer/attentionInteraction.js";
import { TOKENS } from "../../lib/transformer/constants.js";
import { fmt } from "../../lib/transformer/format.js";
import { sequentialFill } from "../../lib/viz/ramp.js";
import {
  PHASE_DURATIONS,
  useTokenInteraction,
  type InteractionPhase,
} from "../../lib/viz/useTokenInteraction.js";

// Replaces the hero's static equation. Same relation — score every pair, turn
// scores into weights, mix — but walked in three beats a reader selects rather
// than reads off a symbol. Every number shown comes from the real forward pass
// (see `attentionInteraction.ts`); nothing here is invented for the demo.

const ROWS: AttentionRow[] = getAttentionRows();
for (const row of ROWS) assertValidAttentionRow(row);

interface Point {
  x: number;
  y: number;
}

// Every arc and the self-loop share one anchor: the selected token's
// top-centre. `MAX_BOW`/`LOOP_HEIGHT` are both kept under `--space-7` (see
// `.attn__stage`'s padding-block-start), which is the clearance reserved
// above the token row precisely so nothing drawn here can rise into the
// phase-indicator or instruction text above it.
const MAX_BOW = 56;
const LOOP_HEIGHT = 44;
const LOOP_WIDTH = 24;

/** Quadratic arc between two token centres, bowed upward so six overlapping
 * connections stay legible instead of stacking into one straight bundle. Bow
 * is capped rather than left to grow with distance, so the widest pair on a
 * wide viewport still fits the reserved clearance above the row. */
function arcPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  const bow = Math.min(MAX_BOW, Math.max(28, Math.abs(to.x - from.x) * 0.22));
  const midY = Math.min(from.y, to.y) - bow;
  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}

/** A token comparing against itself has no second point to arc toward. Starts
 * and ends at the exact same point every other arc converges on — not two
 * points either side of it — so it reads as a closed loop returning to its
 * origin instead of a chord crossing the bundle. Two Béziers bulge up-left
 * then up-right, teardrop-shaped, back to the start. */
function selfLoopPath(at: Point): string {
  const top = at.y - LOOP_HEIGHT;
  return (
    `M ${at.x} ${at.y} ` +
    `C ${at.x - LOOP_WIDTH} ${at.y - LOOP_HEIGHT * 0.6}, ${at.x - LOOP_WIDTH * 0.6} ${top}, ${at.x} ${top} ` +
    `C ${at.x + LOOP_WIDTH * 0.6} ${top}, ${at.x + LOOP_WIDTH} ${at.y - LOOP_HEIGHT * 0.6}, ${at.x} ${at.y}`
  );
}

function tokenLabel(token: string, position: number): string {
  return `${token}, position ${position}`;
}

function phaseAnnouncement(phase: InteractionPhase, token: string): string {
  switch (phase) {
    case "compare":
      return `Comparing “${token}” against all six tokens.`;
    case "weight":
      return `Turning those comparisons into attention weights.`;
    case "mix":
      return `Mixing weighted value information back into “${token}”.`;
    case "settled":
      return `Attention for “${token}” is complete. Six weights are shown. Choose another token, or replay.`;
    default:
      return "";
  }
}

export default function TokenAttentionInteraction() {
  const reducedMotion = Boolean(useReducedMotion());
  const { phase, selectedPosition, hasCompletedOnce, selectToken, replaySelectedToken } =
    useTokenInteraction();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const tokenRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [paths, setPaths] = useState<string[] | null>(null);
  const [particlePoints, setParticlePoints] = useState<(Point | null)[]>(() =>
    TOKENS.map(() => null),
  );

  const row = selectedPosition === null ? null : ROWS[selectedPosition]!;
  const percents = useMemo(() => (row ? toDisplayPercents(row.weights) : null), [row]);

  // Geometry. Recomputed on mount, once the identity-hue font metrics settle
  // (`document.fonts.ready`), and on every resize or row-wrap — a
  // `ResizeObserver` on the stage catches all three, which is why there's no
  // separate wrap-detection logic. No existing pattern in this codebase reads
  // live layout like this: every chapter figure instead draws inside a fixed
  // `viewBox`, which a six-button row that wraps on a phone can't do.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function recompute() {
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      setStageSize({ width: stageRect.width, height: stageRect.height });

      const centers = tokenRefs.current.map((node): Point => {
        if (!node) return { x: 0, y: 0 };
        const rect = node.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - stageRect.left,
          y: rect.top - stageRect.top,
        };
      });

      if (selectedPosition === null) {
        setPaths(null);
        return;
      }
      const from = centers[selectedPosition]!;
      setPaths(
        centers.map((to, i) => (i === selectedPosition ? selfLoopPath(from) : arcPath(from, to))),
      );
    }

    recompute();
    void document.fonts.ready.then(recompute);

    const observer = new ResizeObserver(recompute);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [selectedPosition]);

  // Particles ride the already-rendered connection paths with
  // `getPointAtLength`, travelling from a key token toward the selected query —
  // the direction value information actually flows. One `requestAnimationFrame`
  // loop for the whole overlay; its cleanup (on phase change or unmount) is what
  // stops a stale run's particles, mirroring how `useTokenInteraction` cancels
  // the timers behind it.
  useEffect(() => {
    if (phase !== "mix" || reducedMotion || selectedPosition === null) return;

    let frame = 0;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / PHASE_DURATIONS.mix);
      setParticlePoints(
        pathRefs.current.map((path) => {
          if (!path) return null;
          const total = path.getTotalLength();
          const point = path.getPointAtLength((1 - t) * total);
          return { x: point.x, y: point.y };
        }),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      setParticlePoints(TOKENS.map(() => null));
    };
  }, [phase, reducedMotion, selectedPosition]);

  const selectedToken = selectedPosition === null ? null : TOKENS[selectedPosition]!;
  const settled = phase === "settled" && row !== null && percents !== null;

  return (
    <div className="attn" data-viz="token-attention">
      <p className="attn__instruction">
        {hasCompletedOnce
          ? "Pick another token to see the same three steps happen again, with different numbers."
          : "Pick a token below. Watch it compare against every token, turn those comparisons into weights, then mix weighted information back in."}
      </p>

      <p className="attn__phase-indicator num" data-phase={phase} aria-hidden="true">
        {phase === "idle" ? "" : phase}
      </p>

      <div className="attn__stage" ref={stageRef} data-phase={phase}>
        <svg
          className="attn-overlay"
          viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}
          aria-hidden="true"
        >
          {paths?.map((d, i) => (
            <path
              // Keyed on selection, not just index, so React remounts every path
              // on reselect — that's what replays the draw-in animation instead
              // of it only ever running once on first mount.
              key={`${selectedPosition}-${i}`}
              ref={(node) => {
                pathRefs.current[i] = node;
              }}
              className="attn-connection"
              data-self={i === selectedPosition ? "true" : undefined}
              d={d}
              pathLength={1}
              style={{ "--w": row ? row.weights[i] : 0 } as CSSProperties}
            />
          ))}

          {phase === "mix" && !reducedMotion
            ? particlePoints.map((point, i) =>
                point && row ? (
                  <circle
                    key={i}
                    className="attn-particle"
                    cx={point.x}
                    cy={point.y}
                    r={2 + row.weights[i]! * 6}
                    style={{ "--w": row.weights[i] } as CSSProperties}
                  />
                ) : null,
              )
            : null}
        </svg>

        <ol className="attn__tokens" aria-label={`The worked example, ${TOKENS.length} tokens`}>
          {TOKENS.map((token, i) => {
            // A raw score (compare phase) isn't a weight yet, so it gets no
            // fill — only weight/mix/settled show a magnitude worth colouring.
            const showFill = row !== null && phase !== "idle" && phase !== "compare";
            const fill = showFill ? sequentialFill(row.weights[i]!) : null;

            return (
              <li key={i}>
                <button
                  type="button"
                  ref={(node) => {
                    tokenRefs.current[i] = node;
                  }}
                  className={fill ? `attn-token ${fill.className}` : "attn-token"}
                  style={fill?.style}
                  data-token={token}
                  data-position={i}
                  data-role={i === selectedPosition ? "query" : "key"}
                  aria-pressed={i === selectedPosition}
                  aria-label={tokenLabel(token, i)}
                  onClick={() => selectToken(i)}
                >
                  <span className={fill ? "attn-token__word on-fill" : "attn-token__word"}>
                    {token}
                  </span>
                  <span className={fill ? "attn-token__index num on-fill" : "attn-token__index num"}>
                    {i}
                  </span>
                  {row && phase !== "idle" ? (
                    <span
                      className={
                        fill ? "attn-token__value num on-fill" : "attn-token__value num"
                      }
                      data-metric={phase === "compare" ? "score" : "weight"}
                    >
                      {phase === "compare" ? fmt(row.rawScores[i]!) : `${percents![i]}%`}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}

          {settled ? (
            <li>
              <button
                type="button"
                className="attn-token attn__replay"
                onClick={replaySelectedToken}
              >
                Replay
              </button>
            </li>
          ) : null}
        </ol>
      </div>

      <p className="sr-only" aria-live="polite">
        {selectedToken ? phaseAnnouncement(phase, selectedToken) : ""}
      </p>
    </div>
  );
}
