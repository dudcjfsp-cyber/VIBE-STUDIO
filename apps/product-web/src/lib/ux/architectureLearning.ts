import type { EngineResult } from "@vive-studio/engine-contracts";
import type { ArchitectureOutput } from "@vive-studio/renderer-architecture";

type ArchitectureLearningPoint = {
  applied: boolean;
  label: string;
  reason: string;
  whenToUse: string;
};

export type ArchitectureLearningPanel = {
  points: ArchitectureLearningPoint[];
  summaryItems: string[];
};

export function buildArchitectureLearningPanel(
  result: EngineResult,
  output: ArchitectureOutput,
): ArchitectureLearningPanel {
  const hasBoundary = output.system_boundary.trim().length > 0;
  const hasActors = output.actors.length > 0;
  const hasComponentSplit = output.components.length >= 3;
  const hasFlow = output.interaction_flows.some((flow) => flow.steps.length >= 2);
  const hasExclusions = output.mvp_exclusions.length > 0;
  const hasLaterDecisions = output.later_decisions.length > 0;
  const hasOpenQuestions =
    result.intent_ir.analysis.missing_information.length > 0 ||
    result.intent_ir.analysis.clarification_questions.length > 0 ||
    hasAny(readArchitectureText(output), ["trade-off", "주의", "확인", "missing"]);

  const points: ArchitectureLearningPoint[] = [
    {
      applied: hasBoundary,
      label: "시스템 경계 먼저 긋기",
      reason: hasBoundary
        ? "이번 구조는 어디까지를 한 시스템으로 볼지 먼저 정해, 기능 설명이 끝없이 퍼지지 않게 했습니다."
        : "이번 결과는 시스템 경계가 약해, 다음에는 포함할 것과 제외할 것을 먼저 나누면 좋습니다.",
      whenToUse:
        "앱, 서비스, 자동화처럼 여러 기능이 섞이는 아이디어를 구조로 바꿀 때 씁니다.",
    },
    {
      applied: hasActors,
      label: "행위자부터 확인하기",
      reason: hasActors
        ? "이번 구조는 누가 시스템에 참여하는지 먼저 보여줘, 화면과 백엔드 구성요소가 누구를 위해 움직이는지 연결했습니다."
        : "이번 결과는 행위자가 약해, 다음에는 사용자, 운영자, 외부 서비스처럼 참여 주체를 먼저 적으면 좋습니다.",
      whenToUse:
        "화면과 기능은 보이지만 누가 어떤 행동을 하는지 흐릴 때 씁니다.",
    },
    {
      applied: hasComponentSplit,
      label: "책임별 구성요소로 나누기",
      reason: hasComponentSplit
        ? `이번 구조는 ${output.components.length}개의 구성요소로 역할을 나눠, 각 부분이 무엇을 맡는지 보이게 했습니다.`
        : "이번 구조는 구성요소 분리가 아직 적어, 저장, 화면, 처리, 외부 연동 같은 책임을 더 나누면 좋습니다.",
      whenToUse:
        "한 덩어리 아이디어를 구현 가능한 부품 단위로 쪼개야 할 때 씁니다.",
    },
    {
      applied: hasFlow,
      label: "사용 흐름으로 연결하기",
      reason: hasFlow
        ? "이번 구조는 구성요소만 나열하지 않고, 사용자의 행동과 시스템 반응이 어떤 순서로 이어지는지 함께 보여줬습니다."
        : "이번 결과는 흐름 설명이 약해, 사용자가 시작해서 결과를 받기까지의 순서를 더 적으면 좋습니다.",
      whenToUse:
        "구성요소 이름은 보이지만 실제로 어떻게 움직이는지 상상이 잘 안 될 때 씁니다.",
    },
    {
      applied: hasExclusions,
      label: "MVP에서 뺄 것 정하기",
      reason: hasExclusions
        ? "이번 구조는 처음 버전에 넣지 않을 항목을 따로 적어, 설계가 커지는 것을 막았습니다."
        : "이번 결과는 제외 범위가 약해, 다음에는 MVP에서 다루지 않을 기능을 함께 정하면 좋습니다.",
      whenToUse:
        "서비스 구조가 자꾸 커질 때 처음 버전 밖으로 둘 것을 정합니다.",
    },
    {
      applied: hasOpenQuestions || hasLaterDecisions,
      label: "나중에 결정할 것 남기기",
      reason: hasLaterDecisions
        ? "이번 구조는 아직 확정하지 않은 선택지를 따로 남겨, 설계를 최종안처럼 오해하지 않게 했습니다."
        : "이번 입력은 비교적 단순하지만, 실제 구현 전에는 권한, 데이터 저장, 외부 연동 같은 열린 결정을 확인하는 편이 안전합니다.",
      whenToUse:
        "구조가 그럴듯해 보여도 아직 결정하지 않은 조건이 있을 때 씁니다.",
    },
  ];

  return {
    points,
    summaryItems: points
      .filter((point) => point.applied)
      .map((point) => point.label)
      .slice(0, 4),
  };
}

function readArchitectureText(output: ArchitectureOutput): string {
  return [
    output.title,
    output.system_boundary,
    ...output.notes,
    ...output.components.flatMap((component) => [
      component.name,
      component.responsibility,
    ]),
    ...output.interaction_flows.flatMap((flow) => [flow.name, ...flow.steps]),
  ].join(" ");
}

function hasAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();

  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}
