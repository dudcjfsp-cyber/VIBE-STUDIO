import type {
  ApprovalLevel,
  EngineResult,
  RendererId,
} from "@vive-studio/engine-contracts";

export type DecisionCardCopy = {
  items: {
    label: string;
    value: string;
  }[];
  reasons: string[];
  title: string;
};

export type InputImprovementHints = {
  items: {
    example: string;
    title: string;
  }[];
  lead: string;
  title: string;
};

export function formatApprovalCopy(
  approvalLevel: ApprovalLevel,
  renderer: RendererId,
) {
  if (approvalLevel === "required") {
    return `${formatRendererLabel(renderer)} 결과는 확인 없이 바로 만들기보다 한 번 점검하고 진행하는 편이 안전합니다.`;
  }

  return "지금 방향은 괜찮지만, 한 번 확인하면 결과를 더 맞춤형으로 다듬을 수 있습니다.";
}

export function formatClarifyLead(renderer: RendererId) {
  return `${formatRendererLabel(renderer)} 결과를 책임 있게 만들기 전에 이것만 더 알려주세요.`;
}

export function buildDecisionCardCopy(result: EngineResult): DecisionCardCopy {
  return {
    title: "이렇게 판단했어요",
    items: [
      {
        label: "추천 결과 방향",
        value: formatRendererLabel(result.provisional_renderer),
      },
      {
        label: "작업 방식",
        value: result.mode_guess === "review" ? "검토" : "생성",
      },
      {
        label: "다음 단계",
        value: formatNextStep(result),
      },
    ],
    reasons: readDecisionReasons(result),
  };
}

export function buildInputImprovementHints(
  result: EngineResult,
): InputImprovementHints {
  return {
    title: "다음 입력은 이렇게 더 좋아질 수 있어요",
    lead:
      "이번 결과가 틀렸다는 뜻이 아니라, 다음에 비슷한 요청을 할 때 덧붙이면 결과가 더 안정되는 정보입니다.",
    items: readImprovementHintItems(result),
  };
}

export type ApprovalReviseGuide = {
  examplePrompt: string;
  issueItems: {
    improvement: string;
    prompt: string;
    reason: string;
    title: string;
  }[];
  lead: string;
  title: string;
};

