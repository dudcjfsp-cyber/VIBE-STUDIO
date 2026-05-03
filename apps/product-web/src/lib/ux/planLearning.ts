import type { EngineResult } from "@vive-studio/engine-contracts";
import type { PlanOutput } from "@vive-studio/renderer-plan";

type PlanLearningPoint = {
  applied: boolean;
  label: string;
  reason: string;
  whenToUse: string;
};

export type PlanLearningPanel = {
  points: PlanLearningPoint[];
  summaryItems: string[];
};

export function buildPlanLearningPanel(
  result: EngineResult,
  output: PlanOutput,
): PlanLearningPanel {
  const planText = readPlanText(output);
  const sourceText = result.source.text.trim();
  const combinedText = `${planText} ${sourceText}`;
  const hasProblem = hasAny(combinedText, ["문제", "pain", "해결"]);
  const hasAudience = hasAny(combinedText, [
    "사용자",
    "대상",
    "audience",
    "user",
  ]);
  const hasProblemAndAudience = hasProblem && hasAudience;
  const hasScope = hasAny(combinedText, [
    "mvp",
    "범위",
    "핵심",
    "처음",
    "나중",
    "제외",
    "scope",
  ]);
  const hasSuccessOrQuestions =
    hasAny(combinedText, ["성공", "기준", "목표", "질문", "확인", "success"]) ||
    result.intent_ir.analysis.clarification_questions.length > 0;

  const points: PlanLearningPoint[] = [
    {
      applied: hasProblemAndAudience,
      label: "문제와 대상 나눠 보기",
      reason: hasProblemAndAudience
        ? "이번 계획은 해결하려는 문제와 핵심 사용자를 나눠 아이디어가 누구를 위한 것인지 먼저 보이게 했습니다."
        : "이번 입력은 문제와 대상이 아직 한 덩어리로 남아 있어, 다음에는 둘을 분리하면 계획의 방향이 더 선명해집니다.",
      whenToUse:
        "아이디어가 넓게 느껴질 때 먼저 누가 어떤 문제를 겪는지 나눠 봅니다.",
    },
    {
      applied: hasScope,
      label: "MVP 범위 잡기",
      reason: hasScope
        ? "이번 계획은 처음 버전에 집중할 범위를 잡아 구현이나 다음 검토로 넘기기 쉽게 정리했습니다."
        : "이번 입력은 하고 싶은 일이 넓게 열려 있어, 처음 버전과 나중 버전을 나누면 실행 부담이 줄어듭니다.",
      whenToUse:
        "기능이 계속 늘어날 때 꼭 필요한 것과 나중에 넣을 것을 구분합니다.",
    },
    {
      applied: hasSuccessOrQuestions,
      label: "성공 기준과 열린 질문 남기기",
      reason: hasSuccessOrQuestions
        ? "이번 계획은 다음 판단에 필요한 기준이나 질문을 남겨, 바로 구현으로 뛰기 전에 확인할 지점을 만들었습니다."
        : "이번 입력은 성공 여부를 판단할 기준이 아직 약해, 다음에는 무엇이 되면 성공인지 함께 적으면 좋습니다.",
      whenToUse:
        "계획이 그럴듯해 보여도 무엇을 확인해야 할지 애매할 때 씁니다.",
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

function readPlanText(output: PlanOutput): string {
  return [
    output.title,
    ...output.sections.flatMap((section) => [section.title, ...section.bullets]),
    ...output.notes,
  ].join(" ");
}

function hasAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();

  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}
