import type {
  ValidationIssue,
  ValidationReport,
} from "@vive-studio/engine-contracts";

import type { PlanOutput } from "./plan-output.js";

export function validatePlanOutput(output: PlanOutput): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!output.title.trim()) {
    issues.push({
      code: "plan_output.title_missing",
      severity: "medium",
      message: "Plan output should include a title.",
      path: "title",
      scope: "output",
    });
  }

  if (output.sections.length < 3) {
    issues.push({
      code: "plan_output.sections_too_small",
      severity: "high",
      message: "Plan output must include enough sections to explain the plan.",
      path: "sections",
      scope: "output",
    });
  }

  output.sections.forEach((section, index) => {
    if (!section.title.trim()) {
      issues.push({
        code: "plan_output.section_title_missing",
        severity: "medium",
        message: "Each plan section should have a title.",
        path: `sections.${index}.title`,
        scope: "output",
      });
    }

    if (section.bullets.length === 0) {
      issues.push({
        code: "plan_output.section_bullets_missing",
        severity: "high",
        message: "Each plan section must contain at least one bullet.",
        path: `sections.${index}.bullets`,
        scope: "output",
      });
    }
  });

  return {
    status:
      issues.some((issue) => issue.severity === "high")
        ? "blocked"
        : issues.length > 0
          ? "review"
          : "ready",
    issues,
    suggested_questions: [],
  };
}
