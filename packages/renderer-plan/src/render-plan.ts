import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { PlanOutput, PlanSection } from "./plan-output.js";

function buildCoreSections(handoff: RendererHandoff): PlanSection[] {
  const { intent_ir: intentIr } = handoff;
  const sections: PlanSection[] = [];

  sections.push({
    title: "Idea Summary",
    bullets: [intentIr.summary],
  });

  sections.push({
    title: "Problem To Solve",
    bullets: [intentIr.intent.goal.trim()],
  });

  sections.push({
    title: "Target User",
    bullets: [
      intentIr.intent.audience.trim() || "Target user is not specified yet.",
    ],
  });

  if (intentIr.intent.context.trim()) {
    sections.push({
      title: "Context",
      bullets: [intentIr.intent.context.trim()],
    });
  }

  const directionBullets: string[] = [];

  if (intentIr.output_contract.constraints.length > 0) {
    directionBullets.push(
      ...intentIr.output_contract.constraints.map(
        (constraint) => `Constraint: ${constraint}`,
      ),
    );
  }

  if (intentIr.output_contract.success_criteria.length > 0) {
    directionBullets.push(
      ...intentIr.output_contract.success_criteria.map(
        (criterion) => `Success criterion: ${criterion}`,
      ),
    );
  }

  if (directionBullets.length === 0) {
    directionBullets.push("Scope and success criteria need further refinement.");
  }

  sections.push({
    title: "Initial Direction",
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
      title: "Open Questions",
      bullets: openQuestionBullets,
    });
  }

  const riskBullets = [
    ...intentIr.analysis.risks,
    ...intentIr.analysis.assumptions.map(
      (assumption) => `Assumption: ${assumption}`,
    ),
  ];

  if (riskBullets.length > 0) {
    sections.push({
      title: "Risks And Assumptions",
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
