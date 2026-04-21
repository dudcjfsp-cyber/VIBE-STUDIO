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
    const korean = prefersKorean(request.source_text);
    const system = buildSystemPrompt(request);
    const user = buildUserPrompt(request);
    const temperature = 0.35;

    let generatedMapped: GeneratedFollowUpFields;

    if (request.selected_action === "revise-from-review") {
      const generated = await llmClient.generateObject<any>({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            result_title: { type: "string" },
            revised_draft: { type: "string" },
            change_summary: { type: "array", items: { type: "string" } },
            remaining_questions: { type: "array", items: { type: "string" } },
          },
          required: ["result_title", "revised_draft", "change_summary", "remaining_questions"],
        },
        schemaDescription: "A revised text draft based on the review.",
        schemaName: "revise_from_review_result",
        system,
        temperature,
        user,
      });

      generatedMapped = {
        result_title: generated.result_title,
        result_body: generated.revised_draft ?? "",
        change_summary: generated.change_summary,
        remaining_questions: generated.remaining_questions,
      };
    } else if (request.selected_action === "expand-plan-detail") {
      const generated = await llmClient.generateObject<any>({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            result_title: { type: "string" },
            expanded_sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
                required: ["title", "bullets"],
                additionalProperties: false,
              },
            },
            change_summary: { type: "array", items: { type: "string" } },
            remaining_questions: { type: "array", items: { type: "string" } },
          },
          required: ["result_title", "expanded_sections", "change_summary", "remaining_questions"],
        },
        schemaDescription: "An expanded plan with structured sections containing bullets.",
        schemaName: "expand_plan_detail_result",
        system,
        temperature,
        user,
      });

      const sections = generated.expanded_sections ?? [];
      const expandedSectionsText = sections.map((section: any) =>
        [`### ${section.title}`, ...section.bullets.map((b: string) => `- ${b}`)].join("\n")
      );

      generatedMapped = {
        result_title: generated.result_title,
        result_body: [
          korean ? "확장된 계획 초안" : "Expanded Plan Draft",
          "",
          ...expandedSectionsText,
        ].join("\n\n"),
        change_summary: generated.change_summary,
        remaining_questions: generated.remaining_questions,
      };
    } else if (request.selected_action === "expand-architecture-detail") {
      const generated = await llmClient.generateObject<any>({
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            result_title: { type: "string" },
            expanded_flows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  steps: { type: "array", items: { type: "string" } },
                },
                required: ["name", "steps"],
                additionalProperties: false,
              },
            },
            change_summary: { type: "array", items: { type: "string" } },
            remaining_questions: { type: "array", items: { type: "string" } },
          },
          required: ["result_title", "expanded_flows", "change_summary", "remaining_questions"],
        },
        schemaDescription: "An expanded architecture with interaction flows containing step-by-step details.",
        schemaName: "expand_architecture_detail_result",
        system,
        temperature,
        user,
      });

      const flows = generated.expanded_flows ?? [];
      const flowDetailsText = flows.map((flow: any) =>
        [`### ${flow.name}`, ...flow.steps.map((s: string, i: number) => `${i + 1}. ${s}`)].join("\n")
      );

      generatedMapped = {
        result_title: generated.result_title,
        result_body: [
          korean ? "세부 설계 확장" : "Detailed Flow Expansion",
          "",
          ...(korean
            ? ["확장 초점: flow-detail", ""]
            : ["Expansion focus: flow-detail", ""]),
          ...flowDetailsText,
        ].join("\n\n"),
        change_summary: generated.change_summary,
        remaining_questions: generated.remaining_questions,
      };
    } else {
      return fallback;
    }

    return normalizeGeneratedFollowUp(generatedMapped, fallback);
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
    "IMPORTANT: DO NOT output any meta-commentary, introductions, or explanations about what you changed.",
    "IMPORTANT: ONLY output the actual extended document or structured draft itself.",
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
      if (request.review_refinement) {
        lines.push(
          "You may receive structured answers to displayed remaining questions.",
        );
        lines.push(
          "Use those answers only to refine the same revised artifact. Do not treat them as a new freeform instruction.",
        );
        lines.push(
          "Keep the result in the same follow-up block and remove any remaining question that was answered well enough.",
        );
      }
      break;
    case "expand-plan-detail":
      lines.push(
        "Stay in the plan family. Make the plan more concrete, but do not turn it into architecture or implementation tasks.",
      );
      lines.push(
        "CRITICAL: Output the expanded plan content itself as structured sections. Do NOT write an introduction or summarize what changes you made. Each section should have a clear title and a list of specific, actionable bullets.",
      );
      break;
    case "expand-architecture-detail":
      lines.push(
        "Stay in the architecture family. Expand the current architecture with a default focus on flow-detail.",
      );
      lines.push(
        "Do not turn the result into API specs, data models, code generation, or implementation tasks.",
      );
      lines.push(
        "CRITICAL: Output the actual expanded architecture components and interaction flows. Do NOT write meta-commentary summarizing what you have expanded.",
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
    ...(request.review_refinement
      ? [`Review refinement: ${JSON.stringify(request.review_refinement)}`]
      : []),
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
