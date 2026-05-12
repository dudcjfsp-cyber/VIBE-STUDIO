import type { StartTemplate } from "../types";

export const startTemplates: StartTemplate[] = [
  {
    id: "free",
    title: "자율입력",
    label: "직접 적기",
    description: "이미 하고 싶은 말이 있으면 그대로 적어요.",
    fields: [],
    buildInput() {
      return "";
    },
  },
  {
    id: "prompt",
    title: "프롬프트",
    label: "AI에게 시킬 말 만들기",
    description: "다른 AI에 붙여 넣을 요청문을 정리해요.",
    cardHint: "command-optimization",
    fields: [
      {
        id: "task",
        label: "AI에게 시키고 싶은 일",
        placeholder: "회의 전에 꼭 물어봐야 할 질문을 정리하기",
      },
      {
        id: "context",
        label: "상황",
        optional: true,
        placeholder: "신입 PM이 기능 회의 전에 쓰는 용도",
      },
    ],
    buildInput(values) {
      return joinLines([
        `${values.task?.trim() ?? ""}에 바로 쓸 프롬프트를 만들어줘.`,
        values.context?.trim() ? `상황: ${values.context.trim()}` : "",
      ]);
    },
  },
  {
    id: "plan",
    title: "플랜",
    label: "아이디어를 기획으로 정리",
    description: "막연한 아이디어를 문제, 대상, 범위로 나눠요.",
    cardHint: "idea-structuring",
    fields: [
      {
        id: "idea",
        label: "만들고 싶은 것",
        placeholder: "개인적인 헤지펀드 매니저",
      },
      {
        id: "audience",
        label: "누가 쓰나요",
        optional: true,
        placeholder: "아직 모르겠으면 비워두세요",
      },
    ],
    buildInput(values) {
      return joinLines([
        values.idea?.trim() ? `나는 ${values.idea.trim()}를 만들고 싶어요.` : "",
        values.audience?.trim() ? `주요 대상은 ${values.audience.trim()}입니다.` : "",
        "이 아이디어를 기획 정리로 잡아줘.",
      ]);
    },
  },
  {
    id: "architecture",
    title: "아키텍처",
    label: "서비스 구조 잡기",
    description: "화면, 구성요소, 주요 흐름을 먼저 나눠요.",
    cardHint: "system-architecture",
    fields: [
      {
        id: "system",
        label: "구조를 보고 싶은 서비스",
        placeholder: "예약 관리 서비스",
      },
      {
        id: "scope",
        label: "포함할 범위",
        optional: true,
        placeholder: "사용자 화면, 관리자 화면, 결제, 알림",
      },
    ],
    buildInput(values) {
      return joinLines([
        values.system?.trim() ? `${values.system.trim()}의 전체 구조를 잡아줘.` : "",
        values.scope?.trim() ? `범위는 ${values.scope.trim()}까지 보고 싶어.` : "",
      ]);
    },
  },
  {
    id: "review",
    title: "검증 및 리뷰",
    label: "초안의 문제 보기",
    description: "이미 쓴 문장이나 계획에서 빠진 점을 봐요.",
    cardHint: "critical-review",
    fields: [
      {
        id: "artifact",
        label: "검토할 초안",
        placeholder: "우리 앱은 누구나 생산성을 10배 높여줍니다.",
      },
      {
        id: "lens",
        label: "먼저 봐줬으면 하는 점",
        optional: true,
        placeholder: "과장됐는지, 대상에게 맞는지",
      },
    ],
    buildInput(values) {
      return joinLines([
        values.artifact?.trim() ? `이 초안을 검토해줘: ${values.artifact.trim()}` : "",
        values.lens?.trim() ? `먼저 볼 기준: ${values.lens.trim()}` : "",
      ]);
    },
  },
];

function joinLines(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}
