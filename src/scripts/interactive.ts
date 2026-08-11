import { STAGES, type StageId } from "../lib/stages";
import { TOKENS, positionalEncoding, selfAttention } from "../lib/toy-example";

function fmt(n: number): string {
  return n.toFixed(2);
}

function setActiveStage(stageId: StageId): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(
    '[data-testid="interaction-trigger"] [role="tab"]',
  );
  for (const tab of tabs) {
    tab.setAttribute("aria-selected", tab.dataset.stage === stageId ? "true" : "false");
  }

  const panels = document.querySelectorAll<HTMLElement>("[data-stage-panel]");
  for (const panel of panels) {
    const isActive = panel.dataset.stage === stageId;
    if (isActive) {
      panel.removeAttribute("hidden");
      panel.setAttribute("aria-hidden", "false");
    } else {
      panel.setAttribute("hidden", "");
      panel.setAttribute("aria-hidden", "true");
    }
  }

  const blocks = document.querySelectorAll<HTMLElement>("[data-diagram-block]");
  for (const block of blocks) {
    block.setAttribute(
      "data-active",
      block.dataset.diagramBlock === stageId ? "true" : "false",
    );
  }

  const stageIndex = STAGES.findIndex((stage) => stage.id === stageId);
  const stage = STAGES[stageIndex];
  const status = document.querySelector("[aria-live='polite']");
  if (status && stage) {
    status.textContent = `Step ${stageIndex + 1} of ${STAGES.length}: ${stage.title}`;
  }
}

function initStepper(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(
    '[data-testid="interaction-trigger"] [role="tab"]',
  );
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const stageId = tab.dataset.stage as StageId | undefined;
      if (stageId) setActiveStage(stageId);
    });
  }
}

function initPositionSlider(): void {
  const slider = document.querySelector<HTMLInputElement>("#position-slider");
  const valueLabel = document.querySelector("[data-position-value]");
  const tokenLabel = document.querySelector("[data-position-token]");
  const vectorText = document.querySelector("[data-position-vector]");
  if (!slider || !valueLabel || !tokenLabel || !vectorText) return;

  slider.addEventListener("input", () => {
    const position = Number(slider.value);
    valueLabel.textContent = `${position}`;
    tokenLabel.textContent = TOKENS[position] ?? "";
    const vector = positionalEncoding(position);
    // The "Encoding vector" label is markup now; this element holds only the numbers.
    vectorText.textContent = `[${vector.map(fmt).join(", ")}]`;
  });
}

function initAttentionControls(): void {
  const tokenButtons = document.querySelectorAll<HTMLButtonElement>("[data-token]");
  const headButtons = document.querySelectorAll<HTMLButtonElement>("[data-head]");
  if (tokenButtons.length === 0 || headButtons.length === 0) return;

  let currentToken = TOKENS.indexOf(
    (tokenButtons[0]!.dataset.token as (typeof TOKENS)[number]) ?? TOKENS[0]!,
  );
  let currentHead = Number(headButtons[0]!.dataset.head ?? "0");

  function render(): void {
    const { weights } = selfAttention(currentToken, currentHead);
    for (let i = 0; i < weights.length; i++) {
      const cell = document.querySelector<HTMLElement>(`[data-weight-cell="${i}"]`);
      if (!cell) continue;
      cell.textContent = fmt(weights[i]!);
      cell.style.setProperty("--weight", fmt(weights[i]!));
    }
  }

  for (const button of tokenButtons) {
    button.addEventListener("click", () => {
      const token = button.dataset.token as (typeof TOKENS)[number] | undefined;
      if (!token) return;
      currentToken = TOKENS.indexOf(token);
      for (const b of tokenButtons) {
        b.setAttribute("aria-pressed", b === button ? "true" : "false");
      }
      render();
    });
  }

  for (const button of headButtons) {
    button.addEventListener("click", () => {
      currentHead = Number(button.dataset.head ?? "0");
      for (const b of headButtons) {
        b.setAttribute("aria-pressed", b === button ? "true" : "false");
      }
      render();
    });
  }
}

/*
 * At the full viewBox a phone renders the encoder labels at ~8px, because half the
 * canvas is spent on the decoder mirror. Below the split, crop to the encoder column
 * so the same box shows the one thing this page is about, at a readable size.
 */
const FULL_VIEW_BOX = "16 56 624 480";
const ENCODER_VIEW_BOX = "16 110 330 425";

function initResponsiveDiagram(): void {
  const svg = document.querySelector<SVGSVGElement>("svg.diagram");
  if (!svg) return;

  const narrow = window.matchMedia("(max-width: 899px)");
  const apply = (): void => {
    svg.setAttribute("viewBox", narrow.matches ? ENCODER_VIEW_BOX : FULL_VIEW_BOX);
  };
  apply();
  narrow.addEventListener("change", apply);
}

initStepper();
initPositionSlider();
initAttentionControls();
initResponsiveDiagram();
