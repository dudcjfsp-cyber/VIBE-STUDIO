import type { Renderer, RendererHandoff } from "@vive-studio/engine-contracts";

import type {
  ArchitectureActor,
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
    actors: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
          },
          role: {
            type: "string",
          },
        },
        required: ["name", "role"],
      },
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
    mvp_exclusions: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    later_decisions: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
  },
  required: [
    "title",
    "system_boundary",
    "actors",
    "components",
    "interaction_flows",
    "mvp_exclusions",
    "later_decisions",
    "notes",
  ],
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
              "An MVP conversation architecture summary with a clear boundary, actors, major components, interaction flows, MVP exclusions, later decisions, and supporting notes.",
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
    "Do not make an enterprise architecture document. This is a beginner-friendly structure for deciding what the system includes, who participates, and how the first flow moves.",
    "Do not invent unsupported infrastructure or enterprise-scale systems.",
    "State the system boundary clearly, name the main actors, split component responsibilities cleanly, and describe the main interaction flows step by step.",
    "Always separate MVP exclusions and later decisions so the user can see what is intentionally not solved yet.",
    "Use notes to explain that the architecture is for MVP discussion, not a final technical spec.",
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
    "Output expectation: Return an MVP-oriented architecture result with one clear system boundary, main actors, at least three components, at least one interaction flow, MVP exclusions, and later decisions.",
    "Keep MVP exclusions short and explicit. Do not hide undecided scope inside component descriptions.",
    "If information is missing, put it in later_decisions rather than inventing a fact.",
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
  const actors = normalizeActors(output.actors);
  const components = normalizeComponents(output.components);
  const flows = normalizeFlows(output.interaction_flows);
  const mvpExclusions = normalizeStringList(output.mvp_exclusions);
  const laterDecisions = normalizeStringList(output.later_decisions);
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    system_boundary: systemBoundary,
    actors: actors.length > 0 ? actors : fallback.actors,
    components: components.length >= 3 ? components : fallback.components,
    interaction_flows: flows.length > 0 ? flows : fallback.interaction_flows,
    mvp_exclusions:
      mvpExclusions.length > 0 ? mvpExclusions : fallback.mvp_exclusions,
    later_decisions:
      laterDecisions.length > 0 ? laterDecisions : fallback.later_decisions,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function normalizeActors(actors: ArchitectureActor[] | undefined): ArchitectureActor[] {
  return (actors ?? [])
    .map((actor) => ({
      name: actor.name?.trim() ?? "",
      role: actor.role?.trim() ?? "",
    }))
    .filter((actor) => actor.name && actor.role);
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

function normalizeStringList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}
