import type {
  EngineRequest,
  EngineResult,
  RendererId,
} from "@vive-studio/engine-contracts";

import { runRemoteProductEngine } from "../provider/providerRuntimeClient";
import type { ProviderRuntimeConfig } from "../provider/types";
import { productEngine } from "./createProductEngine";

export type ProductEngineRunOptions = {
  targets?: RendererId[];
  approval?: {
    recommended?: boolean;
    required?: boolean;
  };
};

const engineMode =
  (import.meta.env.VITE_PRODUCT_ENGINE_MODE as string | undefined)?.trim() ||
  "auto";

export async function runProductEngine(
  request: EngineRequest,
  options: ProductEngineRunOptions = {},
  runtime?: ProviderRuntimeConfig,
): Promise<EngineResult> {
  if (engineMode === "local") {
    return productEngine.run(request, options);
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
