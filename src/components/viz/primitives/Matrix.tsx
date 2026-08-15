import type { CSSProperties } from "react";
import { fmt } from "../../../lib/transformer/format.js";
import { absMax, divergingFill, roleVar, sequentialFill, type Role } from "../../../lib/viz/ramp.js";

// Every matrix on the site is this component.
//
// It renders a real `<table>` with real header cells, not a grid of divs. That
// single decision satisfies three separate requirements at once: the data-viz
// skill's demand for a table view, its rule that colour must never be the only
// channel (the number is always present as text), and keyboard access. A
// separate "table view" toggle would have been a second rendering of the same
// numbers that could drift from the first.

export interface MatrixProps {
  /** `[data-matrix]` value — how the spec and the e2e tests address this grid. */
  name: string;
  rows: readonly (readonly number[])[];
  /** Accessible caption. Required: an unlabelled matrix is unreadable. */
  label: string;
  rowLabels?: readonly string[];
  colLabels?: readonly string[];
  /** `diverging` for signed values, `sequential` for probabilities in [0,1]. */
  scale: "diverging" | "sequential";
  /** Diverging domain half-width. Defaults to the matrix's own largest absolute
   * value; pass it explicitly to keep two grids comparable. */
  domainMax?: number;
  /** Identity hue for the frame and labels — never for the cell fill. */
  role?: Role;
  dp?: number;
  selectedRow?: number;
  selectedCol?: number;
  /** Fade rows other than `selectedRow`, for chapters that work one row at a
   * time. */
  focusRow?: boolean;
  onCell?: (row: number, col: number) => void;
  onRow?: (row: number) => void;
  /** Per-cell tooltip / accessible name. Gets the raw value. */
  describeCell?: (row: number, col: number, value: number) => string;
  className?: string;
}

export function Matrix({
  name,
  rows,
  label,
  rowLabels,
  colLabels,
  scale,
  domainMax,
  role = "neutral",
  dp,
  selectedRow,
  selectedCol,
  focusRow = false,
  onCell,
  onRow,
  describeCell,
  className,
}: MatrixProps) {
  const max = domainMax ?? absMax(rows);

  // A matrix wider than its column scrolls horizontally, which at 390px is most
  // of them. axe-core's `scrollable-region-focusable` is the reason this matters:
  // a scrollable box has to be reachable by keyboard or a keyboard-only reader
  // simply cannot see the columns past the edge. Matrices with clickable cells
  // already contain focusable content, so only the read-only ones need a stop of
  // their own — adding one to every matrix would just double the tabbing.
  const needsScrollStop = !onCell && !onRow;

  return (
    <figure
      className={`matrix${className ? ` ${className}` : ""}`}
      data-matrix={name}
      style={{ "--role": roleVar(role) } as CSSProperties}
      {...(needsScrollStop
        ? { tabIndex: 0, role: "group" as const, "aria-label": label }
        : {})}
    >
      <table data-table-view={name}>
        <caption className="matrix__caption">{label}</caption>
        {colLabels ? (
          <thead>
            <tr>
              {rowLabels ? <td className="matrix__corner" /> : null}
              {colLabels.map((text, j) => (
                <th
                  key={`${text}-${j}`}
                  scope="col"
                  className="matrix__col-head"
                  data-col={j}
                  data-selected={selectedCol === j ? "true" : "false"}
                >
                  {text}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              data-row={i}
              data-selected={selectedRow === i ? "true" : "false"}
              data-dimmed={focusRow && selectedRow !== undefined && selectedRow !== i ? "true" : "false"}
            >
              {rowLabels ? (
                <th scope="row" className="matrix__row-head">
                  {onRow ? (
                    <button
                      type="button"
                      data-row-select={i}
                      aria-pressed={selectedRow === i}
                      onClick={() => onRow(i)}
                    >
                      {rowLabels[i]}
                    </button>
                  ) : (
                    rowLabels[i]
                  )}
                </th>
              ) : null}
              {row.map((value, j) => {
                const masked = !Number.isFinite(value);
                const fill =
                  scale === "sequential" ? sequentialFill(value) : divergingFill(value, max);
                const text = fmt(value, dp);
                const description = describeCell?.(i, j, value);
                return (
                  <td
                    key={j}
                    className={`matrix__cell ${fill.className}`}
                    style={fill.style}
                    data-cell={`${i},${j}`}
                    data-value={masked ? String(value) : value.toFixed(6)}
                    data-masked={masked ? "true" : "false"}
                    data-sign={fill["data-sign"]}
                  >
                    {onCell ? (
                      <button
                        type="button"
                        className="num on-fill matrix__button"
                        aria-pressed={selectedRow === i && selectedCol === j}
                        title={description}
                        onClick={() => onCell(i, j)}
                      >
                        {text}
                      </button>
                    ) : (
                      <span className="num on-fill" title={description}>
                        {text}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
