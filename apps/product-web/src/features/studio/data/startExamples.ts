import type { HintOption } from "../types";

export const startExamples = [
  "회의 전에 무엇을 물어봐야 할지 정리해줘.",
  "이 앱 기획안이 말이 되는지 먼저 봐줘.",
];

export const hintOptions: HintOption[] = [
  {
    id: "prompt-help",
    label: "프롬프트 도움",
    cardHint: "command-optimization",
    prompt: "바로 써먹을 수 있는 프롬프트를 만들고 싶어요.",
  },
  {
    id: "idea-structuring",
    label: "아이디어 정리",
    cardHint: "idea-structuring",
    prompt: "아이디어를 기획 정리 형태로 잡아보고 싶어요.",
  },
  {
    id: "architecture",
    label: "구조 설계",
    cardHint: "system-architecture",
    prompt: "서비스 구조와 주요 흐름을 먼저 잡고 싶어요.",
  },
  {
    id: "review",
    label: "검토",
    cardHint: "critical-review",
    prompt: "지금 가진 초안이나 결과물을 먼저 검토받고 싶어요.",
  },
];
