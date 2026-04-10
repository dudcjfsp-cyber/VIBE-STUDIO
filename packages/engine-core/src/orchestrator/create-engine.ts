import type { EngineRequest } from "@vive-studio/engine-contracts";

import { analyzeRequest, type AnalyzeRequestOptions } from "./analyze-request.js";
import type { AnalyzeResult } from "./analyze-result.js";
import { runEngine, type RendererRegistry } from "./run-engine.js";

export type Engine = {
  analyze(request: EngineRequest): AnalyzeResult;
  run(
    request: EngineRequest,
    options?: {
      targets?: import("@vive-studio/engine-contracts").RendererId[];
      approval?: {
        recommended?: boolean;
        required?: boolean;
      };
    },
  ): Promise<import("@vive-studio/engine-contracts").EngineResult>;
};

export function createEngine(
  options: AnalyzeRequestOptions & {
    renderers?: RendererRegistry;
  } = {},
): Engine {
  return {
    analyze(request) {
      return analyzeRequest(request, options);
    },
    run(request, runOptions = {}) {
      return runEngine(request, {
        ...options,
        ...runOptions,
        renderers: options.renderers ?? {},
      });
    },
  };
}
