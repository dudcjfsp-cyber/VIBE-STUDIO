import type {
  EngineRequest,
  EngineResult,
  RendererId,
} from "@vive-studio/engine-contracts";

import { runRemoteProductEngine } from "../provider/providerRuntimeClient";
import type { ProviderRuntimeConfig } from "../provider/types";
import { productEngine } from "./createProductEngine";
import { runBrowserGeminiEngine } from "../provider/browserGeminiClient";
import { runBrowserOpenAiEngine } from "../provider/browserOpenAiClient";
import {
  isBrowserProviderMode,
  productEngineMode,
} from "../runtime/productRuntimeConfig";

export type ProductEngineRunOptions = {
  targets?: RendererId[];
  approval?: {
    recommended?: boolean;
    required?: boolean;
  };
};

export async function runProductEngine(
  request: EngineRequest,
  options: ProductEngineRunOptions = {},
  runtime?: ProviderRuntimeConfig,
): Promise<EngineResult> {
  if (productEngineMode === "local") {
    return productEngine.run(request, options);
  }

  if (isBrowserProviderMode) {
    if (!runtime || runtime.provider === "local") {
      return productEngine.run(request, options);
    }

    if (runtime.provider === "gemini") {
      return runBrowserGeminiEngine(request, options, runtime);
    }

    if (runtime.provider === "openai") {
      return runBrowserOpenAiEngine(request, options, runtime);
    }

    throw new Error("브라우저 데모 모드에서는 Gemini와 OpenAI만 직접 연결할 수 있어요.");
  }

  try {
    return await runRemoteProductEngine(request, options, runtime);
  } catch (error) {
    if (!runtime || runtime.provider === "local") {
      return productEngine.run(request, options);
    }

    throw error instanceof Error
      ? error
      : new Error("선택한 모델로 요청을 처리하지 못했어요.");
  }
}
