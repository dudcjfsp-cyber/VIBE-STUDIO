import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { PlanOutput, PlanSection } from "./plan-output.js";

function buildCoreSections(handoff: RendererHandoff): PlanSection[] {
  const { intent_ir: intentIr } = handoff;
  const sections: PlanSection[] = [];

  sections.push({
    title: "아이디어 요약",
    bullets: [intentIr.summary],
  });

  sections.push({
    title: "해결하려는 문제",
    bullets: [intentIr.intent.goal.trim()],
  });

  sections.push({
    title: "핵심 사용자",
    bullets: [
      intentIr.intent.audience.trim() || "핵심 사용자는 아직 구체화되지 않았습니다.",
    ],
  });

  if (intentIr.intent.context.trim()) {
    sections.push({
      title: "맥락",
      bullets: [intentIr.intent.context.trim()],
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

  const openQuestionBullets =
    intentIr.analysis.missing_information.length > 0
      ? intentIr.analysis.missing_information
      : intentIr.analysis.clarification_questions.map(
          (question) => question.question,
        );

  if (openQuestionBullets.length > 0) {
    sections.push({
      title: "열린 질문",
      bullets: openQuestionBullets,
    });
  }

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

export function renderPlan(handoff: RendererHandoff): PlanOutput {
  return {
    title: "기획 정리 초안",
    sections: buildCoreSections(handoff),
    notes: [
      `Mode: ${handoff.intent_ir.mode}`,
      `Recommended renderer: ${handoff.intent_ir.intent.output_kind}`,
      `Confidence: ${handoff.intent_ir.signals.confidence}`,
      "Fallback: deterministic planning template",
    ],
  };
}
