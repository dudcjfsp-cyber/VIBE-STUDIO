import type { ValidationIssue, ValidationReport } from "@vive-studio/engine-contracts";

export function reportStatus(issues: ValidationIssue[]): ValidationReport["status"] {
  if (issues.some((issue) => issue.severity === "high")) {
    return "blocked";
  }

  if (issues.length > 0) {
    return "review";
  }

  return "ready";
}
