import type {
  ValidationIssue,
  ValidationReport,
} from "@vive-studio/engine-contracts";

import type { ReviewReportOutput } from "./review-report-output.js";

export function validateReviewReportOutput(
  output: ReviewReportOutput,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  if (!output.title.trim()) {
    issues.push({
      code: "review_report_output.title_missing",
      severity: "medium",
      message: "Review report output should include a title.",
      path: "title",
      scope: "output",
    });
  }

  if (output.findings.length === 0) {
    issues.push({
      code: "review_report_output.findings_missing",
      severity: "high",
      message: "Review report must include at least one finding.",
      path: "findings",
      scope: "output",
    });
  }

  output.findings.forEach((finding, index) => {
    if (!finding.title.trim()) {
      issues.push({
        code: "review_report_output.finding_title_missing",
        severity: "medium",
        message: "Each review finding should have a title.",
        path: `findings.${index}.title`,
        scope: "output",
      });
    }

    if (!finding.detail.trim()) {
      issues.push({
        code: "review_report_output.finding_detail_missing",
        severity: "high",
        message: "Each review finding must explain the issue.",
        path: `findings.${index}.detail`,
        scope: "output",
      });
    }

    if (!finding.recommendation.trim()) {
      issues.push({
        code: "review_report_output.finding_recommendation_missing",
        severity: "high",
        message: "Each review finding must include a recommendation.",
        path: `findings.${index}.recommendation`,
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
