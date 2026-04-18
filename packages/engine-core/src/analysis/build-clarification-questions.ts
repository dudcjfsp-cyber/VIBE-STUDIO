import type {
  ClarificationQuestion,
  RendererId,
} from "@vive-studio/engine-contracts";

const QUESTION_MAP: Record<
  string,
  Omit<ClarificationQuestion, "id">
> = {
  "review.artifact": {
    question: "검토할 초안이나 결과물을 그대로 보여줄 수 있나요?",
    reason: "review 결과는 실제 검토 대상이 있어야 책임 있게 판단할 수 있습니다.",
    improves: "artifact under review",
    intent_key: "artifact",
    priority: "high",
  },
  "architecture.boundary": {
    question:
      "이번에 구조를 잡을 시스템 경계를 한 문장으로 적어줄 수 있나요?",
    reason:
      "architecture 결과는 어디까지를 같은 시스템으로 보고, 어떤 사용자와 기능을 포함할지 먼저 정해야 의미가 생깁니다.",
    improves: "system boundary",
    intent_key: "boundary",
    priority: "high",
  },
  "architecture.focus": {
    question:
      "이번 구조에서 특히 먼저 보고 싶은 초점을 한 가지로 좁혀줄 수 있나요? 예: MVP 범위, 사용자 역할, 주요 API, 데이터 모델, 권한",
    reason:
      "설계 초점이 정해져야 구조 설명이 퍼지지 않고, 기술 명세에 가까운 결과로 정리할 수 있습니다.",
    improves: "design focus",
    intent_key: "focus",
    priority: "medium",
  },
  "plan.problem_or_scope": {
    question:
      "이 아이디어가 해결하려는 문제나 이번에 정리할 범위를 한 문장으로 알려줄 수 있나요?",
    reason: "plan 결과는 문제와 범위가 드러나야 의미 있는 구조화가 가능합니다.",
    improves: "problem framing and scope",
    intent_key: "scope",
    priority: "high",
  },
  "prompt.goal": {
    question:
      "어떤 상황에서 바로 쓸 결과를 원하는지 조금만 더 구체적으로 말해줄 수 있나요?",
    reason:
      "prompt 결과는 전달 목표와 사용 상황이 있어야 바로 쓸 수 있는 형태로 정리됩니다.",
    improves: "core goal",
    intent_key: "goal",
    priority: "high",
  },
};

export function buildClarificationQuestions(
  missingItems: string[],
  renderer: RendererId,
): ClarificationQuestion[] {
  const fallbackQuestion: Omit<ClarificationQuestion, "id"> =
    renderer === "architecture"
      ? {
          question:
            "이번에 구조를 잡을 시스템 경계를 한 문장으로 적어줄 수 있나요?",
          reason:
            "architecture 결과는 시스템 경계가 먼저 정해져야 기술 명세 수준으로 정리할 수 있습니다.",
          improves: "system boundary",
          intent_key: "boundary",
          priority: "high",
        }
      : {
          question:
            "어떤 상황에서 바로 쓸 결과를 원하는지 조금만 더 구체적으로 말해줄 수 있나요?",
          reason:
            "prompt 결과는 전달 목표와 사용 상황이 있어야 바로 쓰기 좋게 정리됩니다.",
          improves: "core goal",
          intent_key: "goal",
          priority: "high",
        };

  return missingItems.map((missingItem, index) => {
    const base: Omit<ClarificationQuestion, "id"> =
      QUESTION_MAP[missingItem] ?? fallbackQuestion;

    return {
      id: `${missingItem}-${index + 1}`,
      ...base,
    };
  });
}
