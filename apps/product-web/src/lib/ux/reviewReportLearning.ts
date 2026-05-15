import type { EngineResult } from "@vive-studio/engine-contracts";
import type {
  ReviewReportOutput,
  ReviewSeverity,
} from "@vive-studio/renderer-review-report";

type ReviewReportLearningPoint = {
  applied: boolean;
  label: string;
  reason: string;
  whenToUse: string;
};

export type ReviewReportLearningPanel = {
  points: ReviewReportLearningPoint[];
  summaryItems: string[];
};

export function buildReviewReportLearningPanel(
  result: EngineResult,
  output: ReviewReportOutput,
): ReviewReportLearningPanel {
  const severityCounts = countSeverities(output);
  const hasHighPriorityFinding = severityCounts.high > 0 || severityCounts.medium > 0;
  const hasActionableRecommendation = output.findings.some(
    (finding) =>
      finding.detail.trim().length > 0 &&
      finding.recommendation.trim().length > 0,
  );
  const hasCoverageSignal =
    hasAny(readReviewText(output), ["coverage", "범위", "focus", "검토", "비어"]) ||
    result.intent_ir.analysis.missing_information.length > 0 ||
    result.intent_ir.analysis.clarification_questions.length > 0;
  const hasPrioritySignal = output.improvement_priorities.length > 0;
  const hasActionRecommendation = output.action_recommendation.reason.trim().length > 0;

  const points: ReviewReportLearningPoint[] = [
    {
      applied: hasHighPriorityFinding,
      label: "심각도부터 보기",
      reason: hasHighPriorityFinding
        ? `이번 검토는 ${formatSeverityCounts(severityCounts)}로 문제의 우선순위를 먼저 볼 수 있게 정리했습니다.`
        : "이번 검토는 큰 위험보다 작은 보완점 중심이라, 심각도보다 빠진 맥락을 확인하는 쪽이 더 중요했습니다.",
      whenToUse:
        "문제가 여러 개일 때 무엇부터 고쳐야 할지 빠르게 정해야 할 때 씁니다.",
    },
    {
      applied: hasActionableRecommendation,
      label: "문제와 수정 제안 분리하기",
      reason: hasActionableRecommendation
        ? "이번 검토는 발견한 문제와 권장 수정 방향을 나눠, 지적에서 바로 다음 행동으로 이어지게 했습니다."
        : "이번 결과에는 수정 제안이 충분히 구체적이지 않은 항목이 있어, 다음에는 어떻게 고칠지까지 확인하는 편이 좋습니다.",
      whenToUse:
        "검토 결과가 비판으로만 보이지 않고 실제 수정 작업으로 이어져야 할 때 씁니다.",
    },
    {
      applied: hasCoverageSignal,
      label: "검토 범위와 빠진 맥락 확인하기",
      reason: hasCoverageSignal
        ? "이번 검토는 무엇을 기준으로 봤는지와 더 확인할 맥락을 함께 남겨, 판단을 과하게 확정하지 않도록 했습니다."
        : "이번 입력은 검토 기준이 비교적 단순해 보이지만, 중요한 문서일수록 범위와 기준을 먼저 고정하는 편이 안전합니다.",
      whenToUse:
        "검토 대상이 문서, 기획, 프롬프트처럼 해석 여지가 있을 때 씁니다.",
    },
    {
      applied: hasPrioritySignal,
      label: "개선 우선순위 만들기",
      reason: hasPrioritySignal
        ? "이번 검토는 지적을 나열하는 데서 멈추지 않고, 무엇부터 고칠지 순서로 정리했습니다."
        : "이번 검토는 우선순위가 약해, 다음에는 가장 먼저 고칠 항목을 따로 정하면 좋습니다.",
      whenToUse:
        "고칠 것이 여러 개라 어디서 시작해야 할지 애매할 때 씁니다.",
    },
    {
      applied: hasActionRecommendation,
      label: "바로 고칠지 먼저 물을지 정하기",
      reason: hasActionRecommendation
        ? "이번 검토는 바로 수정해도 되는지, 먼저 확인 질문이 필요한지까지 나눠 다음 행동을 더 안전하게 만들었습니다."
        : "이번 결과는 다음 행동 판단이 약해, 바로 수정할지 질문부터 할지 분리하면 좋습니다.",
      whenToUse:
        "초안이 부족할 때 무작정 고치면 오히려 엉뚱한 방향으로 갈 수 있을 때 씁니다.",
    },
  ];

  return {
    points,
    summaryItems: points
      .filter((point) => point.applied)
      .map((point) => point.label)
      .slice(0, 3),
  };
}

function countSeverities(output: ReviewReportOutput): Record<ReviewSeverity, number> {
  return output.findings.reduce<Record<ReviewSeverity, number>>(
    (counts, finding) => ({
      ...counts,
      [finding.severity]: counts[finding.severity] + 1,
    }),
    { high: 0, low: 0, medium: 0 },
  );
}

function formatSeverityCounts(counts: Record<ReviewSeverity, number>): string {
  return [
    counts.high > 0 ? `높음 ${counts.high}개` : undefined,
    counts.medium > 0 ? `보통 ${counts.medium}개` : undefined,
    counts.low > 0 ? `낮음 ${counts.low}개` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
}

function readReviewText(output: ReviewReportOutput): string {
  return [
    output.title,
    output.verdict,
    ...output.strengths,
    ...output.weak_points,
    ...output.missing_assumptions,
    ...output.risky_assumptions,
    ...output.improvement_priorities,
    output.action_recommendation.next_step,
    output.action_recommendation.reason,
    ...output.notes,
    ...output.findings.flatMap((finding) => [
      finding.severity,
      finding.title,
      finding.detail,
      finding.recommendation,
    ]),
  ].join(" ");
}

function hasAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();

  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}
