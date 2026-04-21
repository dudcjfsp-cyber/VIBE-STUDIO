import { createArchitectureRenderer } from "@vive-studio/renderer-architecture";
import { createPlanRenderer } from "@vive-studio/renderer-plan";
import { createPromptRenderer } from "@vive-studio/renderer-prompt";
import { createReviewReportRenderer } from "@vive-studio/renderer-review-report";
import { runDeterministicStage1FollowUp } from "@vive-studio/engine-contracts";
import type {
  EngineRequest,
  EngineResult,
  Stage1FollowUpRequest,
  Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

import { createProductEngine } from "../engine/createProductEngine";
import type { ProductEngineRunOptions } from "../engine/productEngineClient";
import type { ProviderModel, ProviderRuntimeConfig } from "./types";

type StructuredObjectGenerationRequest = {
  schema: Record<string, unknown>;
  schemaDescription?: string;
  schemaName: string;
  system: string;
  temperature?: number;
  user: string;
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

const followUpResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    result_title: {
      type: "string",
    },
    result_body: {
      type: "string",
    },
    change_summary: {
      type: "array",
      items: {
        type: "string",
      },
    },
    remaining_questions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "result_title",
    "result_body",
    "change_summary",
    "remaining_questions",
  ],
} satisfies Record<string, unknown>;

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
  const fallback = runDeterministicStage1FollowUp(request);
  const llmClient = createBrowserGeminiStructuredClient(runtime);
  const generated = await llmClient.generateObject<
    Pick<
      Stage1FollowUpResult,
      "change_summary" | "remaining_questions" | "result_body" | "result_title"
    >
  >({
    schema: followUpResultSchema,
    schemaDescription:
      "A single Stage 1 follow-up result with a title, one result body, a short change summary, and remaining questions.",
    schemaName: "stage1_follow_up_result",
    system: buildFollowUpSystemPrompt(request),
    temperature: 0.35,
    user: buildFollowUpUserPrompt(request),
  });

  return {
    ...fallback,
    change_summary:
      normalizeStringList(generated.change_summary) || fallback.change_summary,
    remaining_questions:
      normalizeStringList(generated.remaining_questions) ||
      fallback.remaining_questions,
    result_body: generated.result_body?.trim() || fallback.result_body,
    result_title: generated.result_title?.trim() || fallback.result_title,
  };
}

function createBrowserGeminiStructuredClient(runtime: BrowserGeminiRuntime) {
  const normalizedModel = normalizeGeminiModelId(runtime.model);

  if (!normalizedModel) {
    throw new Error("Gemini model id is missing.");
  }

  return {
    async generateObject<T>(
      request: StructuredObjectGenerationRequest,
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

function buildFollowUpSystemPrompt(request: Stage1FollowUpRequest): string {
  const lines = [
    "You generate one Stage 1 post-result follow-up for Vibe Studio.",
    "Vibe Studio is a structured-thinking learning environment, not a generic generator.",
    "Keep approval, renderer, and follow-up ordering intact.",
    "Do not silently switch renderer family, mode, or workflow direction.",
    "Do not overwrite the primary result. Produce one separate follow-up result only.",
    "Keep the tone concrete, explainable, and useful for an AI beginner.",
  ];

  if (/[가-힣]/u.test(request.source_text)) {
    lines.push("The source is Korean. Write every field in Korean.");
  } else {
    lines.push("Write in the user's language unless the source clearly requests another language.");
  }

  switch (request.selected_action) {
    case "revise-from-review":
      lines.push("Produce the actual revised artifact body, not commentary about how to revise it.");
      break;
    case "expand-plan-detail":
      lines.push("Stay in the plan family. Make the plan more concrete, but do not turn it into architecture or implementation tasks.");
      break;
    case "expand-architecture-detail":
      lines.push("Stay in the architecture family. Expand the current architecture with a default focus on flow-detail.");
      lines.push("Do not turn the result into API specs, data models, code generation, or implementation tasks.");
      break;
  }

  return lines.join("\n");
}

function buildFollowUpUserPrompt(request: Stage1FollowUpRequest): string {
  return [
    `Selected action: ${request.selected_action}`,
    `Primary renderer: ${request.renderer}`,
    `Source text: ${request.source_text.trim()}`,
    ...(request.follow_up_instruction
      ? [`Follow-up instruction: ${JSON.stringify(request.follow_up_instruction)}`]
      : []),
    ...(request.review_refinement
      ? [`Review refinement: ${JSON.stringify(request.review_refinement)}`]
      : []),
    `Primary result: ${JSON.stringify(request.primary_result)}`,
    `Result context: ${JSON.stringify(request.result_context)}`,
    `Policy context: ${JSON.stringify(request.policy_context)}`,
    "Return one Stage 1 follow-up result only.",
  ].join("\n");
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

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  const normalized = (values ?? []).map((value) => value.trim()).filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}
