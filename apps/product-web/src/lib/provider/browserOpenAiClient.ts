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

type OpenAiModelListResponse = {
  data?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiResponsesApiPayload = {
  error?: {
    message?: string;
  };
  output_text?: string;
  output?: Array<{
    type?: string;
    refusal?: string;
    content?: Array<{
      type?: string;
      text?: string;
      json?: unknown;
      parsed?: unknown;
      refusal?: string;
    }>;
  }>;
};

type BrowserOpenAiRuntime = Extract<ProviderRuntimeConfig, { provider: "openai" }>;

const openAiApiUrl = "https://api.openai.com/v1";

export async function listBrowserOpenAiModels(
  apiKey: string,
): Promise<ProviderModel[]> {
  const response = await fetch(`${openAiApiUrl}/models`, {
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  });
  const payload = (await response.json()) as OpenAiModelListResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI model list request failed.");
  }

  return (payload.data ?? [])
    .map((entry) => entry.id?.trim())
    .filter((id): id is string => typeof id === "string" && isOpenAiTextModel(id))
    .sort((left, right) => left.localeCompare(right))
    .map((id) => ({
      id,
      label: id,
    }));
}

export async function runBrowserOpenAiEngine(
  request: EngineRequest,
  options: ProductEngineRunOptions,
  runtime: BrowserOpenAiRuntime,
): Promise<EngineResult> {
  const llmClient = createBrowserOpenAiStructuredClient(runtime);
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

export async function runBrowserOpenAiFollowUp(
  request: Stage1FollowUpRequest,
  runtime: BrowserOpenAiRuntime,
): Promise<Stage1FollowUpResult> {
  return runBrowserFollowUp(
    request,
    createBrowserOpenAiStructuredClient(runtime),
  );
}

function createBrowserOpenAiStructuredClient(runtime: BrowserOpenAiRuntime) {
  return {
    async generateObject<T>(
      request: BrowserStructuredObjectGenerationRequest,
    ): Promise<T> {
      const response = await fetch(`${openAiApiUrl}/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${runtime.apiKey}`,
        },
        body: JSON.stringify({
          model: runtime.model,
          input: [
            {
              role: "system",
              content: request.system,
            },
            {
              role: "user",
              content: request.user,
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              description: request.schemaDescription,
              strict: true,
              schema: request.schema,
            },
          },
          ...(typeof request.temperature === "number"
            ? { temperature: request.temperature }
            : {}),
        }),
      });
      const payload = (await response.json()) as OpenAiResponsesApiPayload;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "OpenAI request failed.");
      }

      const parsed = readStructuredObject(payload);

      if (parsed === undefined) {
        throw new Error("OpenAI response did not contain structured JSON output.");
      }

      return parsed as T;
    },
  };
}

function readStructuredObject(payload: OpenAiResponsesApiPayload): unknown {
  if (payload.output_text) {
    return parseLooseJson(payload.output_text);
  }

  for (const item of payload.output ?? []) {
    if (item.refusal) {
      throw new Error(item.refusal);
    }

    for (const contentItem of item.content ?? []) {
      if (contentItem.refusal) {
        throw new Error(contentItem.refusal);
      }

      if (contentItem.parsed !== undefined) {
        return contentItem.parsed;
      }

      if (contentItem.json !== undefined) {
        return contentItem.json;
      }

      if (contentItem.text) {
        const parsed = parseLooseJson(contentItem.text);

        if (parsed !== undefined) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

function isOpenAiTextModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  const blockedFragments = [
    "whisper",
    "tts",
    "transcribe",
    "moderation",
    "embedding",
    "image",
    "audio",
    "realtime",
  ];

  return !blockedFragments.some((fragment) => lower.includes(fragment));
}
