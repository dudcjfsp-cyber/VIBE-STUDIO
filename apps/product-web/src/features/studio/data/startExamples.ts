import type { HintOption, StartExample } from "../types";

export const startExamples: StartExample[] = [
  {
    id: "prompt",
    title: "회의 전 질문 만들기",
    description: "막연한 요청을 확인 질문 프롬프트로 바꿔보기",
    cardHint: "command-optimization",
    text:
      "신입 PM이 기능 요청을 받았을 때 바로 쓸 질문 프롬프트를 만들어줘. 기획자와 개발자가 같이 보는 킥오프 상황이고, 빠진 요구사항을 먼저 확인하는 용도야.",
  },
  {
    id: "plan",
    title: "MVP 기획 정리",
    description: "아이디어를 사용자, 흐름, 제외 범위로 구조화하기",
    cardHint: "idea-structuring",
    text:
      "동네 커피 모임 앱 아이디어를 MVP 기획 정리로 잡아줘. 혼자 일하는 프리랜서가 근처에서 가벼운 커피 모임을 찾기 어려운 문제를 해결하는 서비스고, 이번에는 핵심 사용자, 핵심 흐름, 제외 범위까지 정리하고 싶어.",
  },
  {
    id: "architecture",
    title: "서비스 구조 잡기",
    description: "화면, 백엔드, 알림 흐름의 경계를 먼저 보기",
    cardHint: "system-architecture",
    text:
      "사장님과 손님이 함께 쓰는 예약 서비스의 MVP 구조를 잡아줘. 범위는 손님 화면, 매장 관리자 화면, 예약/결제/알림 백엔드까지고, 예약 생성부터 승인 알림까지의 주요 흐름에 집중해줘.",
  },
  {
    id: "review",
    title: "소개 문구 검토",
    description: "기존 초안의 과장, 대상 적합성, 빠진 점 보기",
    cardHint: "critical-review",
    text:
      "이 소개 문구 초안을 검토해줘: 우리 앱은 누구나 생산성을 10배 높여줍니다. 앱 첫 화면 소개 문구라서 과장과 대상 사용자 적합성을 먼저 보고 싶어.",
  },
];

export const hintOptions: HintOption[] = [
  {
    id: "prompt-help",
    label: "프롬프트 도움",
    cardHint: "command-optimization",
    prompt: "바로 붙여 넣어 쓸 수 있는 프롬프트를 만들어줘.",
  },
  {
    id: "idea-structuring",
    label: "아이디어 정리",
    cardHint: "idea-structuring",
    prompt: "아이디어를 기획 정리 형태로 잡아보고 싶어.",
  },
  {
    id: "architecture",
    label: "구조 설계",
    cardHint: "system-architecture",
    prompt: "서비스 구조와 주요 흐름을 먼저 보고 싶어.",
  },
  {
    id: "review",
    label: "검토",
    cardHint: "critical-review",
    prompt: "지금 가진 초안이나 결과물을 먼저 검토받고 싶어.",
  },
];
