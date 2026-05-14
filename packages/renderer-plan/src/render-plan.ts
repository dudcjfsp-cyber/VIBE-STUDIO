import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { PlanOutput, PlanSection } from "./plan-output.js";

function normalizeSectionText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildCoreSections(handoff: RendererHandoff): PlanSection[] {
  const { intent_ir: intentIr } = handoff;
  const sections: PlanSection[] = [];
  const goalText = intentIr.intent.goal.trim();
  const contextText = intentIr.intent.context.trim();

  sections.push({
    title: "아이디어 요약",
    bullets: [intentIr.summary],
  });

  sections.push({
    title: "해결하려는 문제",
    bullets: [goalText],
  });

  sections.push({
    title: "핵심 사용자",
    bullets: [
      intentIr.intent.audience.trim() || "핵심 사용자는 아직 구체화되지 않았습니다.",
    ],
  });

  if (
    contextText &&
    normalizeSectionText(contextText) !== normalizeSectionText(goalText)
  ) {
    sections.push({
      title: "맥락",
      bullets: [contextText],
    });
  }

  const directionBullets: string[] = [];

  if (intentIr.output_contract.constraints.length > 0) {
    directionBullets.push(
      ...intentIr.output_contract.constraints.map(
        (constraint) => `제약: ${constraint}`,
      ),
    );
  }

  if (intentIr.output_contract.success_criteria.length > 0) {
    directionBullets.push(
      ...intentIr.output_contract.success_criteria.map(
        (criterion) => `성공 기준: ${criterion}`,
      ),
    );
  }

  if (directionBullets.length === 0) {
    directionBullets.push("범위와 성공 기준은 한 번 더 다듬을 여지가 있습니다.");
  }

  sections.push({
    title: "초기 방향",
    bullets: directionBullets,
  });

  sections.push({
    title: "처음 버전 범위",
    bullets: buildScopeBullets(handoff),
  });

  sections.push({
    title: "필요한 결정",
    bullets: buildDecisionBullets(handoff),
  });

  const openQuestionBullets =
    intentIr.analysis.missing_information.length > 0
      ? intentIr.analysis.missing_information.map(formatMissingInformation)
      : intentIr.analysis.clarification_questions.map(
          (question) => question.question,
        );

  if (openQuestionBullets.length > 0) {
    sections.push({
      title: "열린 질문",
      bullets: openQuestionBullets,
    });
  }

  sections.push({
    title: "다음 대화 질문",
    bullets: buildNextConversationQuestions(handoff),
  });

  const riskBullets = [
    ...intentIr.analysis.risks,
    ...intentIr.analysis.assumptions.map(
      (assumption) => `가정: ${assumption}`,
    ),
  ];

  if (riskBullets.length > 0) {
    sections.push({
      title: "리스크와 가정",
      bullets: riskBullets,
    });
  }

  return sections;
}

function buildScopeBullets(handoff: RendererHandoff): string[] {
  const { intent_ir: intentIr } = handoff;
  const bullets: string[] = [];

  bullets.push("처음에는 핵심 문제, 대상 사용자, 성공 기준을 먼저 잠그는 것이 좋습니다.");

  if (intentIr.output_contract.constraints.length > 0) {
    bullets.push(
      `이미 주어진 제약은 처음 버전의 경계로 둡니다: ${intentIr.output_contract.constraints.join(", ")}`,
    );
  }

  if (intentIr.output_contract.success_criteria.length > 0) {
    bullets.push(
      `처음 검증 기준은 다음 항목에서 시작합니다: ${intentIr.output_contract.success_criteria.join(", ")}`,
    );
  }

  if (bullets.length === 1) {
    bullets.push("기능을 늘리기보다, 가장 작은 사용 흐름 하나가 성립하는지 먼저 확인합니다.");
  }

  return bullets;
}

function buildDecisionBullets(handoff: RendererHandoff): string[] {
  const { intent_ir: intentIr } = handoff;
  const decisions = intentIr.analysis.missing_information.map((item) =>
    formatMissingInformationAsDecision(item),
  );

  if (!intentIr.intent.audience.trim()) {
    decisions.push("누구를 첫 사용자로 볼지 정해야 합니다.");
  }

  if (intentIr.output_contract.success_criteria.length === 0) {
    decisions.push("무엇을 성공으로 볼지 최소 기준을 정해야 합니다.");
  }

  if (decisions.length === 0) {
    decisions.push("지금 정한 방향으로 먼저 초안을 만들지, 추가 질문으로 범위를 더 좁힐지 선택해야 합니다.");
  }

  return dedupe(decisions);
}

function buildNextConversationQuestions(handoff: RendererHandoff): string[] {
  const { intent_ir: intentIr } = handoff;
  const questions = intentIr.analysis.clarification_questions.map(
    (question) => question.question,
  );

  if (!intentIr.intent.audience.trim()) {
    questions.push("이 결과를 가장 먼저 써 볼 사람은 누구인가요?");
  }

  if (intentIr.output_contract.success_criteria.length === 0) {
    questions.push("어떤 상태가 되면 이번 작업이 성공했다고 볼 수 있나요?");
  }

  if (questions.length === 0) {
    questions.push("이 초안을 바로 실행용으로 다듬을까요, 아니면 먼저 범위를 더 좁힐까요?");
  }

  return dedupe(questions);
}

function formatMissingInformation(value: string): string {
  switch (value) {
    case "architecture.boundary":
      return "시스템 경계와 포함할 기능 범위를 더 정하면 좋습니다.";
    case "architecture.focus":
      return "구조 설계에서 먼저 볼 초점이 더 필요합니다.";
    case "plan.problem_or_scope":
      return "해결하려는 문제와 처음 버전의 범위를 더 정하면 좋습니다.";
    case "prompt.goal":
      return "프롬프트가 달성해야 할 목표와 사용 상황을 더 정하면 좋습니다.";
    case "review.artifact":
      return "검토할 원문이나 초안이 더 필요합니다.";
    default:
      return value;
  }
}

function formatMissingInformationAsDecision(value: string): string {
  switch (value) {
    case "architecture.boundary":
      return "시스템에 포함할 것과 제외할 것을 정해야 합니다.";
    case "architecture.focus":
      return "구조에서 먼저 볼 초점을 정해야 합니다.";
    case "plan.problem_or_scope":
      return "해결하려는 문제와 처음 버전의 범위를 정해야 합니다.";
    case "prompt.goal":
      return "프롬프트가 달성해야 할 목표와 사용 상황을 정해야 합니다.";
    case "review.artifact":
      return "검토할 원문이나 초안을 먼저 정해야 합니다.";
    default:
      return value;
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function renderPlan(handoff: RendererHandoff): PlanOutput {
  return {
    title: "기획 정리 초안",
    sections: buildCoreSections(handoff),
    notes: [
      `Mode: ${handoff.intent_ir.mode}`,
      `Recommended renderer: ${handoff.intent_ir.intent.output_kind}`,
      `Confidence: ${handoff.intent_ir.signals.confidence}`,
      "Planning focus: 문제, 대상, 범위, 결정, 다음 질문을 분리해 바로 실행보다 먼저 생각의 순서를 잡았습니다.",
      "Fallback: deterministic planning template",
    ],
  };
}
