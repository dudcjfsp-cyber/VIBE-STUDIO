import type { RendererHandoff } from "@vive-studio/engine-contracts";

import type { PromptOutput } from "./prompt-output.js";

function buildContextBlock(handoff: RendererHandoff): string[] {
  const lines: string[] = [];
  const { intent_ir: intentIr } = handoff;

  if (intentIr.intent.context.trim()) {
    lines.push(`- 배경: ${intentIr.intent.context.trim()}`);
  }

  if (intentIr.intent.audience.trim()) {
    lines.push(`- 대상: ${intentIr.intent.audience.trim()}`);
  }

  if (intentIr.intent.tone.trim()) {
    lines.push(`- 톤: ${intentIr.intent.tone.trim()}`);
  }

  for (const constraint of intentIr.output_contract.constraints) {
    lines.push(`- 제약: ${constraint}`);
  }

  for (const criterion of intentIr.output_contract.success_criteria) {
    lines.push(`- 성공 기준: ${criterion}`);
  }

  return lines;
}

function chooseTechniqueLabel(text: string): string {
  const lower = text.toLowerCase();

  if (
    lower.includes("예시") ||
    lower.includes("샘플") ||
    lower.includes("스타일") ||
    lower.includes("톤") ||
    lower.includes("같은 형식")
  ) {
    return "few-shot or pattern-anchored prompt";
  }

  return "zero-shot structured prompt";
}

export function renderPrompt(handoff: RendererHandoff): PromptOutput {
  const contextLines = buildContextBlock(handoff);
  const promptLines = [
    "당신은 요구사항을 빠르게 구조화해 주는 숙련된 PM/프로덕트 디스커버리 코치입니다.",
    "",
    "[작업]",
    handoff.intent_ir.intent.goal.trim(),
    "",
    "[배경]",
    ...(
      contextLines.length > 0
        ? contextLines
        : ["- 추가 배경은 주어지지 않았으니, 과도한 가정 없이 바로 쓸 수 있는 형태로 정리하세요."]
    ),
    "",
    "[작성 원칙]",
    "- 실행 가능한 결과를 바로 제시하세요.",
    "- 빠진 정보를 메우기 위해 필요한 항목은 결과 안에서 구조적으로 드러내세요.",
    "- 설명보다 실제 사용 가능한 문장을 우선하세요.",
    "- 불필요한 인사말이나 메타 해설은 쓰지 마세요.",
    "",
    "[출력 형식]",
    "- 먼저 기능 요청을 검토할 때 바로 쓸 결과물을 작성하세요.",
    "- 필요한 경우 항목별 체크리스트나 질문 목록을 카테고리별로 나누세요.",
    "- 각 항목은 짧고 구체적으로 쓰세요.",
    "- 마지막에는 누락되기 쉬운 확인 포인트를 별도 섹션으로 정리하세요.",
  ];

  const notes = [
    `Mode: ${handoff.intent_ir.mode}`,
    `Summary: ${handoff.intent_ir.summary}`,
    `Technique: ${chooseTechniqueLabel(handoff.source.text)}`,
    "Fallback: ready-to-paste prompt template",
  ];

  if (handoff.intent_ir.analysis.risks.length > 0) {
    notes.push(`Risk note: ${handoff.intent_ir.analysis.risks.join(" ")}`);
  }

  return {
    title: "AI 입력용 실행 프롬프트",
    prompt: promptLines.join("\n"),
    notes,
  };
}
