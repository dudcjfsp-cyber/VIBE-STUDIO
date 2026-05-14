import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type {
  ArchitectureActor,
  ArchitectureComponent,
  ArchitectureFlow,
  ArchitectureOutput,
} from "./architecture-output.js";

function pushActor(
  actors: ArchitectureActor[],
  seen: Set<string>,
  name: string,
  role: string,
): void {
  if (seen.has(name)) {
    return;
  }

  seen.add(name);
  actors.push({ name, role });
}

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

function buildActors(handoff: RendererHandoff): ArchitectureActor[] {
  const text = `${handoff.source.text} ${handoff.intent_ir.intent.context}`.toLowerCase();
  const actors: ArchitectureActor[] = [];
  const seen = new Set<string>();

  if (/사용자|고객|customer|user/i.test(text)) {
    pushActor(
      actors,
      seen,
      "사용자",
      "서비스에서 핵심 요청을 만들고 결과 상태를 확인합니다.",
    );
  }

  if (/사장|점주|가게|매장|merchant|store/i.test(text)) {
    pushActor(
      actors,
      seen,
      "운영자",
      "현장 운영 상태를 확인하고 승인, 처리, 예외 대응을 맡습니다.",
    );
  }

  if (/관리자|admin/i.test(text)) {
    pushActor(
      actors,
      seen,
      "관리자",
      "전체 서비스 운영 상태와 예외 상황을 점검합니다.",
    );
  }

  if (/결제|payment/i.test(text)) {
    pushActor(
      actors,
      seen,
      "결제 서비스",
      "결제 승인과 거래 상태를 외부 시스템 관점에서 제공합니다.",
    );
  }

  if (actors.length === 0) {
    pushActor(
      actors,
      seen,
      "주요 사용자",
      "서비스를 실제로 쓰는 사람입니다. 더 구체적인 대상은 다음 대화에서 정해야 합니다.",
    );
  }

  return actors;
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

function buildMvpExclusions(handoff: RendererHandoff): string[] {
  const exclusions = [
    "처음 구조에서는 고급 권한 체계, 자동 정산, 복잡한 관리자 리포트처럼 핵심 흐름 밖의 기능은 제외합니다.",
  ];

  if (/결제|payment/i.test(handoff.source.text)) {
    exclusions.push("실제 PG사별 예외 처리와 정산 세부 정책은 MVP 구조 밖으로 둡니다.");
  }

  if (/알림|notification/i.test(handoff.source.text)) {
    exclusions.push("모든 알림 채널을 동시에 붙이기보다, 처음에는 가장 중요한 채널 하나만 가정합니다.");
  }

  return exclusions;
}

function buildLaterDecisions(handoff: RendererHandoff): string[] {
  const decisions = handoff.intent_ir.analysis.missing_information.map(
    formatMissingInformationAsDecision,
  );

  if (!handoff.intent_ir.intent.audience.trim()) {
    decisions.push("첫 사용자와 운영 주체를 더 구체적으로 정해야 합니다.");
  }

  decisions.push("데이터 저장 기준, 권한 수준, 외부 연동 범위는 구현 대화 전에 한 번 더 정해야 합니다.");

  return dedupe(decisions);
}

function formatMissingInformationAsDecision(value: string): string {
  switch (value) {
    case "architecture.boundary":
      return "시스템 안에 포함할 기능과 밖으로 둘 기능을 정해야 합니다.";
    case "architecture.focus":
      return "구조에서 먼저 볼 초점이 화면, 데이터, 흐름 중 무엇인지 정해야 합니다.";
    case "plan.problem_or_scope":
      return "처음 버전에서 풀 문제와 제외할 범위를 정해야 합니다.";
    case "prompt.goal":
      return "이 구조를 다음 AI 작업에 넘길 목표를 정해야 합니다.";
    default:
      return value;
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function renderArchitecture(
  handoff: RendererHandoff,
): ArchitectureOutput {
  const actors = buildActors(handoff);
  const components = buildComponents(handoff);

  return {
    title: "구조 설계 초안",
    system_boundary: buildBoundary(handoff),
    actors,
    components,
    interaction_flows: buildFlows(components, handoff),
    mvp_exclusions: buildMvpExclusions(handoff),
    later_decisions: buildLaterDecisions(handoff),
    notes: [
      `Mode: ${handoff.intent_ir.mode}`,
      `Confidence: ${handoff.intent_ir.signals.confidence}`,
      `Summary: ${handoff.intent_ir.summary}`,
      "Architecture focus: 전문 설계도가 아니라 MVP 대화를 시작하기 위한 경계, 행위자, 구성요소, 흐름, 제외 범위, 이후 결정을 분리했습니다.",
    ],
  };
}