export function formatApprovalReviseGuide(
  result: EngineResult,
): ApprovalReviseGuide {
  switch (result.provisional_renderer) {
    case "architecture":
      return {
        examplePrompt:
          "예: 관리자 화면은 예약 승인과 일정 조정만 다루고, 손님 화면은 예약 생성/변경에 집중해. 이번 단계에서는 정산과 마케팅 기능은 제외해.",
        issueItems:
          readIssueItems(result).length > 0
            ? readIssueItems(result)
            : [
                {
                  improvement: "범위와 제외 범위가 더 선명해집니다.",
                  prompt: "이번 구조 설계에서 반드시 포함할 화면 또는 역할을 적어보세요.",
                  reason: "지금 입력만으로는 어디까지 설계하고 어디서 멈출지 경계가 흐립니다.",
                  title: "범위를 더 또렷하게 잡기",
                },
                {
                  improvement: "핵심 흐름이 단계별로 더 자연스럽게 이어집니다.",
                  prompt: "예약 생성부터 승인 알림까지, 특히 중요한 흐름 1~2개를 더 적어보세요.",
                  reason: "주요 흐름의 우선순위가 약하면 구조가 넓고 얕게 퍼질 수 있습니다.",
                  title: "핵심 흐름 더 분명히 하기",
                },
              ],
        lead:
          "지금은 그냥 한 번 더 써보라는 단계가 아니라, 무엇이 비어 있어서 구조가 흐려질 수 있는지 짚고 바로 고쳐보는 단계입니다.",
        title: "왜 보완이 필요한지 보고, 바로 아래에서 입력을 다시 다듬어보세요.",
      };
    case "plan":
      return {
        examplePrompt:
          "예: 핵심 대상은 운동을 혼자 시작한 20~30대 초보자고, 이번 MVP 목표는 기록을 쉽게 남기고 주간 변화를 보여주는 것까지야.",
        issueItems:
          readIssueItems(result).length > 0
            ? readIssueItems(result)
            : [
                {
                  improvement: "대상 사용자와 문제 정의가 더 선명해집니다.",
                  prompt: "누가 어떤 문제를 겪는지 한 문장 더 적어보세요.",
                  reason: "기획 입력에서 대상과 문제의 결이 약하면 결과가 일반론으로 흘기 쉽습니다.",
                  title: "대상과 문제 더 또렷하게 하기",
                },
              ],
        lead:
          "기획은 정보가 조금만 더 또렷해져도 결과 품질이 크게 달라집니다. 빠진 맥락을 보고 바로 보완해보세요.",
        title: "왜 보완이 필요한지 확인하고, 지금 입력에 필요한 맥락을 덧붙여보세요.",
      };
    case "review-report":
      return {
        examplePrompt:
          "예: 이 문구는 앱 첫 화면 소개 문구이고, 과장 여부와 초보 사용자 적합성을 먼저 보고 싶어.",
        issueItems:
          readIssueItems(result).length > 0
            ? readIssueItems(result)
            : [
                {
                  improvement: "무엇을 검토해야 하는지 초점이 더 정확해집니다.",
                  prompt: "어떤 초안인지, 어디에 쓰일지, 먼저 보고 싶은 기준을 더 적어보세요.",
                  reason: "검토 맥락이 약하면 실제보다 넓게 추측해서 지적할 가능성이 커집니다.",
                  title: "검토 기준 더 분명히 하기",
                },
              ],
        lead:
          "검토는 기준과 맥락이 보일수록 더 정확해집니다. 왜 보완해야 하는지 보고 바로 입력을 고쳐보세요.",
        title: "검토 결과가 더 정확해지도록, 빠진 기준과 맥락을 입력에 추가해보세요.",
      };
    case "prompt":
    default:
      return {
        examplePrompt:
          "예: 결과는 표 형식으로, 초보자도 이해하기 쉽게, 5줄 안으로 정리해줘.",
        issueItems:
          readIssueItems(result).length > 0
            ? readIssueItems(result)
            : [
                {
                  improvement: "출력 방향과 형식이 덜 흔들립니다.",
                  prompt: "원하는 결과 형식, 대상, 꼭 지켜야 할 조건을 더 적어보세요.",
                  reason: "프롬프트는 형식과 맥락이 빠지면 같은 요청도 결과가 크게 달라집니다.",
                  title: "출력 조건 더 분명히 하기",
                },
              ],
        lead:
          "지금은 입력이 어느 부분에서 덜 구체적인지 짚고, 바로 다시 써보는 단계입니다.",
        title: "프롬프트 결과가 더 안정적으로 나오도록, 빠진 조건을 입력에 덧붙여보세요.",
      };
  }
}

export function formatRendererLabel(renderer: RendererId) {
  switch (renderer) {
    case "plan":
      return "아이디어 정리";
    case "architecture":
      return "구조 설계";
    case "review-report":
      return "검토";
    case "prompt":
    default:
      return "프롬프트";
  }
}

function formatNextStep(result: EngineResult): string {
  if (result.next_step === "clarify_first") {
    return "결과를 만들기 전에 핵심 정보를 먼저 확인합니다.";
  }

  if (result.next_step === "approval_pending") {
    return result.approval_level === "required"
      ? "진행 전 확인이 꼭 필요한 상태입니다."
      : "확인하면 결과가 더 선명해지는 상태입니다.";
  }

  return "바로 결과를 만들 수 있는 상태입니다.";
}

function readDecisionReasons(result: EngineResult): string[] {
  const reasons = [
    readRendererReason(result),
    ...result.reason_codes.map((code) => formatReasonCode(code)),
  ].filter((reason): reason is string => Boolean(reason));

  if (result.pivot_recommended) {
    reasons.push(
      result.pivot_reason
        ? `선택한 힌트와 실제 요청 방향이 달라 보여 전환 확인이 필요합니다.`
        : "선택한 힌트보다 다른 결과 방향이 더 어울려 보입니다.",
    );
  }

  return dedupe(reasons).slice(0, 4);
}

