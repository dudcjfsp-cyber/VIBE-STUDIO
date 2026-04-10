import type { Renderer } from "@vive-studio/engine-contracts";

import type { ReviewReportOutput } from "./review-report-output.js";
import { renderReviewReport } from "./render-review-report.js";
import { validateReviewReportOutput } from "./validate-review-report-output.js";

export type {
  ReviewFinding,
  ReviewReportOutput,
  ReviewSeverity,
} from "./review-report-output.js";
export { renderReviewReport } from "./render-review-report.js";
export { validateReviewReportOutput } from "./validate-review-report-output.js";

export const reviewReportRenderer: Renderer<ReviewReportOutput> = {
  id: "review-report",
  render: renderReviewReport,
  validateOutput: validateReviewReportOutput,
};
