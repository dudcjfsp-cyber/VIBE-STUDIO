import { createOpenAiStructuredClient } from "../../../packages/llm-provider-openai/dist/index.js";

import type {
  ProviderModel,
  ProviderRuntimeSession,
  RemoteProviderId,
} from "./types.js";

type StructuredObjectGenerationRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  schemaDescription?: string;
  system: string;
  user: string;
  temperature?: number;
};

type StructuredObjectGenerator = {
  generateObject<T>(request: StructuredObjectGenerationRequest): Promise<T>;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_API_URL = "https://api.openai.com/v1";

type OpenAiModelListResponse = {
  data?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
  };
};

type AnthropicModelListResponse = {
  data?: Array<{
    id?: string;
    display_name?: string;
    type?: string;
  }>;
  error?: {
    message?: string;
  };
};

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

type AnthropicMessagesResponse = {
  error?: {
    message?: string;
  };
  content?: Array<{
    type?: string;
    text?: string;
  }>;
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

export async function listProviderModels(
  provider: RemoteProviderId,
  apiKey: string,
): Promise<ProviderModel[]> {
  switch (provider) {
    case "openai":
      return listOpenAiModels(apiKey);
    case "anthropic":
      return listAnthropicModels(apiKey);
    case "gemini":
      return listGeminiModels(apiKey);
  }
}

export function createStructuredGenerator(
  runtime: ProviderRuntimeSession | undefined,
): StructuredObjectGenerator | undefined {
  if (!runtime || runtime.provider === "local") {
    return undefined;
  }

  switch (runtime.provider) {
    case "openai":
      return createOpenAiStructuredClient({
        apiKey: runtime.apiKey,
        model: runtime.model,
      });
    case "anthropic":
      return createAnthropicStructuredClient(runtime.apiKey, runtime.model);
    case "gemini":
      return createGeminiStructuredClient(runtime.apiKey, runtime.model);
  }
}

async function listOpenAiModels(apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch(`${OPENAI_API_URL}/models`, {
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

async function listAnthropicModels(apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch(`${ANTHROPIC_API_URL}/models`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
  });
  const payload = (await response.json()) as AnthropicModelListResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Anthropic model list request failed.");
  }

  return (payload.data ?? [])
    .map((entry) => {
      const id = entry.id?.trim();

      if (!id) {
        return undefined;
      }

      return {
        id,
        label: entry.display_name?.trim() || id,
        ...(entry.type?.trim()
          ? { description: entry.type.trim() }
          : {}),
      };
    })
    .filter((entry): entry is ProviderModel => Boolean(entry))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function listGeminiModels(apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch(`${GEMINI_API_URL}/models?key=${encodeURIComponent(apiKey)}`);
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

function createAnthropicStructuredClient(
  apiKey: string,
  model: string,
): StructuredObjectGenerator {
  return {
    async generateObject<T>(request: StructuredObjectGenerationRequest): Promise<T> {
      const response = await fetch(`${ANTHROPIC_API_URL}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2400,
          temperature: request.temperature ?? 0,
          system: [
            request.system,
            "Return only JSON.",
            `Match this JSON schema exactly: ${JSON.stringify(request.schema)}`,
          ].join("\n\n"),
          messages: [
            {
              role: "user",
              content: request.user,
            },
          ],
        }),
      });
      const payload = (await response.json()) as AnthropicMessagesResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Anthropic request failed.");
      }

      const text = (payload.content ?? [])
        .filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => item.text?.trim() ?? "")
        .join("\n");

      const parsed = parseLooseJson(text);

      if (parsed === undefined) {
        throw new Error("Anthropic response did not contain valid JSON.");
      }

      return parsed as T;
    },
  };
}

function createGeminiStructuredClient(
  apiKey: string,
  model: string,
): StructuredObjectGenerator {
  const normalizedModel = normalizeGeminiModelId(model);

  if (!normalizedModel) {
    throw new Error("Gemini model id is missing.");
  }

  return {
    async generateObject<T>(request: StructuredObjectGenerationRequest): Promise<T> {
      const response = await fetch(
        `${GEMINI_API_URL}/models/${normalizedModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
              responseSchema: request.schema,
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

function normalizeGeminiModelId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^models\//, "");
}

function parseLooseJson(value: string): unknown {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}
