import {
  runDeterministicStage1FollowUp,
  type Stage1FollowUpRequest,
  type Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

import { createStructuredGenerator } from "./provider-runtime.js";
import type { ProviderRuntimeSession } from "./types.js";

type StructuredObjectGenerationRequest = {
  schema: Record<string, unknown>;
  schemaDescription?: string;
  schemaName: string;
  system: string;
  temperature?: number;
  user: string;
};

type StructuredObjectGenerator = {
  generateObject<T>(request: StructuredObjectGenerationRequest): Promise<T>;
};

type GeneratedFollowUpFields = Pick<
  Stage1FollowUpResult,
  "change_summary" | "remaining_questions" | "result_body" | "result_title"
>;

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

export async function runStage1FollowUp(
  request: Stage1FollowUpRequest,
  runtime: ProviderRuntimeSession | undefined,
): Promise<Stage1FollowUpResult> {
  const fallback = runDeterministicStage1FollowUp(request);
  const llmClient = createStructuredGenerator(runtime) as
    | StructuredObjectGenerator
    | undefined;
  const strictLlm = Boolean(runtime && runtime.provider !== "local");

  if (!llmClient) {
    return fallback;
  }

  try {
    const generated = await llmClient.generateObject<GeneratedFollowUpFields>({
      schema: followUpResultSchema,
      schemaDescription:
        "A single Stage 1 follow-up result with a title, one result body, a short change summary, and remaining questions.",
      schemaName: "stage1_follow_up_result",
      system: buildSystemPrompt(request),
      temperature: 0.35,
      user: buildUserPrompt(request),
    });

    return normalizeGeneratedFollowUp(generated, fallback);
  } catch (error) {
    if (strictLlm) {
      throw error instanceof Error
        ? error
        : new Error("Stage 1 follow-up generation failed.");
    }

    return fallback;
  }
}

function buildSystemPrompt(request: Stage1FollowUpRequest): string {
  const lines = [
    "You generate one Stage 1 post-result follow-up for Vibe Studio.",
    "Vibe Studio is a structured-thinking learning environment, not a generic generator.",
    "Keep approval -> renderer -> agent ordering intact.",
    "Do not silently switch renderer family, mode, or workflow direction.",
    "Do not overwrite the primary result. Produce one separate follow-up result only.",
    "Do not ask the user for a freeform follow-up instruction in Stage 1.",
    "Keep the tone concrete, explainable, and useful for an AI beginner.",
  ];

  if (prefersKorean(request.source_text)) {
    lines.push("The source is Korean. Write every field in Korean.");
  } else {
    lines.push("Write in the user's language unless the source clearly requests another language.");
  }

  switch (request.selected_action) {
    case "revise-from-review":
      lines.push(
        "Produce the actual revised artifact body, not commentary about how to revise it.",
      );
      lines.push(
        "Keep the result concise and directly usable. Do not restate the review request or explain the editing process.",
      );
      break;
    case "expand-plan-detail":
      lines.push(
        "Stay in the plan family. Make the plan more concrete, but do not turn it into architecture or implementation tasks.",
      );
      break;
    case "expand-architecture-detail":
      lines.push(
        "Stay in the architecture family. Expand the current architecture with a default focus on flow-detail.",
      );
      lines.push(
        "Do not turn the result into API specs, data models, code generation, or implementation tasks.",
      );
      break;
  }

  return lines.join("\n");
}

function buildUserPrompt(request: Stage1FollowUpRequest): string {
  const reviewArtifact =
    request.renderer === "review-report" &&
    "artifact_text" in request.result_context
      ? request.result_context.artifact_text
      : undefined;

  return [
    `Selected action: ${request.selected_action}`,
    `Primary renderer: ${request.renderer}`,
    `Source text: ${request.source_text.trim()}`,
    ...(reviewArtifact ? [`Artifact text to revise: ${reviewArtifact}`] : []),
    `Primary result: ${JSON.stringify(request.primary_result)}`,
    `Result context: ${JSON.stringify(request.result_context)}`,
    `Policy context: ${JSON.stringify(request.policy_context)}`,
    "Return one Stage 1 follow-up result only.",
  ].join("\n");
}

function normalizeGeneratedFollowUp(
  generated: GeneratedFollowUpFields,
  fallback: Stage1FollowUpResult,
): Stage1FollowUpResult {
  const resultTitle = generated.result_title?.trim() || fallback.result_title;
  const resultBody = generated.result_body?.trim() || fallback.result_body;
  const changeSummary = (generated.change_summary ?? [])
    .map((entry: string) => entry.trim())
    .filter(Boolean);
  const remainingQuestions = (generated.remaining_questions ?? [])
    .map((entry: string) => entry.trim())
    .filter(Boolean);

  return {
    ...fallback,
    change_summary:
      changeSummary.length > 0 ? changeSummary : fallback.change_summary,
    remaining_questions:
      remainingQuestions.length > 0
        ? remainingQuestions
        : fallback.remaining_questions,
    result_body: resultBody,
    result_title: resultTitle,
  };
}

function prefersKorean(value: string): boolean {
  return /[가-힣]/u.test(value);
}
