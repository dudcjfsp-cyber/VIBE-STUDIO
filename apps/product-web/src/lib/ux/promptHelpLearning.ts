import type { EngineResult } from "@vive-studio/engine-contracts";
import type { PromptOutput } from "@vive-studio/renderer-prompt";

type PromptLearningTechnique = {
  applied: boolean;
  label: string;
  reason: string;
  whenToUse: string;
};

export type PromptHelpLearningPanel = {
  conditionalTechniques: PromptLearningTechnique[];
  summaryItems: string[];
  techniques: PromptLearningTechnique[];
};

export function buildPromptHelpLearningPanel(
  result: EngineResult,
  output: PromptOutput,
): PromptHelpLearningPanel {
  const sourceText = result.source.text.trim();
  const fewShotApplied = isFewShotPrompt(output, sourceText);
  const zeroShotApplied = !fewShotApplied;
  const roleIssue = hasRoleConflict(sourceText);
  const scopeIssue = hasScopeDrift(result, sourceText);
  const duplicateIssue = hasDuplicateInstruction(sourceText);
  const decompositionIssue = needsStepDecomposition(sourceText);

  const techniques: PromptLearningTechnique[] = [
    {
      applied: hasFormatLock(output.prompt),
      label: "출력 형식 고정하기",
      reason: hasFormatLock(output.prompt)
        ? "이번 프롬프트는 출력 형식과 작성 원칙을 먼저 고정해 결과 길이와 구조가 덜 흔들리게 만들었습니다."
        : "이번 입력은 먼저 방향을 넓게 탐색하는 편이 더 중요해 형식을 강하게 고정하지 않았습니다.",
      whenToUse: "결과 길이, 순서, 항목 구성을 일정하게 만들고 싶을 때 씁니다.",
    },
    {
      applied: zeroShotApplied,
      label: "예시 없이 요청하기 (Zero-shot)",
      reason: zeroShotApplied
        ? "이번 입력은 원하는 결과 종류가 비교적 분명해, 예시 없이도 바로 구조화된 프롬프트로 정리할 수 있었습니다."
        : "이번 입력은 원하는 톤이나 형식을 예시로 보여주는 편이 더 안정적이라 예시 없는 방식만으로는 부족했습니다.",
      whenToUse: "예시 없이도 요청 목적과 출력 방식이 충분히 분명할 때 씁니다.",
    },
    {
      applied: fewShotApplied,
      label: "예시를 보여주며 요청하기 (Few-shot)",
      reason: fewShotApplied
        ? "이번 입력은 예시나 패턴을 함께 보여주는 편이 결과 톤과 형식을 더 일정하게 맞추는 데 도움이 됐습니다."
        : "이번 입력은 예시 없이도 충분히 정리 가능해, 예시를 더하면 오히려 범위를 불필요하게 좁힐 수 있었습니다.",
      whenToUse: "원하는 결과 스타일, 밀도, 말투를 예시로 보여주는 편이 더 안정적일 때 씁니다.",
    },
  ];

  const conditionalTechniques: PromptLearningTechnique[] = [
    roleIssue
      ? {
          applied: countOccurrences(output.prompt, "당신은") === 1,
          label: "역할을 정하고 요청하기",
          reason: "입력 안에 여러 역할이나 시점이 섞이면 답변 관점이 흔들릴 수 있어, 하나의 역할로 정리하는 것이 중요했습니다.",
          whenToUse: "답변자의 관점이나 전문성을 하나로 고정하고 싶을 때 씁니다.",
        }
      : undefined,
    scopeIssue
      ? {
          applied: hasFormatLock(output.prompt),
          label: "범위를 좁혀서 요청하기",
          reason: "입력 범위가 넓거나 빠진 맥락이 있으면 결과가 퍼지기 쉬워, 무엇을 다루고 무엇을 덜어낼지 더 선명하게 만드는 것이 중요했습니다.",
          whenToUse: "모델이 너무 넓게 해석하지 않도록 다룰 범위를 좁혀야 할 때 씁니다.",
        }
      : undefined,
    duplicateIssue
      ? {
          applied: true,
          label: "겹치는 지시 정리하기",
          reason: "비슷한 요청이 반복되면 우선순위가 흐려져 결과가 길어지고 흔들릴 수 있어, 겹치는 요구를 걷어내는 것이 중요했습니다.",
          whenToUse: "비슷한 지시나 같은 요구가 반복되어 우선순위가 흐릴 때 씁니다.",
        }
      : undefined,
    decompositionIssue
      ? {
          applied: hasStructuredSections(output.prompt),
          label: "단계로 나눠 요청하기",
          reason: "한 번에 처리할 요소가 너무 많으면 결과가 뭉개질 수 있어, 생각 순서와 출력 순서를 나누는 것이 중요했습니다.",
          whenToUse: "한 번에 너무 많은 요구를 처리하면 결과가 뭉개질 때 씁니다.",
        }
      : undefined,
  ].filter(Boolean) as PromptLearningTechnique[];

  return {
    conditionalTechniques,
    summaryItems: [
      ...techniques.filter((item) => item.applied).map((item) => item.label),
      ...conditionalTechniques.map((item) => item.label),
    ].slice(0, 4),
    techniques,
  };
}

