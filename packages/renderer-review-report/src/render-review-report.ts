import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { ReviewFinding, ReviewReportOutput } from "./review-report-output.js";
import { analyzeReviewArtifact } from "./review-taxonomy.js";

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

function buildStrengths(strengths: string[]): string[] {
  if (strengths.length === 0) {
    return ["아직 강한 기준점은 적지만, 검토할 초안을 가져온 것 자체가 다음 개선의 출발점입니다."];
  }

  return strengths.map((strength) => `${strength} 항목이 초안 안에 어느 정도 드러납니다.`);
}

function buildWeakPoints(findings: ReviewFinding[]): string[] {
  return findings.map((finding) => finding.title);
}

function buildMissingAssumptions(missingAreas: string[]): string[] {
  if (missingAreas.length === 0) {
    return ["검토에 필요한 핵심 전제는 비교적 잘 보입니다."];
  }

  return missingAreas.map((area) => `${area}에 대한 전제가 아직 충분히 드러나지 않았습니다.`);
}

function buildRiskyAssumptions(
  findings: ReviewFinding[],
  missingAreas: string[],
): string[] {
  const risks = findings
    .filter((finding) => finding.severity !== "low")
    .map((finding) => `"${finding.title}" 항목을 그대로 두면 결과가 사용자의 의도와 다르게 해석될 수 있습니다.`);

  if (missingAreas.length > 0) {
    risks.push(`빠진 전제(${missingAreas.join(", ")})를 모델이 임의로 채울 수 있습니다.`);
  }

  return risks.length > 0
    ? risks
    : ["현재 초안은 큰 위험보다 마지막 선명도 보강이 더 중요해 보입니다."];
}

function buildImprovementPriorities(findings: ReviewFinding[]): string[] {
  return findings.slice(0, 3).map((finding, index) =>
    `${index + 1}. ${finding.title}: ${finding.recommendation}`,
  );
}

function buildActionRecommendation(
  findings: ReviewFinding[],
  missingAreas: string[],
): ReviewReportOutput["action_recommendation"] {
  const hasHighFinding = findings.some((finding) => finding.severity === "high");

  if (hasHighFinding || missingAreas.length >= 3) {
    return {
      next_step: "clarify_first",
      reason: "바로 고치기보다 대상, 사용 맥락, 성공 기준을 먼저 확인해야 수정 방향이 안정적입니다.",
    };
  }

  return {
    next_step: "revise_now",
    reason: "핵심 방향은 보이므로, 현재 발견 항목을 기준으로 바로 다듬어도 괜찮습니다.",
  };
}

export function renderReviewReport(
  handoff: RendererHandoff,
): ReviewReportOutput {
  const artifactText = resolveArtifactText(handoff);
  const { findings, insight } = analyzeReviewArtifact(artifactText);

  return {
    title: "검토 리포트",
    verdict: deriveVerdict(findings),
    strengths: buildStrengths(insight.strengths),
    weak_points: buildWeakPoints(findings),
    missing_assumptions: buildMissingAssumptions(insight.missingAreas),
    risky_assumptions: buildRiskyAssumptions(findings, insight.missingAreas),
    improvement_priorities: buildImprovementPriorities(findings),
    action_recommendation: buildActionRecommendation(
      findings,
      insight.missingAreas,
    ),
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
      `Review action: ${buildActionRecommendation(findings, insight.missingAreas).next_step}.`,
      `Artifact excerpt: ${insight.excerpt}`,
      `Artifact size: ${insight.tokenCount} tokens.`,
    ],
  };
}
