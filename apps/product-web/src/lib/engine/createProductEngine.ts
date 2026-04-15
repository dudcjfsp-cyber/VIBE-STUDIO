import { createEngine } from "@vive-studio/engine-core";
import { architectureRenderer } from "@vive-studio/renderer-architecture";
import { planRenderer } from "@vive-studio/renderer-plan";
import { promptRenderer } from "@vive-studio/renderer-prompt";
import { reviewReportRenderer } from "@vive-studio/renderer-review-report";

export const productEngine = createEngine({
  renderers: {
    architecture: architectureRenderer,
    plan: planRenderer,
    prompt: promptRenderer,
    "review-report": reviewReportRenderer,
  },
});
