import type { Renderer, RendererHandoff } from "@vive-studio/engine-contracts";

import type {
  ArchitectureComponent,
  ArchitectureFlow,
  ArchitectureOutput,
} from "./architecture-output.js";
import { renderArchitecture } from "./render-architecture.js";
import { validateArchitectureOutput } from "./validate-architecture-output.js";

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

export type CreateArchitectureRendererOptions = {
  llmClient?: StructuredObjectGenerator | null;
  strictLlm?: boolean;
};

const architectureOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
    },
    system_boundary: {
      type: "string",
    },
    components: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
          },
          responsibility: {
            type: "string",
          },
        },
        required: ["name", "responsibility"],
      },
    },
    interaction_flows: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
          },
          steps: {
            type: "array",
            minItems: 2,
            items: {
              type: "string",
            },
          },
        },
        required: ["name", "steps"],
      },
    },
    notes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["title", "system_boundary", "components", "interaction_flows", "notes"],
} satisfies Record<string, unknown>;

export function createArchitectureRenderer(
  options: CreateArchitectureRendererOptions = {},
): Renderer<ArchitectureOutput> {
  return {
    id: "architecture",
    async render(handoff) {
      const fallback = renderArchitecture(handoff);

      if (!options.llmClient) {
        return fallback;
      }

      try {
        const generated =
          await options.llmClient.generateObject<ArchitectureOutput>({
            schemaName: "architecture_output",
            schemaDescription:
              "A system architecture summary with a clear boundary, major components, interaction flows, and supporting notes.",
            schema: architectureOutputSchema,
            system: buildSystemPrompt(),
            user: buildUserPrompt(handoff),
            temperature: 0.35,
          });

        return normalizeArchitectureOutput(generated, fallback);
      } catch (error) {
        if (options.strictLlm) {
          throw error instanceof Error
            ? error
            : new Error("Architecture generation failed.");
        }

        return fallback;
      }
    },
    validateOutput: validateArchitectureOutput,
  };
}

function buildSystemPrompt(): string {
  return [
    "You generate architecture outputs for Vibe Studio.",
    "If the source text is in Korean, every output field must be written in Korean.",
    "For Korean output, use polite formal Korean endings such as ~습니다, ~합니다, and ~주세요.",
    "Do not use casual or plain Korean endings such as ~다, ~한다, ~했다, or terse noun-only fragments for user-facing sentences.",
    "Write in the user's source language unless the request clearly calls for another language.",
    "Keep the result concrete and technical enough to guide an MVP conversation.",
    "Do not invent unsupported infrastructure or enterprise-scale systems.",
    "State the system boundary clearly, split component responsibilities cleanly, and describe the main interaction flows step by step.",
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

  if (intentIr.analysis.missing_information.length > 0) {
    lines.push(
      `Known missing information: ${intentIr.analysis.missing_information.join(" | ")}`,
    );
  }

  if (intentIr.analysis.risks.length > 0) {
    lines.push(`Risks: ${intentIr.analysis.risks.join(" | ")}`);
  }

  if (intentIr.output_contract.constraints.length > 0) {
    lines.push(
      `Constraints: ${intentIr.output_contract.constraints.join(" | ")}`,
    );
  }

  lines.push(
    "Output expectation: Return an MVP-oriented architecture result with one clear system boundary, at least three components, and at least one interaction flow.",
  );

  return lines.join("\n");
}

function resolveOutputLanguage(handoff: RendererHandoff): string {
  return /[가-힣]/u.test(handoff.source.text) ? "Korean" : "Match the user's language";
}

function normalizeArchitectureOutput(
  output: ArchitectureOutput,
  fallback: ArchitectureOutput,
): ArchitectureOutput {
  const title = output.title?.trim() || fallback.title;
  const systemBoundary = output.system_boundary?.trim() || fallback.system_boundary;
  const components = normalizeComponents(output.components);
  const flows = normalizeFlows(output.interaction_flows);
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    system_boundary: systemBoundary,
    components: components.length >= 3 ? components : fallback.components,
    interaction_flows: flows.length > 0 ? flows : fallback.interaction_flows,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function normalizeComponents(
  components: ArchitectureComponent[] | undefined,
): ArchitectureComponent[] {
  return (components ?? [])
    .map((component) => ({
      name: component.name?.trim() ?? "",
      responsibility: component.responsibility?.trim() ?? "",
    }))
    .filter((component) => component.name && component.responsibility);
}

function normalizeFlows(
  flows: ArchitectureFlow[] | undefined,
): ArchitectureFlow[] {
  return (flows ?? [])
    .map((flow) => ({
      name: flow.name?.trim() ?? "",
      steps: (flow.steps ?? []).map((step) => step.trim()).filter(Boolean),
    }))
    .filter((flow) => flow.name && flow.steps.length >= 2);
}
