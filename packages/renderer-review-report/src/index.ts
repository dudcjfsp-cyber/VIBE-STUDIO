import type { Renderer } from "@vive-studio/engine-contracts";

import type { ReviewReportOutput } from "./review-report-output.js";
import { createReviewReportRenderer } from "./create-review-report-renderer.js";
import { renderReviewReport } from "./render-review-report.js";
import { validateReviewReportOutput } from "./validate-review-report-output.js";

export type {
  CreateReviewReportRendererOptions,
  StructuredObjectGenerationRequest,
  StructuredObjectGenerator,
} from "./create-review-report-renderer.js";
export type {
  ReviewFinding,
  ReviewReportOutput,
  ReviewSeverity,
} from "./review-report-output.js";
export { createReviewReportRenderer } from "./create-review-report-renderer.js";
export { renderReviewReport } from "./render-review-report.js";
export { validateReviewReportOutput } from "./validate-review-report-output.js";

export const reviewReportRenderer: Renderer<ReviewReportOutput> =
  createReviewReportRenderer();
