import type { ValidationReport } from "@vive-studio/engine-contracts";

export function mergeValidationReports(
  reports: ValidationReport[],
): ValidationReport {
  const status =
    reports.some((report) => report.status === "blocked")
      ? "blocked"
      : reports.some((report) => report.status === "review")
        ? "review"
        : "ready";

  return {
    status,
    issues: reports.flatMap((report) => report.issues),
    suggested_questions: reports.flatMap(
      (report) => report.suggested_questions,
    ),
  };
}
