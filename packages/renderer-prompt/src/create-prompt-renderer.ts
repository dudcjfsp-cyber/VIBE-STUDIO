import type { Renderer, RendererHandoff } from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";
import { renderPrompt } from "./render-prompt.js";
import { validatePromptOutput } from "./validate-prompt-output.js";

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

export type CreatePromptRendererOptions = {
  llmClient?: StructuredObjectGenerator | null;
  strictLlm?: boolean;
};

const promptOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
    },
    prompt: {
      type: "string",
    },
    notes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["title", "prompt", "notes"],
} satisfies Record<string, unknown>;

export function createPromptRenderer(
  options: CreatePromptRendererOptions = {},
): Renderer<PromptOutput> {
  return {
    id: "prompt",
    async render(handoff) {
      const fallback = renderPrompt(handoff);

      if (!options.llmClient) {
        return fallback;
      }

      try {
        const generated = await options.llmClient.generateObject<PromptOutput>({
          schemaName: "prompt_output",
          schemaDescription:
            "A ready-to-paste AI prompt with a short title, a full prompt body, and supporting notes.",
          schema: promptOutputSchema,
          system: buildSystemPrompt(),
          user: buildUserPrompt(handoff),
          temperature: 0.35,
        });

        return normalizePromptOutput(generated, fallback);
      } catch (error) {
        if (options.strictLlm) {
          throw error instanceof Error
            ? error
            : new Error("Prompt generation failed.");
        }

        return fallback;
      }
    },
    validateOutput: validatePromptOutput,
  };
}

function buildSystemPrompt(): string {
  return [
    "You generate prompt outputs for Vibe Studio.",
    "The prompt field must be a complete prompt that the user can paste into another AI model immediately.",
    "Do not write a request to the user. Do not explain what the prompt does outside the prompt itself.",
    "Write in the user's source language unless the request clearly calls for another language.",
    "Choose a prompting technique that fits the request: zero-shot by default, few-shot only when examples or style anchoring would materially help, and explicit structure/output-format instructions whenever they improve reliability.",
    "Prefer crisp sectioned prompts with role, task, context, constraints, and output format when useful.",
    "Keep the prompt grounded in the provided intent, context, and constraints.",
    "Do not mention internal engine fields or analysis terminology.",
  ].join("\n");
}

function buildUserPrompt(handoff: RendererHandoff): string {
  const { intent_ir: intentIr } = handoff;
  const lines = [
    `Source text: ${handoff.source.text.trim()}`,
    `Mode: ${intentIr.mode}`,
    `Goal: ${intentIr.intent.goal.trim()}`,
    `Context: ${intentIr.intent.context.trim() || "None provided."}`,
    `Audience: ${intentIr.intent.audience.trim() || "Not specified."}`,
    `Tone: ${intentIr.intent.tone.trim() || "Not specified."}`,
    `Summary: ${intentIr.summary.trim()}`,
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

  if (intentIr.analysis.risks.length > 0) {
    lines.push(`Risks: ${intentIr.analysis.risks.join(" | ")}`);
  }

  if (intentIr.analysis.assumptions.length > 0) {
    lines.push(`Assumptions: ${intentIr.analysis.assumptions.join(" | ")}`);
  }

  lines.push(
    "Output expectation: Return one polished AI prompt that is ready to paste into another model right away.",
    "The prompt should tell the downstream AI what role to take, what to produce, what to pay attention to, and what output format to follow.",
    "Use few-shot examples only if the request itself implies examples, imitation, transformation from a sample, or a strong need for tone anchoring.",
    "Do not produce meta commentary such as '안녕하세요, 저는...' unless the user explicitly wants that phrasing inside the downstream prompt.",
  );

  return lines.join("\n");
}

function normalizePromptOutput(
  output: PromptOutput,
  fallback: PromptOutput,
): PromptOutput {
  const title = output.title?.trim() || fallback.title;
  const prompt = normalizePromptText(output.prompt) || fallback.prompt;
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    prompt,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function normalizePromptText(value: string | undefined): string {
  return value?.trim() ?? "";
}
