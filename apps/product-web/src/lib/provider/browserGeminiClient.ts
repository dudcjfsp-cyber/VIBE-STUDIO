import { createArchitectureRenderer } from "@vive-studio/renderer-architecture";
import { createPlanRenderer } from "@vive-studio/renderer-plan";
import { createPromptRenderer } from "@vive-studio/renderer-prompt";
import { createReviewReportRenderer } from "@vive-studio/renderer-review-report";
import type {
  EngineRequest,
  EngineResult,
  Stage1FollowUpRequest,
  Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

import { createProductEngine } from "../engine/createProductEngine";
import type { ProductEngineRunOptions } from "../engine/productEngineClient";
import type { ProviderModel, ProviderRuntimeConfig } from "./types";
import {
  parseLooseJson,
  runBrowserFollowUp,
  type BrowserStructuredObjectGenerationRequest,
} from "./browserFollowUp";

type GeminiModelListResponse = {
  models?: Array<{
    name?: string;
    displayName?: string;
    description?: string;
    supportedGenerationMethods?: string[];
  }>;
  error?: {
    message?: string;
  };
};

type GeminiGenerateResponse = {
  error?: {
    message?: string;
  };
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type BrowserGeminiRuntime = Extract<ProviderRuntimeConfig, { provider: "gemini" }>;

const geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta";

export async function listBrowserGeminiModels(
  apiKey: string,
): Promise<ProviderModel[]> {
  const response = await fetch(
    `${geminiApiUrl}/models?key=${encodeURIComponent(apiKey)}`,
  );
  const payload = (await response.json()) as GeminiModelListResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini model list request failed.");
  }

  return (payload.models ?? [])
    .filter((entry) =>
      Array.isArray(entry.supportedGenerationMethods)
        ? entry.supportedGenerationMethods.includes("generateContent")
        : true,
    )
    .map((entry) => {
      const id = normalizeGeminiModelId(entry.name);

      if (!id) {
        return undefined;
      }

      return {
        id,
        label: entry.displayName?.trim() || id,
        ...(entry.description?.trim()
          ? { description: entry.description.trim() }
          : {}),
      };
    })
    .filter((entry): entry is ProviderModel => Boolean(entry))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function runBrowserGeminiEngine(
  request: EngineRequest,
  options: ProductEngineRunOptions,
  runtime: BrowserGeminiRuntime,
): Promise<EngineResult> {
  const llmClient = createBrowserGeminiStructuredClient(runtime);
  const engine = createProductEngine({
    renderers: {
      architecture: createArchitectureRenderer({
        llmClient,
        strictLlm: true,
      }),
      plan: createPlanRenderer({
        llmClient,
        strictLlm: true,
      }),
      prompt: createPromptRenderer({
        llmClient,
        strictLlm: true,
      }),
      "review-report": createReviewReportRenderer({
        llmClient,
        strictLlm: true,
      }),
    },
  });

  return engine.run(request, options);
}

export async function runBrowserGeminiFollowUp(
  request: Stage1FollowUpRequest,
  runtime: BrowserGeminiRuntime,
): Promise<Stage1FollowUpResult> {
  return runBrowserFollowUp(
    request,
    createBrowserGeminiStructuredClient(runtime),
  );
}

function createBrowserGeminiStructuredClient(runtime: BrowserGeminiRuntime) {
  const normalizedModel = normalizeGeminiModelId(runtime.model);

  if (!normalizedModel) {
    throw new Error("Gemini model id is missing.");
  }

  return {
    async generateObject<T>(
      request: BrowserStructuredObjectGenerationRequest,
    ): Promise<T> {
      const response = await fetch(
        `${geminiApiUrl}/models/${normalizedModel}:generateContent?key=${encodeURIComponent(runtime.apiKey)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: request.system }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: request.user }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: request.schema,
              ...(typeof request.temperature === "number"
                ? { temperature: request.temperature }
                : {}),
            },
          }),
        },
      );
      const payload = (await response.json()) as GeminiGenerateResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Gemini request failed.");
      }

      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      const parsed = text ? parseLooseJson(text) : undefined;

      if (parsed === undefined) {
        throw new Error("Gemini response did not contain valid JSON.");
      }

      return parsed as T;
    },
  };
}

function normalizeGeminiModelId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^models\//, "");
}
