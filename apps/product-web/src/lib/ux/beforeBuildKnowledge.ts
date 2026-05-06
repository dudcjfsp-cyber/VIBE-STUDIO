import type { EngineResult } from "@vive-studio/engine-contracts";

export type BeforeBuildKnowledgePanel = {
  concepts: string[];
  recommendations: string[];
  terms: string[];
};

export function buildBeforeBuildKnowledgePanel(
  result: EngineResult,
): BeforeBuildKnowledgePanel {
  const text = result.source.text.toLowerCase();
  const concepts = [
    ...readDomainConcepts(text),
    "사용자 역할",
    "핵심 사용 흐름",
    "저장해야 할 데이터",
  ];
  const terms = [
    ...readDomainTerms(text),
    "CRUD",
    "Role",
    "Validation",
  ];
  const recommendations = [
    "처음 버전에서 꼭 필요한 흐름 하나를 먼저 정해 보세요.",
    "사용자와 관리자가 해야 하는 일을 따로 적어 보세요.",
    "나중에 넣어도 되는 기능을 미리 분리해 두세요.",
  ];

  return {
    concepts: dedupe(concepts).slice(0, 6),
    recommendations: dedupe(recommendations).slice(0, 3),
    terms: dedupe(terms).slice(0, 6),
  };
}

function readDomainConcepts(text: string): string[] {
  const concepts: string[] = [];

  if (hasAny(text, ["예약", "reservation", "booking"])) {
    concepts.push("예약 가능 시간", "중복 예약 방지", "예약 취소 정책");
  }

  if (hasAny(text, ["카페", "매장", "식당", "store", "shop"])) {
    concepts.push("매장 운영 시간", "관리자 승인", "노쇼 처리");
  }

  if (hasAny(text, ["주문", "결제", "payment", "order"])) {
    concepts.push("주문 상태", "결제 승인", "환불과 취소");
  }

  if (hasAny(text, ["알림", "notification", "message"])) {
    concepts.push("알림 대상", "발송 실패 처리", "중복 알림 방지");
  }

  if (hasAny(text, ["ai", "프롬프트", "입문자", "학습"])) {
    concepts.push("학습 단계", "예시 기반 안내", "사용자 입력 품질");
  }

  return concepts;
}

function readDomainTerms(text: string): string[] {
  const terms: string[] = [];

  if (hasAny(text, ["예약", "reservation", "booking"])) {
    terms.push("Reservation Slot", "Conflict Check", "No-show");
  }

  if (hasAny(text, ["주문", "결제", "payment", "order"])) {
    terms.push("Payment Status", "Refund", "Transaction");
  }

  if (hasAny(text, ["관리자", "admin", "운영"])) {
    terms.push("Admin Dashboard", "Permission");
  }

  if (hasAny(text, ["ai", "프롬프트", "입문자", "학습"])) {
    terms.push("Prompt Pattern", "Few-shot", "Output Format");
  }

  return terms;
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