function readRendererReason(result: EngineResult): string {
  if (result.mode_guess === "review") {
    return "기존 초안이나 결과를 평가하려는 요청으로 보여 검토 흐름을 우선했습니다.";
  }

  switch (result.provisional_renderer) {
    case "architecture":
      return "구성요소, 역할, 흐름을 먼저 나눠야 하는 구조 설계 요청으로 보았습니다.";
    case "plan":
      return "아이디어의 문제, 대상, 범위를 먼저 정리하는 편이 적합해 보았습니다.";
    case "prompt":
      return "다른 AI에 바로 넣어 쓸 실행형 입력을 만드는 요청으로 보았습니다.";
    case "review-report":
    default:
      return "현재 입력은 검토 결과로 정리하는 편이 적합해 보았습니다.";
  }
}

function formatReasonCode(code: string): string | undefined {
  switch (code) {
    case "review_intent":
      return "현재 요청은 새로 만들기보다 기존 내용을 살펴보는 성격이 강합니다.";
    case "critical_facts_missing":
      return "책임 있게 결과를 만들기 위해 꼭 필요한 정보가 아직 부족합니다.";
    case "high_risk_output":
      return "외부에 영향을 줄 수 있는 내용이라 확인 단계를 두었습니다.";
    case "high_ambiguity":
      return "여러 방향으로 해석될 수 있어 먼저 방향을 확인해야 합니다.";
    case "high_structure_request":
      return "여러 요소의 관계를 다루는 요청이라 한 번 점검하면 좋습니다.";
    case "multiple_medium_scores":
      return "모호함, 구조, 영향도가 함께 있어 짧은 확인을 권합니다.";
    case "strong_renderer_mismatch":
      return "선택한 힌트와 실제 요청의 작업 성격이 다르게 보입니다.";
    default:
      return undefined;
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function readImprovementHintItems(result: EngineResult): InputImprovementHints["items"] {
  switch (result.provisional_renderer) {
    case "architecture":
      return [
        {
          title: "시스템 경계",
          example: "이번 구조가 어디까지 다루고, 무엇은 제외하는지 적어보세요.",
        },
        {
          title: "주요 사용자 역할",
          example: "손님, 점주, 관리자처럼 역할별로 할 수 있는 일을 나눠보세요.",
        },
        {
          title: "핵심 흐름",
          example: "예약 생성부터 승인 알림까지처럼 가장 중요한 흐름 1개를 적어보세요.",
        },
        {
          title: "나중에 넣을 기능",
          example: "정산, 쿠폰, 통계처럼 이번 단계에서 뺄 기능을 함께 적어보세요.",
        },
      ];
    case "plan":
      return [
        {
          title: "핵심 사용자",
          example: "누가 이 서비스를 가장 먼저 쓸 사람인지 한 문장으로 적어보세요.",
        },
        {
          title: "해결하려는 문제",
          example: "그 사람이 지금 어떤 불편을 겪는지 구체적으로 적어보세요.",
        },
        {
          title: "MVP 범위",
          example: "처음 버전에서 꼭 필요한 기능과 나중에 넣을 기능을 나눠보세요.",
        },
        {
          title: "성공 기준",
          example: "사용자가 어떤 행동을 하면 이 아이디어가 잘 작동한 것인지 적어보세요.",
        },
      ];
    case "review-report":
      return [
        {
          title: "검토 대상",
          example: "초안 원문을 그대로 붙이고, 일부만 볼지 전체를 볼지 적어보세요.",
        },
        {
          title: "사용 맥락",
          example: "앱 첫 화면, 공지문, 제안서처럼 어디에 쓰일 글인지 알려주세요.",
        },
        {
          title: "먼저 볼 기준",
          example: "과장, 설득력, 빠진 정보, 초보자 이해도 중 먼저 보고 싶은 것을 적어보세요.",
        },
        {
          title: "수정 목표",
          example: "더 짧게, 더 안전하게, 더 구체적으로처럼 원하는 개선 방향을 적어보세요.",
        },
      ];
    case "prompt":
    default:
      return buildPromptImprovementHintItems(result);
  }
}

function buildPromptImprovementHintItems(
  result: EngineResult,
): InputImprovementHints["items"] {
  const combined = [
    result.source.text,
    result.intent_ir.intent.audience,
    result.intent_ir.intent.context,
    result.intent_ir.intent.tone,
    ...result.intent_ir.output_contract.constraints,
  ]
    .join(" ")
    .toLowerCase();
  const candidates: InputImprovementHints["items"] = [
        {
          title: "사용 상황",
          example: "이 프롬프트를 회의 전, 글쓰기 전, 검토 전 중 언제 쓸지 적어보세요.",
        },
        {
          title: "출력 형식",
          example: "목록, 표, 체크리스트, 한 문단처럼 원하는 모양을 정해보세요.",
        },
        {
          title: "대상",
          example: "초보자, 고객, 팀원처럼 결과를 읽거나 쓸 사람을 적어보세요.",
        },
        {
          title: "꼭 지킬 조건",
          example: "길이, 톤, 포함할 내용, 제외할 내용을 한두 개만 덧붙여보세요.",
        },
      ];
  const filtered = candidates.filter((item) => {
    switch (item.title) {
      case "사용 상황":
        return !hasAnyToken(combined, [
          "사용 상황",
          "언제",
          "회의 전",
          "글쓰기 전",
          "검토 전",
          "공지문",
          "출시",
        ]);
      case "출력 형식":
        return !hasAnyToken(combined, [
          "출력 형식",
          "목록",
          "표",
          "체크리스트",
          "문단",
          "짧은",
          "공지문",
        ]);
      case "대상":
        return !hasAnyToken(combined, [
          "대상",
          "사용자",
          "고객",
          "팀원",
          "초보자",
          "기존 사용자",
        ]);
      case "꼭 지킬 조건":
        return !hasAnyToken(combined, [
          "톤",
          "친절",
          "과장",
          "길이",
          "포함",
          "제외",
          "조건",
        ]);
      default:
        return true;
    }
  });

  return filtered.length > 0
    ? filtered
    : [
        {
          title: "검토 기준",
          example: "결과를 받은 뒤 무엇을 기준으로 좋고 나쁨을 판단할지 적어보세요.",
        },
        {
          title: "재사용 범위",
          example: "이번 한 번만 쓸지, 비슷한 공지에도 반복해서 쓸지 적어보세요.",
        },
      ];
}

function hasAnyToken(value: string, tokens: string[]): boolean {
  return tokens.some((token) => value.includes(token.toLowerCase()));
}

function readMissingItems(result: EngineResult): string[] {
  return [
    ...result.intent_ir.analysis.missing_information,
    ...result.intent_ir.analysis.clarification_questions.map(
      (question) => question.question,
    ),
  ].slice(0, 3);
}

function readIssueItems(result: EngineResult): ApprovalReviseGuide["issueItems"] {
  const questions = result.intent_ir.analysis.clarification_questions.slice(0, 3);

  if (questions.length > 0) {
    return questions.map((question) => ({
      improvement: `${question.improves}가 더 또렷해져 결과가 덜 흔들립니다.`,
      prompt: question.question,
      reason: question.reason,
      title: readIssueTitle(question.intent_key, question.improves),
    }));
  }

  return readMissingItems(result).map((item) => ({
    improvement: "빠진 정보를 채우면 결과가 더 구체적이고 맞춤형이 됩니다.",
    prompt: `${item}에 해당하는 정보를 한 줄 더 적어보세요.`,
    reason: "현재 입력만으로는 이 부분이 충분히 드러나지 않습니다.",
    title: item,
  }));
}

function readIssueTitle(intentKey: string, improves: string): string {
  switch (intentKey) {
    case "goal":
      return "목표 더 선명히 하기";
    case "audience":
      return "대상 더 구체화하기";
    case "context":
      return "사용 맥락 더 분명히 하기";
    case "constraints":
      return "제약과 범위 더 또렷하게 하기";
    default:
      return `${improves} 보강하기`;
  }
}
