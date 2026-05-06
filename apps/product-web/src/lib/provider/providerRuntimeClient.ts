import type { ProviderModel, RemoteProviderId } from "./types";
import { listBrowserGeminiModels } from "./browserGeminiClient";
import { listBrowserOpenAiModels } from "./browserOpenAiClient";
import { listProductRuntimeModels } from "../runtime/productRuntimeApiClient";
import {
  isBrowserProviderMode,
} from "../runtime/productRuntimeConfig";

export async function listProviderModels(
  provider: RemoteProviderId,
  apiKey: string,
): Promise<ProviderModel[]> {
  if (isBrowserProviderMode && provider === "gemini") {
    return listBrowserGeminiModels(apiKey);
  }

  if (isBrowserProviderMode && provider === "openai") {
    return listBrowserOpenAiModels(apiKey);
  }

  return listProductRuntimeModels(provider, apiKey);
}
