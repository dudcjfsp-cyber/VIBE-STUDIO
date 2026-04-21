import { runDeterministicStage1FollowUp } from "@vive-studio/engine-contracts";
import type {
  Stage1FollowUpRequest,
  Stage1FollowUpResult,
} from "@vive-studio/engine-contracts";

export type BrowserStructuredObjectGenerationRequest = {
  schema: Record<string, unknown>;
  schemaDescription?: string;
  schemaName: string;
  system: string;
  temperature?: number;
  user: string;
};

export type BrowserStructuredObjectGenerator = {
  generateObject<T>(request: BrowserStructuredObjectGenerationRequest): Promise<T>;
};

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

export async function runBrowserFollowUp(
  request: Stage1FollowUpRequest,
  llmClient: BrowserStructuredObjectGenerator,
): Promise<Stage1FollowUpResult> {
  const fallback = runDeterministicStage1FollowUp(request);
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

export function parseLooseJson(value: string): unknown {
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
    lines.push("Use polite formal Korean endings such as ~습니다, ~합니다, and ~주세요.");
    lines.push("Do not use casual or plain Korean endings such as ~다, ~한다, ~했다, or terse noun-only fragments for user-facing sentences.");
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

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  const normalized = (values ?? []).map((value) => value.trim()).filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}
