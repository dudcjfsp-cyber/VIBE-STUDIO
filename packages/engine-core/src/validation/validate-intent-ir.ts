import type { IntentIr, ValidationIssue, ValidationReport } from "@vive-studio/engine-contracts";

import { reportStatus } from "./validation-helpers.js";

export function validateIntentIr(intentIr: IntentIr): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!intentIr.summary.trim()) {
    issues.push({
      code: "intent_ir.summary_missing",
      severity: "high",
      message: "Intent IR summary is required.",
      path: "summary",
      scope: "analysis",
    });
  }

  if (!intentIr.intent.goal.trim()) {
    issues.push({
      code: "intent_ir.goal_missing",
      severity: "high",
      message: "Intent IR goal is required.",
      path: "intent.goal",
      scope: "analysis",
    });
  }

  if (
    intentIr.signals.needs_clarification &&
    intentIr.analysis.clarification_questions.length === 0
  ) {
    issues.push({
      code: "intent_ir.questions_missing",
      severity: "medium",
      message: "Intent IR needs clarification questions when clarification is required.",
      path: "analysis.clarification_questions",
      scope: "analysis",
    });
  }

  return {
    status: reportStatus(issues),
    issues,
    suggested_questions: intentIr.analysis.clarification_questions,
  };
}
