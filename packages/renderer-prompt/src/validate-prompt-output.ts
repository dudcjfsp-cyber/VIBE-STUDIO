import type {
  ValidationIssue,
  ValidationReport,
} from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";

export function validatePromptOutput(
  output: PromptOutput,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!output.title.trim()) {
    issues.push({
      code: "prompt_output.title_missing",
      severity: "medium",
      message: "Prompt output should include a title.",
      path: "title",
      scope: "output",
    });
  }

  if (!output.prompt.trim()) {
    issues.push({
      code: "prompt_output.prompt_missing",
      severity: "high",
      message: "Prompt output must include prompt text.",
      path: "prompt",
      scope: "output",
    });
  }

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
