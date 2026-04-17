export type StructuredObjectGenerationRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  schemaDescription?: string;
  system: string;
  user: string;
  temperature?: number;
};

export type StructuredObjectGenerator = {
  generateObject<T>(request: StructuredObjectGenerationRequest): Promise<T>;
};

export type OpenAiStructuredClientConfig = {
  apiKey: string;
  model: string;
  baseUrl?: string;
};

export type OpenAiStructuredClientOptions = OpenAiStructuredClientConfig & {
  fetch?: typeof globalThis.fetch;
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

type EnvSource = Record<string, string | undefined>;

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export function readOpenAiStructuredClientConfig(
  env: EnvSource,
  defaults: Partial<Pick<OpenAiStructuredClientConfig, "baseUrl" | "model">> = {},
): OpenAiStructuredClientConfig | undefined {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim() ?? defaults.model?.trim();
  const baseUrl = env.OPENAI_BASE_URL?.trim() ?? defaults.baseUrl?.trim();

  if (!apiKey || !model) {
    return undefined;
  }

  return {
    apiKey,
    model,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

export function createOpenAiStructuredClient(
  options: OpenAiStructuredClientOptions,
): StructuredObjectGenerator {
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is not available for OpenAI client.");
  }

  return {
    async generateObject<T>(request: StructuredObjectGenerationRequest): Promise<T> {
      const response = await fetchImpl(
        `${options.baseUrl ?? DEFAULT_BASE_URL}/responses`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model: options.model,
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
        },
      );

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

function readStructuredObject(
  payload: OpenAiResponsesApiPayload,
): unknown {
  if (payload.output_text) {
    return tryParseJson(payload.output_text);
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
        const parsed = tryParseJson(contentItem.text);

        if (parsed !== undefined) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
