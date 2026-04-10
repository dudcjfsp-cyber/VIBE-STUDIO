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

function formatStrengthSnapshot(strengths: string[]): string {
  if (strengths.length === 0) {
    return "Strength snapshot: no strong anchors yet.";
  }

  return `Strength snapshot: ${strengths.join(", ")}.`;
}

function formatNextBestMove(findings: ReviewFinding[]): string {
  const topFinding = findings[0];

  if (!topFinding) {
    return "Next best move: keep the current direction and do a final tightening pass.";
  }

  return `Next best move: address "${topFinding.title}" first.`;
}

function formatReviewFocus(kind: string): string {
  switch (kind) {
    case "prompt":
      return "Review focus: instruction clarity, task framing, input context, and explicit output constraints.";
    case "product-copy":
      return "Review focus: audience fit, value clarity, usage context, and overclaim control.";
    case "plan":
      return "Review focus: scope clarity, target user, success criteria, and non-goal discipline.";
    case "architecture":
      return "Review focus: boundary clarity, component responsibility, interaction flow, and design tradeoffs.";
    default:
      return "Review focus: clarity, audience fit, completeness, and explicit constraints.";
  }
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
      formatStrengthSnapshot(insight.strengths),
      formatCoverageNote(insight.missingAreas, insight.strengths),
      formatNextBestMove(findings),
      formatReviewFocus(insight.artifactKind),
      `Artifact excerpt: ${insight.excerpt}`,
      `Artifact size: ${insight.tokenCount} tokens.`,
    ],
  };
}
