import type {
  ApprovalLevel,
  EngineResult,
  RendererId,
} from "@vive-studio/engine-contracts";

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
