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
            "A reusable prompt draft with a short title, prompt body, and supporting notes.",
          schema: promptOutputSchema,
          system: buildSystemPrompt(),
          user: buildUserPrompt(handoff),
          temperature: 0.4,
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
    "Return directly usable prompt drafts, not meta commentary.",
    "Write in the user's source language unless the request clearly calls for another language.",
    "The prompt field must contain the full prompt text that the user can copy and use immediately.",
    "Make the prompt concrete enough that another model could act on it without extra explanation.",
    "Keep the output grounded in the provided intent, context, and constraints.",
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
    "Output expectation: Return a polished prompt draft with concrete instructions, useful output requirements, and no extra wrapper explanation.",
  );

  return lines.join("\n");
}

function normalizePromptOutput(
  output: PromptOutput,
  fallback: PromptOutput,
): PromptOutput {
  const title = output.title?.trim() || fallback.title;
  const prompt = output.prompt?.trim() || fallback.prompt;
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    prompt,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}
