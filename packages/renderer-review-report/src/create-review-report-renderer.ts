import type { Renderer, RendererHandoff } from "@vive-studio/engine-contracts";

import type {
  ReviewActionRecommendation,
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
    strengths: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    weak_points: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    missing_assumptions: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    risky_assumptions: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    improvement_priorities: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
    action_recommendation: {
      type: "object",
      additionalProperties: false,
      properties: {
        next_step: {
          type: "string",
          enum: ["revise_now", "clarify_first"],
        },
        reason: {
          type: "string",
        },
      },
      required: ["next_step", "reason"],
    },
  },
  required: [
    "title",
    "verdict",
    "strengths",
    "weak_points",
    "missing_assumptions",
    "risky_assumptions",
    "improvement_priorities",
    "action_recommendation",
    "findings",
    "notes",
  ],
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
              "A review report with strengths, weaknesses, missing assumptions, risky assumptions, prioritized improvements, an action recommendation, actionable findings, and supporting notes.",
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
    "Separate what is already working, what is weak, which assumptions are missing, which assumptions are risky, and what to improve first.",
    "Decide whether the user can revise now or should clarify first before rewriting.",
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
    "Output expectation: Return strengths, weak_points, missing_assumptions, risky_assumptions, improvement_priorities, action_recommendation, a verdict, one or more findings with severity, and short notes that summarize the review focus.",
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

  const inlineArtifact = extractInlineArtifact(handoff.source.text);

  if (inlineArtifact) {
    return inlineArtifact;
  }

  if (handoff.intent_ir.intent.context.trim()) {
    return handoff.intent_ir.intent.context.trim();
  }

  return handoff.source.text.trim();
}

function extractInlineArtifact(sourceText: string): string | undefined {
  const normalized = sourceText.replace(/\r\n/g, "\n").trim();
  const quoted = normalized.match(/["“](.+?)["”]/su)?.[1]?.trim();

  if (quoted) {
    return quoted;
  }

  const reviewMarker = /(?:검토해줘|봐줘|점검해줘)\s*:\s*/u.exec(normalized);

  if (!reviewMarker) {
    return undefined;
  }

  const afterMarker = normalized.slice(reviewMarker.index + reviewMarker[0].length);
  const firstLine = afterMarker.split("\n")[0]?.trim();

  return firstLine?.replace(/^["“]|["”]$/gu, "").trim() || undefined;
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
  const strengths = normalizeStringList(output.strengths);
  const weakPoints = normalizeStringList(output.weak_points);
  const missingAssumptions = normalizeStringList(output.missing_assumptions);
  const riskyAssumptions = normalizeStringList(output.risky_assumptions);
  const improvementPriorities = normalizeStringList(output.improvement_priorities);
  const actionRecommendation = normalizeActionRecommendation(
    output.action_recommendation,
    fallback.action_recommendation,
  );
  const findings = normalizeFindings(output.findings);
  const notes = (output.notes ?? [])
    .map((note) => note.trim())
    .filter(Boolean);

  return {
    title,
    verdict,
    strengths: strengths.length > 0 ? strengths : fallback.strengths,
    weak_points: weakPoints.length > 0 ? weakPoints : fallback.weak_points,
    missing_assumptions:
      missingAssumptions.length > 0
        ? missingAssumptions
        : fallback.missing_assumptions,
    risky_assumptions:
      riskyAssumptions.length > 0
        ? riskyAssumptions
        : fallback.risky_assumptions,
    improvement_priorities:
      improvementPriorities.length > 0
        ? improvementPriorities
        : fallback.improvement_priorities,
    action_recommendation: actionRecommendation,
    findings: findings.length > 0 ? findings : fallback.findings,
    notes: notes.length > 0 ? notes : fallback.notes,
  };
}

function normalizeStringList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function normalizeActionRecommendation(
  value: ReviewActionRecommendation | undefined,
  fallback: ReviewActionRecommendation,
): ReviewActionRecommendation {
  if (
    value &&
    (value.next_step === "revise_now" || value.next_step === "clarify_first") &&
    value.reason?.trim()
  ) {
    return {
      next_step: value.next_step,
      reason: value.reason.trim(),
    };
  }

  return fallback;
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
