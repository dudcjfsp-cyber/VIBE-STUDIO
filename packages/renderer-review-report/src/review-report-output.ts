export type ReviewSeverity = "high" | "medium" | "low";

export type ReviewFinding = {
  severity: ReviewSeverity;
  title: string;
  detail: string;
  recommendation: string;
};

export type ReviewReportOutput = {
  title: string;
  verdict: "needs-revision" | "usable-with-fixes";
  findings: ReviewFinding[];
  notes: string[];
};
