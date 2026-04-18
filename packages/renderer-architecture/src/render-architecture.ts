import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type {
  ArchitectureComponent,
  ArchitectureFlow,
  ArchitectureOutput,
} from "./architecture-output.js";

function pushComponent(
  components: ArchitectureComponent[],
  seen: Set<string>,
  name: string,
  responsibility: string,
): void {
  if (seen.has(name)) {
    return;
  }

  seen.add(name);
  components.push({ name, responsibility });
}

function buildComponents(handoff: RendererHandoff): ArchitectureComponent[] {
  const text = `${handoff.source.text} ${handoff.intent_ir.intent.context}`.toLowerCase();
  const components: ArchitectureComponent[] = [];
  const seen = new Set<string>();

  if (/사용자/u.test(text) || /고객/u.test(text) || /customer/i.test(text)) {
    pushComponent(
      components,
      seen,
      "사용자 앱",
      "사용자 요청을 받고 예약 상태나 핵심 서비스 상태를 보여줍니다.",
    );
  }

  if (/사장/u.test(text) || /점주/u.test(text) || /merchant/i.test(text)) {
    pushComponent(
      components,
      seen,
      "매장 관리자 화면",
      "매장 측 요청을 처리하고 운영 상태를 관리합니다.",
    );
  }

  if (/관리자/u.test(text) || /admin/i.test(text)) {
    pushComponent(
      components,
      seen,
      "운영 관리자 화면",
      "예외 상황과 서비스 전반 운영을 점검합니다.",
    );
  }

  pushComponent(
    components,
    seen,
    "핵심 백엔드",
    "공통 비즈니스 규칙, 상태 변경, 서비스 간 연동을 조정합니다.",
  );

  if (/결제/u.test(text) || /payment/i.test(text)) {
    pushComponent(
      components,
      seen,
      "결제 처리 모듈",
      "결제 승인, 결제 상태 갱신, 정산 연동 지점을 담당합니다.",
    );
  }

  if (/알림/u.test(text) || /notification/i.test(text)) {
    pushComponent(
      components,
      seen,
      "알림 모듈",
      "상태 변경 이벤트를 적절한 사용자에게 전달합니다.",
    );
  }

  if (components.length < 3) {
    pushComponent(
      components,
      seen,
      "공유 데이터 저장소",
      "핵심 엔티티와 상태를 일관되게 저장합니다.",
    );
  }

  return components;
}

function buildFlows(
  components: ArchitectureComponent[],
  handoff: RendererHandoff,
): ArchitectureFlow[] {
  const componentNames = new Set(components.map((component) => component.name));
  const primarySteps: string[] = [];

  if (componentNames.has("사용자 앱")) {
    primarySteps.push("사용자 앱이 핵심 요청이나 예약 행동을 수집합니다.");
  }

  primarySteps.push("핵심 백엔드가 비즈니스 규칙을 적용하고 상태를 조정합니다.");

  if (componentNames.has("결제 처리 모듈")) {
    primarySteps.push("결제 처리 모듈이 결제 승인 여부와 거래 상태를 갱신합니다.");
  }

  if (componentNames.has("매장 관리자 화면")) {
    primarySteps.push("매장 관리자 화면이 운영자 행동과 승인 처리를 반영합니다.");
  }

  if (componentNames.has("운영 관리자 화면")) {
    primarySteps.push("운영 관리자 화면이 예외 상황을 모니터링하고 개입합니다.");
  }

  if (componentNames.has("알림 모듈")) {
    primarySteps.push("알림 모듈이 상태 변경 결과를 관련 사용자에게 전달합니다.");
  }

  const flows: ArchitectureFlow[] = [
    {
      name: "주요 처리 흐름",
      steps: primarySteps,
    },
  ];

  if (handoff.intent_ir.analysis.missing_information.length > 0) {
    flows.push({
      name: "추가 확인 필요 항목",
      steps: handoff.intent_ir.analysis.missing_information.map(
        (item) => `확인 필요: ${item}`,
      ),
    });
  }

  return flows;
}

function buildBoundary(handoff: RendererHandoff): string {
  return (
    handoff.intent_ir.intent.context.trim() ||
    handoff.intent_ir.intent.goal.trim() ||
    handoff.intent_ir.summary.trim()
  );
}

export function renderArchitecture(
  handoff: RendererHandoff,
): ArchitectureOutput {
  const components = buildComponents(handoff);

  return {
    title: "구조 설계 초안",
    system_boundary: buildBoundary(handoff),
    components,
    interaction_flows: buildFlows(components, handoff),
    notes: [
      `Mode: ${handoff.intent_ir.mode}`,
      `Confidence: ${handoff.intent_ir.signals.confidence}`,
      `Summary: ${handoff.intent_ir.summary}`,
    ],
  };
}
