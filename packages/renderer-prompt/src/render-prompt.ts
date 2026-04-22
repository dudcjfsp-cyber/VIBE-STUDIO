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
  const sourceText = handoff.source.text.trim();
  const goal = handoff.intent_ir.intent.goal.trim();
  const specializedPrompt = buildSpecializedPrompt(sourceText, goal, contextLines);
  const promptText =
    specializedPrompt ??
    [
      "당신은 사용자의 목표를 실행 가능한 결과로 바꾸는 숙련된 AI 작업 파트너입니다.",
      "",
      "[목표]",
      `- ${normalizePromptGoal(goal || sourceText)}`,
      "",
      "[참고 맥락]",
      ...(
        contextLines.length > 0
          ? contextLines
          : ["- 추가 배경은 주어지지 않았습니다. 부족한 정보는 과도하게 추측하지 말고 필요한 경우 질문으로 분리하세요."]
      ),
      "",
      "[작업]",
      "- 위 목표에 맞는 최종 결과를 작성하세요.",
      "- 결과를 만들기 전에 꼭 확인해야 할 정보가 있다면, 먼저 질문 목록으로 분리하세요.",
      "- 사용자가 바로 다음 행동으로 옮길 수 있게 구체적이고 실행 가능한 문장으로 작성하세요.",
      "- 불필요한 인사말, 자기소개, 메타 해설은 쓰지 마세요.",
      "",
      "[출력 형식]",
      "1. 핵심 결과",
      "2. 확인해야 할 질문",
      "3. 누락되기 쉬운 포인트",
    ].join("\n");
  const promptLines = [
    promptText,
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

function buildSpecializedPrompt(
  sourceText: string,
  goal: string,
  contextLines: string[],
): string | undefined {
  const searchableText = `${sourceText} ${goal}`;

  if (
    /질문|물어봐|물어봐야|확인 질문/u.test(searchableText) &&
    /회의|킥오프|기능 요청|요구사항|PM|기획자|개발자/u.test(searchableText)
  ) {
    return [
      "당신은 기능 요청을 구조화하는 숙련된 PM/프로덕트 디스커버리 코치입니다.",
      "",
      "[입력]",
      "- 기능 요청 또는 회의 주제: {{여기에 기능 요청이나 회의 주제를 붙여 넣으세요}}",
      "- 회의 상황: 기획자와 개발자가 함께 보는 킥오프 또는 요구사항 확인 자리",
      "",
      "[작업]",
      "- 입력된 기능 요청을 바로 구현 논의로 넘기기 전에 확인해야 할 질문을 정리해 주세요.",
      "- 질문은 답변자가 실제로 답하기 쉬운 문장으로 작성해 주세요.",
      "- 질문마다 왜 필요한지 한 줄로 덧붙여 주세요.",
      "- 정보가 부족한 부분은 추측하지 말고 확인 질문으로 남겨 주세요.",
      "",
      "[출력 형식]",
      "1. 기능 목적 확인 질문",
      "2. 사용자와 사용 상황 질문",
      "3. 범위와 제외 범위 질문",
      "4. 데이터, 화면, 정책 관련 질문",
      "5. 개발 전에 꼭 합의해야 할 결정",
      "",
      "[작성 원칙]",
      "- 인사말이나 회의 진행 멘트는 쓰지 마세요.",
      "- 질문 목록 자체만 바로 사용할 수 있게 작성하세요.",
      "- 초보 PM도 이해할 수 있게 쉬운 표현을 사용하세요.",
      ...(contextLines.length > 0 ? ["", "[참고 맥락]", ...contextLines] : []),
    ].join("\n");
  }

  return undefined;
}

function normalizePromptGoal(value: string): string {
  return value
    .replace(/프롬프트(를|을)?\s*(만들어|작성해|짜|생성해)(줘|주세요)?\.?/gu, "결과를 만들어 주세요.")
    .trim();
}
