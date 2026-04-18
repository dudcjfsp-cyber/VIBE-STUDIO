import { createEngine } from "../../../packages/engine-core/dist/index.js";
import { createArchitectureRenderer } from "../../../packages/renderer-architecture/dist/index.js";
import { createPlanRenderer } from "../../../packages/renderer-plan/dist/index.js";
import { createPromptRenderer } from "../../../packages/renderer-prompt/dist/index.js";
import { createReviewReportRenderer } from "../../../packages/renderer-review-report/dist/index.js";

import { createStructuredGenerator } from "./provider-runtime.js";
import type { ProviderRuntimeSession } from "./types.js";

export function createRuntimeEngine(runtime: ProviderRuntimeSession | undefined) {
  const llmClient = createStructuredGenerator(runtime);
  const strictLlm = Boolean(runtime && runtime.provider !== "local");

  return createEngine({
    default_provider: runtime?.provider ?? "local-fallback",
    default_model:
      runtime && runtime.provider !== "local"
        ? runtime.model
        : "deterministic-fallback",
    renderers: {
      architecture: createArchitectureRenderer({
        llmClient: llmClient ?? null,
        strictLlm,
      }),
      plan: createPlanRenderer({
        llmClient: llmClient ?? null,
        strictLlm,
      }),
      prompt: createPromptRenderer({
        llmClient: llmClient ?? null,
        strictLlm,
      }),
      "review-report": createReviewReportRenderer({
        llmClient: llmClient ?? null,
        strictLlm,
      }),
    },
  });
}
