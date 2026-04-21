import {
  runDeterministicStage1FollowUp,
  type Stage1FollowUpRequest,
  type Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

import type { ProviderRuntimeConfig } from "../provider/types";
import { runBrowserGeminiFollowUp } from "../provider/browserGeminiClient";
import {
  isBrowserProviderMode,
  productApiBaseUrl,
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

    if (runtime.provider === "gemini") {
      return runBrowserGeminiFollowUp(request, runtime);
    }

    throw new Error("브라우저 데모 모드에서는 Gemini 후속 결과만 지원해요.");
  }

  try {
    return await postJson<Stage1FollowUpResult>(`${productApiBaseUrl}/follow-up`, {
      request,
      ...(runtime ? { runtime } : {}),
    });
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

async function postJson<T>(url: string, payload: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = new Error(await readErrorMessage(response)) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
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

function isMissingFollowUpEndpoint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const status = (error as Error & { status?: number }).status;

  return status === 404 || error.message.trim() === "Not Found";
}
