import { createEngine } from "@vive-studio/engine-core";
import { architectureRenderer } from "@vive-studio/renderer-architecture";
import { planRenderer, type PlanOutput } from "@vive-studio/renderer-plan";
import { promptRenderer, type PromptOutput } from "@vive-studio/renderer-prompt";
import { reviewReportRenderer } from "@vive-studio/renderer-review-report";
import type { Renderer } from "@vive-studio/engine-contracts";

type ProductEngineOptions = {
  renderers?: {
    architecture?: typeof architectureRenderer;
    plan?: Renderer<PlanOutput>;
    prompt?: Renderer<PromptOutput>;
    "review-report"?: typeof reviewReportRenderer;
  };
};

export function createProductEngine(options: ProductEngineOptions = {}) {
  return createEngine({
    renderers: {
      architecture: options.renderers?.architecture ?? architectureRenderer,
      plan: options.renderers?.plan ?? planRenderer,
      prompt: options.renderers?.prompt ?? promptRenderer,
      "review-report":
        options.renderers?.["review-report"] ?? reviewReportRenderer,
    },
  });
}

export const productEngine = createProductEngine();
