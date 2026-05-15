export type ReviewSeverity = "high" | "medium" | "low";

export type ReviewFinding = {
  severity: ReviewSeverity;
  title: string;
  detail: string;
  recommendation: string;
};

export type ReviewActionRecommendation = {
  next_step: "revise_now" | "clarify_first";
  reason: string;
};

export type ReviewReportOutput = {
  title: string;
  verdict: "needs-revision" | "usable-with-fixes";
  strengths: string[];
  weak_points: string[];
  missing_assumptions: string[];
  risky_assumptions: string[];
  improvement_priorities: string[];
  action_recommendation: ReviewActionRecommendation;
  findings: ReviewFinding[];
  notes: string[];
};
