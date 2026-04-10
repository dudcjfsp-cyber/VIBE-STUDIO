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

  if (/사용자/u.test(text) || /고객/u.test(text)) {
    pushComponent(
      components,
      seen,
      "User App",
      "Collect user actions and show service state to end users.",
    );
  }

  if (/점주/u.test(text) || /가게/u.test(text) || /merchant/i.test(text)) {
    pushComponent(
      components,
      seen,
      "Merchant Console",
      "Manage store-side actions, incoming work, and operational updates.",
    );
  }

  if (/관리자/u.test(text) || /admin/i.test(text)) {
    pushComponent(
      components,
      seen,
      "Admin Console",
      "Handle oversight, exceptions, and service-wide coordination.",
    );
  }

  pushComponent(
    components,
    seen,
    "Core Backend",
    "Coordinate shared business rules, state changes, and service integration.",
  );

  if (/결제/u.test(text) || /payment/i.test(text)) {
    pushComponent(
      components,
      seen,
      "Payment Service",
      "Authorize, confirm, and reconcile payment state.",
    );
  }

  if (/알림/u.test(text) || /notification/i.test(text)) {
    pushComponent(
      components,
      seen,
      "Notification Service",
      "Send status changes and event-driven messages to the right audience.",
    );
  }

  if (components.length < 3) {
    pushComponent(
      components,
      seen,
      "Shared Data Layer",
      "Persist core entities and make cross-surface state consistent.",
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

  if (componentNames.has("User App")) {
    primarySteps.push("User App collects the primary request or action.");
  }

  primarySteps.push("Core Backend applies the main business rules and orchestration.");

  if (componentNames.has("Payment Service")) {
    primarySteps.push("Payment Service confirms or updates transaction state.");
  }

  if (componentNames.has("Merchant Console")) {
    primarySteps.push("Merchant Console reflects the operational state for store-side action.");
  }

  if (componentNames.has("Admin Console")) {
    primarySteps.push("Admin Console monitors exceptions or escalations.");
  }

  if (componentNames.has("Notification Service")) {
    primarySteps.push("Notification Service delivers the relevant status change.");
  }

  const flows: ArchitectureFlow[] = [
    {
      name: "Primary Coordination Flow",
      steps: primarySteps,
    },
  ];

  if (handoff.intent_ir.analysis.missing_information.length > 0) {
    flows.push({
      name: "Clarify Before Locking",
      steps: handoff.intent_ir.analysis.missing_information.map(
        (item) => `Clarify: ${item}`,
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
    title: "Architecture Outline",
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
