import { createEngine } from "@vive-studio/engine-core";
import { architectureRenderer } from "@vive-studio/renderer-architecture";
import { promptRenderer } from "@vive-studio/renderer-prompt";
import { reviewReportRenderer } from "@vive-studio/renderer-review-report";
import { specRenderer } from "@vive-studio/renderer-spec";

const engine = createEngine({
  renderers: {
    architecture: architectureRenderer,
    prompt: promptRenderer,
    "review-report": reviewReportRenderer,
    spec: specRenderer,
  },
});

const cardOptions = [
  {
    id: "idea-structuring",
    label: "Idea Structuring",
  },
  {
    id: "command-optimization",
    label: "Prompt Help",
  },
  {
    id: "system-architecture",
    label: "Architecture",
  },
  {
    id: "critical-review",
    label: "Critical Review",
  },
];

const reasonLabels = {
  review_intent: "기존 초안이나 결과물을 평가하는 요청으로 해석했다.",
  critical_facts_missing:
    "책임 있는 결과를 만들기 전에 꼭 필요한 정보가 비어 있다.",
  high_risk_output: "실수 비용이 큰 요청이라 바로 생성하지 않는다.",
  high_ambiguity: "방향을 잠그기 전에 먼저 확인이 필요하다.",
  high_structure_request: "구조가 큰 요청이라 한 번 더 확인하는 편이 안전하다.",
  multiple_medium_scores: "중간 수준의 불확실성과 구조 부담이 겹친다.",
  strong_renderer_mismatch:
    "선택한 카드와 실제 요청 성격이 크게 다르다.",
};

const state = {
  selectedCard: undefined,
  lastRequest: undefined,
  lastAnalyzeResult: undefined,
};

const sourceTextInput = document.querySelector("#source-text");
const analyzeButton = document.querySelector("#analyze-button");
const resetButton = document.querySelector("#reset-button");
const cardRow = document.querySelector("#card-row");

const analysisPanel = document.querySelector("#analysis-panel");
const signalGrid = document.querySelector("#signal-grid");
const reasonList = document.querySelector("#reason-list");

const clarifyPanel = document.querySelector("#clarify-panel");
const clarifyList = document.querySelector("#clarify-list");

const approvalPanel = document.querySelector("#approval-panel");
const approvalCopy = document.querySelector("#approval-copy");
const approvalActions = document.querySelector("#approval-actions");

const outputPanel = document.querySelector("#output-panel");
const outputKindCopy = document.querySelector("#output-kind-copy");
const outputTitle = document.querySelector("#output-title");
const outputStatus = document.querySelector("#output-status");
const outputBody = document.querySelector("#output-body");
const outputNotes = document.querySelector("#output-notes");

const rendererLabels = {
  prompt: "Prompt",
  spec: "Spec",
  architecture: "Architecture",
  "review-report": "Review Report",
};

const rendererDescriptions = {
  prompt: "prompt renderer가 handoff를 받아 만든 최소 출력이다.",
  spec: "spec renderer가 handoff를 받아 만든 최소 구조화 결과다.",
  architecture:
    "architecture renderer가 handoff를 받아 만든 최소 구조 설계 결과다.",
  "review-report":
    "review-report renderer가 handoff를 받아 만든 최소 검토 결과다.",
};

