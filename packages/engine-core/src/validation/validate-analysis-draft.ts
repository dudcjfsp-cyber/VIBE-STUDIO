import type { AnalysisDraft, ValidationIssue, ValidationReport } from "@vive-studio/engine-contracts";

import { reportStatus } from "./validation-helpers.js";

export function validateAnalysisDraft(
  draft: AnalysisDraft,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!draft.summary.trim()) {
    issues.push({
      code: "analysis.summary_missing",
      severity: "high",
      message: "Analysis summary is required.",
      path: "summary",
      scope: "analysis",
    });
  }

  if (!draft.intent.goal.trim()) {
    issues.push({
      code: "analysis.goal_missing",
      severity: "high",
      message: "Analysis goal is required.",
      path: "intent.goal",
      scope: "analysis",
    });
  }

  if (
    draft.missing_information.length > 0 &&
    draft.candidate_questions.length === 0
  ) {
    issues.push({
      code: "analysis.questions_missing",
      severity: "medium",
      message: "Missing information should map to clarification questions.",
      path: "candidate_questions",
      scope: "analysis",
    });
  }

  return {
    status: reportStatus(issues),
    issues,
    suggested_questions: draft.candidate_questions,
  };
}