function hasFormatLock(prompt: string): boolean {
  return (
    prompt.includes("[출력 형식]") ||
    prompt.includes("[작성 원칙]") ||
    /-\s/.test(prompt)
  );
}

function hasStructuredSections(prompt: string): boolean {
  return (
    prompt.includes("[작업]") &&
    prompt.includes("[배경]") &&
    prompt.includes("[출력 형식]")
  );
}

function isFewShotPrompt(output: PromptOutput, sourceText: string): boolean {
  const techniqueNote = output.notes.find((note) => note.startsWith("Technique:"));
  const combined = `${techniqueNote ?? ""} ${sourceText}`.toLowerCase();

  return (
    combined.includes("few-shot") ||
    /예시|샘플|sample|같은 형식|톤|스타일/u.test(combined)
  );
}

function hasRoleConflict(sourceText: string): boolean {
  return (
    countOccurrences(sourceText, "당신은") >= 2 ||
    countOccurrences(sourceText.toLowerCase(), "you are") >= 2
  );
}

function hasScopeDrift(result: EngineResult, sourceText: string): boolean {
  const combined = [
    ...result.intent_ir.analysis.missing_information,
    ...result.intent_ir.analysis.clarification_questions.map(
      (question) => `${question.intent_key} ${question.question}`,
    ),
    sourceText,
  ].join(" ");

  return (
    result.ambiguity_score >= 1 ||
    /범위|scope|boundary|focus|제외|mvp/u.test(combined)
  );
}

function hasDuplicateInstruction(sourceText: string): boolean {
  const chunks = sourceText
    .split(/\n+/)
    .map((chunk) => normalizeChunk(chunk))
    .filter((chunk) => chunk.length >= 24);

  for (let index = 0; index < chunks.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < chunks.length; compareIndex += 1) {
      if (readTokenOverlap(chunks[index], chunks[compareIndex]) >= 0.42) {
        return true;
      }
    }
  }

  return false;
}

function needsStepDecomposition(sourceText: string): boolean {
  const numberedItemCount = (sourceText.match(/\d+\./g) ?? []).length;
  const paragraphCount = sourceText.split(/\n+/).filter((chunk) => chunk.trim().length > 0).length;

  return numberedItemCount >= 4 || paragraphCount >= 3;
}

function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function normalizeChunk(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function readTokenOverlap(left: string, right: string): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  const intersection = leftTokens.filter((token) => rightTokens.includes(token)).length;

  return intersection / Math.max(Math.min(leftTokens.length, rightTokens.length), 1);
}

function tokenize(value: string): string[] {
  return value
    .split(/[\s,.:;!?()[\]"'`]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}