function renderCardButtons() {
  cardRow.replaceChildren();

  for (const option of cardOptions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card-button${
      state.selectedCard === option.id ? " is-active" : ""
    }`;
    button.textContent = option.label;
    button.addEventListener("click", () => {
      state.selectedCard =
        state.selectedCard === option.id ? undefined : option.id;
      renderCardButtons();
    });
    cardRow.append(button);
  }
}

function resetPanels() {
  analysisPanel.hidden = true;
  clarifyPanel.hidden = true;
  approvalPanel.hidden = true;
  outputPanel.hidden = true;
  approvalActions.replaceChildren();
  reasonList.replaceChildren();
  clarifyList.replaceChildren();
  outputBody.replaceChildren();
  outputNotes.replaceChildren();
}

function buildRequest() {
  return {
    source: {
      text: sourceTextInput.value.trim(),
    },
    ...(state.selectedCard ? { card_hint: state.selectedCard } : {}),
  };
}

function renderSignals(result) {
  const items = [
    ["mode_guess", result.mode_guess],
    ["provisional_renderer", result.provisional_renderer],
    ["next_step", result.next_step],
    ["approval_level", result.approval_level],
    ["ambiguity_score", String(result.ambiguity_score)],
    ["risk_score", String(result.risk_score)],
  ];

  signalGrid.replaceChildren();

  for (const [label, value] of items) {
    const card = document.createElement("dl");
    card.className = "signal-card";

    const dt = document.createElement("dt");
    dt.textContent = label;

    const dd = document.createElement("dd");
    dd.textContent = value;

    card.append(dt, dd);
    signalGrid.append(card);
  }

  reasonList.replaceChildren();

  for (const code of result.reason_codes) {
    const li = document.createElement("li");
    li.textContent = reasonLabels[code] ?? code;
    reasonList.append(li);
  }

  if (result.pivot_recommended) {
    const li = document.createElement("li");
    li.textContent =
      "현재 입력은 다른 방향에 더 잘 맞아 보이지만, 사용자 승인 없이 방향을 바꾸지는 않는다.";
    reasonList.append(li);
  }

  analysisPanel.hidden = false;
}

function renderClarify(result) {
  clarifyList.replaceChildren();

  for (const question of result.intent_ir.analysis.clarification_questions) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${question.question}</strong><br>${question.reason}`;
    clarifyList.append(li);
  }

  clarifyPanel.hidden = false;
}

function appendList(parent, items) {
  const list = document.createElement("ul");
  list.className = "detail-list";

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }

  parent.append(list);
}

function appendSection(parent, title, items) {
  const section = document.createElement("section");
  section.className = "output-section";

  const heading = document.createElement("h4");
  heading.textContent = title;
  section.append(heading);

  appendList(section, items);
  parent.append(section);
}

function renderPromptOutput(parent, output) {
  const promptBlock = document.createElement("pre");
  promptBlock.className = "output-prompt";
  promptBlock.textContent = output.prompt;
  parent.append(promptBlock);
}

function renderSpecOutput(parent, output) {
  for (const section of output.sections) {
    appendSection(parent, section.title, section.bullets);
  }
}

function renderArchitectureOutput(parent, output) {
  const boundary = document.createElement("section");
  boundary.className = "output-section";

  const boundaryHeading = document.createElement("h4");
  boundaryHeading.textContent = "System Boundary";

  const boundaryBody = document.createElement("p");
  boundaryBody.className = "output-text";
  boundaryBody.textContent = output.system_boundary;

  boundary.append(boundaryHeading, boundaryBody);
  parent.append(boundary);

  appendSection(
    parent,
    "Components",
    output.components.map(
      (component) => `${component.name}: ${component.responsibility}`,
    ),
  );

  for (const flow of output.interaction_flows) {
    appendSection(parent, flow.name, flow.steps);
  }
}

function renderReviewReportOutput(parent, output) {
  const verdict = document.createElement("section");
  verdict.className = "output-section";

  const verdictHeading = document.createElement("h4");
  verdictHeading.textContent = "Verdict";

  const verdictBody = document.createElement("p");
  verdictBody.className = "output-text";
  verdictBody.textContent = output.verdict;

  verdict.append(verdictHeading, verdictBody);
  parent.append(verdict);

  for (const finding of output.findings) {
    const section = document.createElement("section");
    section.className = "output-section";

    const heading = document.createElement("h4");
    heading.textContent = `[${finding.severity}] ${finding.title}`;

    const detail = document.createElement("p");
    detail.className = "output-text";
    detail.textContent = finding.detail;

    const recommendation = document.createElement("p");
    recommendation.className = "output-text";
    recommendation.textContent = `Recommendation: ${finding.recommendation}`;

    section.append(heading, detail, recommendation);
    parent.append(section);
  }
}

