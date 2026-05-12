import type {
  EngineRequest,
  EngineResult,
  RendererId,
  Stage1FollowUpRequest,
  Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

import type {
  ProviderModel,
  ProviderRuntimeConfig,
  RemoteProviderId,
} from "../provider/types";
import { requireProductApiBaseUrl } from "./productRuntimeConfig";

const PRODUCT_RUNTIME_TIMEOUT_MS = 20_000;

export type ProductEngineRunOptions = {
  targets?: RendererId[];
  forceRender?: boolean;
  approval?: {
    recommended?: boolean;
    required?: boolean;
  };
};

export async function listProductRuntimeModels(
  provider: RemoteProviderId,
  apiKey: string,
): Promise<ProviderModel[]> {
  const response = await postProductRuntimeJson<{ models: ProviderModel[] }>(
    "/providers/models",
    {
      provider,
      apiKey,
    },
  );

  return response.models;
}

export async function runProductRuntimeEngine(
  request: EngineRequest,
  options: ProductEngineRunOptions,
  runtime: ProviderRuntimeConfig | undefined,
): Promise<EngineResult> {
  return postProductRuntimeJson("/run", {
    request,
    ...(hasRunOptions(options) ? { options } : {}),
    ...(runtime ? { runtime } : {}),
  });
}

export async function runProductRuntimeFollowUp(
  request: Stage1FollowUpRequest,
  runtime: ProviderRuntimeConfig | undefined,
): Promise<Stage1FollowUpResult> {
  return postProductRuntimeJson("/follow-up", {
    request,
    ...(runtime ? { runtime } : {}),
  });
}

async function postProductRuntimeJson<T>(
  path: string,
  payload: object,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PRODUCT_RUNTIME_TIMEOUT_MS);

  try {
    const response = await fetch(`${requireProductApiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(await readErrorMessage(response)) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("API 서버 응답이 지연되어 요청을 중단했습니다. 잠시 뒤 다시 시도해 주세요.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function hasRunOptions(options: ProductEngineRunOptions): boolean {
  return Boolean(options.forceRender) || Boolean(options.approval) || Boolean(options.targets?.length);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    return `Product runtime request failed with status ${response.status}.`;
  }

  return `Product runtime request failed with status ${response.status}.`;
}
