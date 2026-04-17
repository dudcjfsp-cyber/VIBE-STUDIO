import type {
  EngineRequest,
  EngineResult,
  RendererId,
} from "@vive-studio/engine-contracts";

import { productEngine } from "./createProductEngine";
import { runRemoteProductEngine } from "../provider/providerRuntimeClient";
import type { ProviderRuntimeConfig } from "../provider/types";

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
  } catch {
    if (!runtime || runtime.provider === "local") {
      return productEngine.run(request, options);
    }

    throw new Error("선택한 모델로 요청을 처리하지 못했어요. 키와 모델 연결 상태를 확인해 주세요.");
  }
}
