import type { Renderer, RendererHandoff } from "@vive-studio/engine-contracts";

import type {
  ReviewFinding,
  ReviewReportOutput,
  ReviewSeverity,
} from "./review-report-output.js";
import { renderReviewReport } from "./render-review-report.js";
import { validateReviewReportOutput } from "./validate-review-report-output.js";

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

export type CreateReviewReportRendererOptions = {
  llmClient?: StructuredObjectGenerator | null;
  strictLlm?: boolean;
};

const reviewReportOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
    },
    verdict: {
      type: "string",
      enum: ["needs-revision", "usable-with-fixes"],
    },
    findings: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          title: {
            type: "string",
          },
          detail: {
            type: "string",
          },
          recommendation: {
            type: "string",
          },
        },
        required: ["severity", "title", "detail", "recommendation"],
      },
    },
    notes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["title", "verdict", "findings", "notes"],
} satisfies Record<string, unknown>;

export function createReviewReportRenderer(
  options: CreateReviewReportRendererOptions = {},
): Renderer<ReviewReportOutput> {
  return {
    id: "review-report",
    async render(handoff) {
      const fallback = renderReviewReport(handoff);

      if (!options.llmClient) {
        return fallback;
      }

      try {
        const generated =
          await options.llmClient.generateObject<ReviewReportOutput>({
            schemaName: "review_report_output",
            schemaDescription:
              "A review report with a verdict, actionable findings, and supporting notes.",
            schema: reviewReportOutputSchema,
            system: buildSystemPrompt(),
            user: buildUserPrompt(handoff),
            temperature: 0.25,
          });

        return normalizeReviewReportOutput(generated, fallback);
      } catch (error) {
        if (options.strictLlm) {
          throw error instanceof Error
            ? error
            : new Error("Review report generation failed.");
        }

        return fallback;
      }
    },
    validateOutput: validateReviewReportOutput,
  };
}

function buildSystemPrompt(): string {
  return [
    "You generate review report outputs for Vibe Studio.",
    "If the source text is in Korean, every output field must be written in Korean.",
    "For Korean output, use polite formal Korean endings such as ~습니다, ~합니다, and ~주세요.",
    "Do not use casual or plain Korean endings such as ~다, ~한다, ~했다, or terse noun-only fragments for user-facing sentences.",
    "Write in the user's source language unless the request clearly calls for another language.",
    "Findings must be actionable and must explain both what is weak and how to improve it.",
    "Review the given draft, prompt, or copy as-is. Do not rewrite the artifact into a finished replacement.",
    "Keep the tone specific, grounded, and useful for an AI beginner.",
    "Do not mention internal engine fields or validation language.",
  ].join("\n");
}

function buildUserPrompt(handoff: RendererHandoff): string {
  const { intent_ir: intentIr } = handoff;
  const artifactText = resolveArtifactText(handoff);
  const lines = [
    `Source text: ${handoff.source.text.trim()}`,
    `Required output language: ${resolveOutputLanguage(handoff)}`,
    `Artifact under review: ${artifactText}`,
    `Mode: ${intentIr.mode}`,
    `Summary: ${intentIr.summary.trim()}`,
    `Goal: ${intentIr.intent.goal.trim()}`,
    `Context: ${intentIr.intent.context.trim() || "None provided."}`,
  ];

  if (intentIr.analysis.risks.length > 0) {
    lines.push(`Risks: ${intentIr.analysis.risks.join(" | ")}`);
  }

  if (intentIr.output_contract.success_criteria.length > 0) {
    lines.push(
      `Success criteria: ${intentIr.output_contract.success_criteria.join(" | ")}`,
    );
  }

  lines.push(
    "Output expectation: Return a verdict, one or more findings with severity, and short notes that summarize the review focus.",
  );

  return lines.join("\n");
}

function resolveOutputLanguage(handoff: RendererHandoff): string {
  return /[가-힣]/u.test(handoff.source.text) ? "Korean" : "Match the user's language";
}

function resolveArtifactText(handoff: RendererHandoff): string {
  const artifactText = handoff.source.artifacts?.[0]?.text?.trim();

  if (artifactText) {
    return artifactText;
  }

  if (handoff.intent_ir.intent.context.trim()) {
    return handoff.intent_ir.intent.context.trim();
  }

  return handoff.source.text.trim();
}

function normalizeReviewReportOutput(
  output: ReviewReportOutput,
  fallback: ReviewReportOutput,
): ReviewReportOutput {
  const title = output.title?.trim() || fallback.title;
  const verdict =
    output.verdict === "needs-revision" || output.verdict === "usable-with-fixes"
      ? output.verdict
      : fallback.verdict;
  const findings = normalizeFindings(output.findings);
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    verdict,
    findings: findings.length > 0 ? findings : fallback.findings,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function normalizeFindings(findings: ReviewFinding[] | undefined): ReviewFinding[] {
  return (findings ?? [])
    .map((finding) => ({
      severity: normalizeSeverity(finding.severity),
      title: finding.title?.trim() ?? "",
      detail: finding.detail?.trim() ?? "",
      recommendation: finding.recommendation?.trim() ?? "",
    }))
    .filter(
      (finding) =>
        finding.title && finding.detail && finding.recommendation,
    );
}

function normalizeSeverity(severity: ReviewSeverity | string | undefined): ReviewSeverity {
  if (severity === "high" || severity === "medium" || severity === "low") {
    return severity;
  }

  return "medium";
}
