import type { Renderer, RendererHandoff } from "@vive-studio/engine-contracts";

import type { PlanOutput, PlanSection } from "./plan-output.js";
import { renderPlan } from "./render-plan.js";
import { validatePlanOutput } from "./validate-plan-output.js";

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

export type CreatePlanRendererOptions = {
  llmClient?: StructuredObjectGenerator | null;
  strictLlm?: boolean;
};

const planOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
    },
    sections: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: "string",
          },
          bullets: {
            type: "array",
            minItems: 1,
            items: {
              type: "string",
            },
          },
        },
        required: ["title", "bullets"],
      },
    },
    notes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["title", "sections", "notes"],
} satisfies Record<string, unknown>;

export function createPlanRenderer(
  options: CreatePlanRendererOptions = {},
): Renderer<PlanOutput> {
  return {
    id: "plan",
    async render(handoff) {
      const fallback = renderPlan(handoff);

      if (!options.llmClient) {
        return fallback;
      }

      try {
        const generated = await options.llmClient.generateObject<PlanOutput>({
          schemaName: "plan_output",
          schemaDescription:
            "A structured planning summary with multiple sections, bullet points, and supporting notes.",
          schema: planOutputSchema,
          system: buildSystemPrompt(),
          user: buildUserPrompt(handoff),
          temperature: 0.45,
        });

        return normalizePlanOutput(generated, fallback);
      } catch (error) {
        if (options.strictLlm) {
          throw error instanceof Error
            ? error
            : new Error("Plan generation failed.");
        }

        return fallback;
      }
    },
    validateOutput: validatePlanOutput,
  };
}

function buildSystemPrompt(): string {
  return [
    "You generate structured plan outputs for Vibe Studio.",
    "Write for AI beginners who need a clear, scaffolded thinking aid.",
    "If the source text is in Korean, every output field must be written in Korean.",
    "For Korean output, use polite formal Korean endings such as ~습니다, ~합니다, and ~주세요.",
    "Do not use casual or plain Korean endings such as ~다, ~한다, ~했다, or terse noun-only fragments for user-facing sentences.",
    "Write in the user's source language unless the request clearly calls for another language.",
    "Make the plan concrete, but do not invent domain facts that are not supported by the input.",
    "Do not mention internal engine fields or validation language.",
  ].join("\n");
}

function buildUserPrompt(handoff: RendererHandoff): string {
  const { intent_ir: intentIr } = handoff;
  const lines = [
    `Source text: ${handoff.source.text.trim()}`,
    `Required output language: ${resolveOutputLanguage(handoff)}`,
    `Mode: ${intentIr.mode}`,
    `Summary: ${intentIr.summary.trim()}`,
    `Goal: ${intentIr.intent.goal.trim()}`,
    `Context: ${intentIr.intent.context.trim() || "None provided."}`,
    `Audience: ${intentIr.intent.audience.trim() || "Not specified."}`,
    `Desired output kind: ${intentIr.intent.output_kind}`,
  ];

  if (intentIr.output_contract.constraints.length > 0) {
    lines.push(
      `Constraints: ${intentIr.output_contract.constraints.join(" | ")}`,
    );
  }

  if (intentIr.output_contract.success_criteria.length > 0) {
    lines.push(
      `Success criteria: ${intentIr.output_contract.success_criteria.join(" | ")}`,
    );
  }

  if (intentIr.analysis.missing_information.length > 0) {
    lines.push(
      `Missing information: ${intentIr.analysis.missing_information.join(" | ")}`,
    );
  }

  if (intentIr.analysis.clarification_questions.length > 0) {
    lines.push(
      `Clarification questions: ${intentIr.analysis.clarification_questions
        .map((question) => question.question)
        .join(" | ")}`,
    );
  }

  if (intentIr.analysis.risks.length > 0) {
    lines.push(`Risks: ${intentIr.analysis.risks.join(" | ")}`);
  }

  lines.push(
    "Output expectation: Return a practical planning structure that could guide the next conversation or first implementation pass.",
  );

  return lines.join("\n");
}

function resolveOutputLanguage(handoff: RendererHandoff): string {
  return /[가-힣]/u.test(handoff.source.text) ? "Korean" : "Match the user's language";
}

function normalizePlanOutput(
  output: PlanOutput,
  fallback: PlanOutput,
): PlanOutput {
  const title = output.title?.trim() || fallback.title;
  const sections = normalizeSections(output.sections);
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    sections: sections.length >= 3 ? sections : fallback.sections,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function normalizeSections(sections: PlanSection[] | undefined): PlanSection[] {
  return (sections ?? [])
    .map((section) => ({
      title: section.title?.trim() ?? "",
      bullets: (section.bullets ?? [])
        .map((bullet) => bullet.trim())
        .filter(Boolean),
    }))
    .filter((section) => section.title && section.bullets.length > 0);
}
