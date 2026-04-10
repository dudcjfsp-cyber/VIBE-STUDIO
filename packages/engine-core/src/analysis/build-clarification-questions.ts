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
    reason: "review mode에서는 실제 검토 대상이 있어야 책임 있게 평가할 수 있습니다.",
    improves: "artifact under review",
    intent_key: "artifact",
    priority: "high",
  },
  "architecture.boundary": {
    question:
      "이번에 구조를 잡을 시스템 범위를 한 문장으로 알려줄 수 있나요?",
    reason: "architecture 결과는 어떤 서비스 경계까지 포함하는지 먼저 알아야 합니다.",
    improves: "system boundary",
    intent_key: "boundary",
    priority: "high",
  },
  "architecture.focus": {
    question:
      "전체 구조 중에서 특히 먼저 보고 싶은 초점(MVP 범위, 주요 흐름, 데이터/권한 등)은 무엇인가요?",
    reason: "구조 설계의 초점이 없으면 결과가 지나치게 넓고 얕아질 수 있습니다.",
    improves: "design focus",
    intent_key: "focus",
    priority: "medium",
  },
  "spec.problem_or_scope": {
    question:
      "이 아이디어가 해결하려는 문제나 이번에 정리할 범위를 한 문장으로 알려줄 수 있나요?",
    reason: "spec 결과는 문제와 범위가 드러나야 의미 있는 구조화가 가능합니다.",
    improves: "problem framing and scope",
    intent_key: "scope",
    priority: "high",
  },
  "prompt.goal": {
    question: "어떤 상황에서 바로 쓸 결과를 원하는지 조금만 더 구체적으로 말해줄 수 있나요?",
    reason: "prompt 계열 결과는 핵심 목표와 사용 상황이 있어야 책임 있게 만들 수 있습니다.",
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
            "이번에 구조를 잡을 시스템 범위를 한 문장으로 알려줄 수 있나요?",
          reason:
            "architecture 결과는 어떤 서비스 경계까지 포함하는지 먼저 알아야 합니다.",
          improves: "system boundary",
          intent_key: "boundary",
          priority: "high",
        }
      : {
          question:
            "어떤 상황에서 바로 쓸 결과를 원하는지 조금만 더 구체적으로 말해줄 수 있나요?",
          reason:
            "prompt 계열 결과는 핵심 목표와 사용 상황이 있어야 책임 있게 만들 수 있습니다.",
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
