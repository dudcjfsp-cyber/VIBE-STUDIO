import {
  runDeterministicStage1FollowUp,
  type Stage1FollowUpRequest,
  type Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

import type { ProviderRuntimeConfig } from "../provider/types";
import { runBrowserGeminiFollowUp } from "../provider/browserGeminiClient";
import { runBrowserOpenAiFollowUp } from "../provider/browserOpenAiClient";
import { runProductRuntimeFollowUp } from "../runtime/productRuntimeApiClient";
import {
  isBrowserProviderMode,
  productEngineMode,
} from "../runtime/productRuntimeConfig";

export async function runStage1FollowUp(
  request: Stage1FollowUpRequest,
  runtime: ProviderRuntimeConfig | undefined,
): Promise<Stage1FollowUpResult> {
  if (productEngineMode === "local") {
    return runDeterministicStage1FollowUp(request);
  }

  if (isBrowserProviderMode) {
    if (!runtime || runtime.provider === "local") {
      return runDeterministicStage1FollowUp(request);
    }

    if (
      (request.renderer === "plan" && request.selected_action === "expand-plan-detail") ||
      (request.renderer === "architecture" &&
        request.selected_action === "expand-architecture-detail")
    ) {
      return runDeterministicStage1FollowUp(request);
    }

    if (runtime.provider === "gemini") {
      return runBrowserGeminiFollowUp(request, runtime);
    }

    if (runtime.provider === "openai") {
      return runBrowserOpenAiFollowUp(request, runtime);
    }

    throw new Error("브라우저 데모 모드에서는 Gemini와 OpenAI 후속 결과만 지원해요.");
  }

  try {
    return await runProductRuntimeFollowUp(request, runtime);
  } catch (error) {
    if (
      !runtime ||
      runtime.provider === "local" ||
      isMissingFollowUpEndpoint(error)
    ) {
      return runDeterministicStage1FollowUp(request);
    }

    throw error instanceof Error
      ? error
      : new Error("후속 결과를 만드는 중 문제가 생겼어요.");
  }
}

function isMissingFollowUpEndpoint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const status = (error as Error & { status?: number }).status;

  return status === 404 || error.message.trim() === "Not Found";
}