function renderOutput(engineResult) {
  const rendered = engineResult.outputs[0];

  if (!rendered) {
    return;
  }

  outputKindCopy.textContent =
    rendererDescriptions[rendered.renderer] ??
    "renderer가 handoff를 받아 만든 최소 출력이다.";
  outputTitle.textContent = rendered.output.title;
  outputStatus.textContent = `Renderer: ${
    rendererLabels[rendered.renderer] ?? rendered.renderer
  } / Validation: ${rendered.validation.status}`;
  outputBody.replaceChildren();
  outputNotes.replaceChildren();

  if (rendered.renderer === "prompt") {
    renderPromptOutput(outputBody, rendered.output);
  } else if (rendered.renderer === "spec") {
    renderSpecOutput(outputBody, rendered.output);
  } else if (rendered.renderer === "architecture") {
    renderArchitectureOutput(outputBody, rendered.output);
  } else if (rendered.renderer === "review-report") {
    renderReviewReportOutput(outputBody, rendered.output);
  }

  for (const note of rendered.output.notes) {
    const li = document.createElement("li");
    li.textContent = note;
    outputNotes.append(li);
  }

  outputPanel.hidden = false;
}

async function runRenderCycle(runOptions = {}) {
  if (!state.lastRequest) {
    return;
  }

  const engineResult = await engine.run(state.lastRequest, runOptions);

  if (engineResult.outputs.length > 0) {
    renderOutput(engineResult);
  }
}

function renderApproval(result) {
  approvalActions.replaceChildren();
  const rendererLabel =
    rendererLabels[result.provisional_renderer] ?? result.provisional_renderer;

  if (result.approval_level === "required") {
    approvalCopy.textContent =
      `이 요청은 실수 비용이 크다. 사용자 확인 없이 ${rendererLabel} renderer를 실행하지 않는다.`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button";
    button.textContent = "Confirm and Render";
    button.addEventListener("click", () => {
      runRenderCycle({
        approval: {
          required: true,
        },
      });
    });
    approvalActions.append(button);
  } else {
    approvalCopy.textContent =
      "한 번 더 확인하면 결과가 더 좋아질 가능성이 있다. 하지만 계속 진행도 선택할 수 있다.";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "primary-button";
    confirmButton.textContent = "Confirm and Continue";
    confirmButton.addEventListener("click", () => {
      runRenderCycle({
        approval: {
          recommended: true,
        },
      });
    });

    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.className = "ghost-button";
    continueButton.textContent = "Continue Anyway";
    continueButton.addEventListener("click", () => {
      runRenderCycle({
        approval: {
          recommended: true,
        },
      });
    });

    approvalActions.append(confirmButton, continueButton);
  }

  approvalPanel.hidden = false;
}

async function handleAnalyze() {
  const request = buildRequest();

  if (!request.source.text) {
    sourceTextInput.focus();
    return;
  }

  resetPanels();
  state.lastRequest = request;
  state.lastAnalyzeResult = engine.analyze(request);

  const result = state.lastAnalyzeResult;
  renderSignals(result);

  if (result.next_step === "clarify_first") {
    renderClarify(result);
    return;
  }

  if (result.next_step === "approval_pending") {
    renderApproval(result);
    return;
  }

  await runRenderCycle();
}

function resetAll() {
  state.lastRequest = undefined;
  state.lastAnalyzeResult = undefined;
  sourceTextInput.value = "";
  resetPanels();
}

analyzeButton.addEventListener("click", () => {
  handleAnalyze();
});

resetButton.addEventListener("click", () => {
  resetAll();
});

renderCardButtons();
