import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";

function buildContextLines(handoff: RendererHandoff): string[] {
  const lines: string[] = [];
  const { intent_ir: intentIr } = handoff;

  if (intentIr.intent.context.trim()) {
    lines.push(`Context: ${intentIr.intent.context.trim()}`);
  }

  if (intentIr.intent.audience.trim()) {
    lines.push(`Audience: ${intentIr.intent.audience.trim()}`);
  }

  if (intentIr.intent.tone.trim()) {
    lines.push(`Tone: ${intentIr.intent.tone.trim()}`);
  }

  for (const constraint of intentIr.output_contract.constraints) {
    lines.push(`Constraint: ${constraint}`);
  }

  for (const criterion of intentIr.output_contract.success_criteria) {
    lines.push(`Success criterion: ${criterion}`);
  }

  return lines;
}

export function renderPrompt(handoff: RendererHandoff): PromptOutput {
  const contextLines = buildContextLines(handoff);
  const promptSections = [
    "역할:",
    "당신은 요청을 빠르게 실행 가능한 결과로 바꾸는 실무형 AI 어시스턴트입니다.",
    "",
    "사용자 요청:",
    handoff.intent_ir.intent.goal.trim(),
  ];

  if (contextLines.length > 0) {
    promptSections.push("", "맥락:", ...contextLines);
  }

  promptSections.push(
    "",
    "해야 할 일:",
    "1. 사용자의 요청 의도를 짧게 다시 정리합니다.",
    "2. 바로 실행 가능한 결과를 만듭니다.",
    "3. 필요하면 핵심 질문 3개 이내를 덧붙입니다.",
    "",
    "출력 형식:",
    "- 먼저 핵심 결과를 제공합니다.",
    "- 이어서 필요할 때만 보완 질문 또는 주의사항을 덧붙입니다.",
    "- 장황한 설명 없이 바로 사용할 수 있게 씁니다.",
  );

  const notes = [
    `Mode: ${handoff.intent_ir.mode}`,
    `Summary: ${handoff.intent_ir.summary}`,
    "Fallback: deterministic prompt template",
  ];

  if (handoff.intent_ir.analysis.risks.length > 0) {
    notes.push(`Risk note: ${handoff.intent_ir.analysis.risks.join(" ")}`);
  }

  return {
    title: "실행용 프롬프트 초안",
    prompt: promptSections.join("\n"),
    notes,
  };
}
