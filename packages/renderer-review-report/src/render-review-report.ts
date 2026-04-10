import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { ReviewFinding, ReviewReportOutput } from "./review-report-output.js";
import { analyzeReviewArtifact } from "./review-taxonomy.js";

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

function deriveVerdict(
  findings: ReviewFinding[],
): ReviewReportOutput["verdict"] {
  return findings.some((finding) => finding.severity === "high")
    ? "needs-revision"
    : "usable-with-fixes";
}

function formatFindingProfile(findings: ReviewFinding[]): string {
  const counts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return `Finding profile: ${counts.high} high / ${counts.medium} medium / ${counts.low} low.`;
}

function formatCoverageNote(
  missingAreas: string[],
  strengths: string[],
): string {
  if (missingAreas.length === 0) {
    return `Coverage snapshot: explicit ${strengths.join(", ")} already present.`;
  }

  return `Coverage gaps: ${missingAreas.join(", ")}.`;
}

function formatArtifactKind(kind: string): string {
  return `Artifact kind: ${kind}.`;
}

export function renderReviewReport(
  handoff: RendererHandoff,
): ReviewReportOutput {
  const artifactText = resolveArtifactText(handoff);
  const { findings, insight } = analyzeReviewArtifact(artifactText);

  return {
    title: "Review Report",
    verdict: deriveVerdict(findings),
    findings,
    notes: [
      `Mode: ${handoff.intent_ir.mode}`,
      `Confidence: ${handoff.intent_ir.signals.confidence}`,
      formatArtifactKind(insight.artifactKind),
      formatFindingProfile(findings),
      formatCoverageNote(insight.missingAreas, insight.strengths),
      "Review focus: clarity, audience fit, completeness, and explicit constraints.",
      `Artifact excerpt: ${insight.excerpt}`,
      `Artifact size: ${insight.tokenCount} tokens.`,
    ],
  };
}
