import type {
  AnalysisDraft,
  ClarificationQuestion,
  EngineRequest,
  GateSignals,
  RendererId,
} from "@vive-studio/engine-contracts";

import { extractInlineArtifact } from "./extract-inline-artifact.js";
import { truncateText } from "./text-utils.js";

function describeDesiredOutput(renderer: RendererId): string {
  switch (renderer) {
    case "architecture":
      return "서비스 또는 시스템 구조";
    case "review-report":
      return "평가와 개선 리포트";
    case "plan":
      return "구조화된 기획 정리";
    case "prompt":
    default:
      return "바로 쓸 수 있는 프롬프트 또는 문구";
  }
}

function summarizeIntent(
  renderer: RendererId,
  sourceText: string,
): string {
  switch (renderer) {
    case "architecture":
      return "구현 전에 시스템 구조를 먼저 정리합니다.";
    case "review-report":
      return "기존 초안을 검토하고 문제나 빠진 부분을 드러냅니다.";
    case "plan":
      return "아이디어를 더 선명한 제품 기획으로 구조화합니다.";
    case "prompt":
    default:
      return truncateText(sourceText);
  }
}

function deriveTone(text: string): string {
  if (/친절/u.test(text)) {
    return "friendly";
  }

  if (/사과/u.test(text) || /공지문/u.test(text)) {
    return "careful";
  }

  return "";
}

function deriveAudience(text: string): string {
  const patterns = [
    /주요\s*대상(?:은|는)?\s*(.+?)(?:입니다|이에요|예요|이야|야|라고|으로|로|\.|\n|$)/gu,
    /대상\s*사용자(?:는|은)?\s*(.+?)(?:입니다|이에요|예요|이야|야|라고|으로|로|\.|\n|$)/gu,
    /핵심\s*사용자(?:는|은)?\s*(.+?)(?:입니다|이에요|예요|이야|야|라고|으로|로|\.|\n|$)/gu,
    /가장\s*먼저\s*쓸\s*사람(?:은|는)?\s*(.+?)(?:입니다|이에요|예요|이야|야|라고|으로|로|\.|\n|$)/gu,
    /대상(?:은|는)?\s*(.+?)(?:입니다|이에요|예요|이야|야|라고|으로|로|\.|\n|$)/gu,
  ];
  let latestMatch:
    | {
        index: number;
        value: string;
      }
    | undefined;

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const candidate = match[1]?.trim();

      if (
        candidate &&
        (latestMatch === undefined || match.index > latestMatch.index)
      ) {
        latestMatch = {
          index: match.index,
          value: candidate,
        };
      }
    }
  }

  return latestMatch?.value ?? "";
}

export function buildAnalysisDraft(args: {
  request: EngineRequest;
  gateSignals: GateSignals;
  clarificationQuestions: ClarificationQuestion[];
  missingItems: string[];
}): AnalysisDraft {
  const { request, gateSignals, clarificationQuestions, missingItems } = args;
  const sourceText = request.source.text.trim();
  const inlineArtifact = extractInlineArtifact(sourceText);
  const goalText =
    gateSignals.mode_guess === "review" && inlineArtifact
      ? sourceText.replace(inlineArtifact, "").replace(/:\s*$/, "").trim()
      : sourceText;

  return {
    summary: summarizeIntent(gateSignals.provisional_renderer, sourceText),
    intent: {
      goal: goalText,
      audience: deriveAudience(sourceText),
      context: inlineArtifact ?? sourceText,
      desired_output: describeDesiredOutput(gateSignals.provisional_renderer),
      tone: deriveTone(sourceText),
    },
    constraints: [],
    success_criteria: [],
    risks:
      gateSignals.risk_score === 2
        ? ["영향도가 큰 결과는 최종 생성 전에 확인이 필요합니다."]
        : [],
    assumptions: [],
    missing_information: missingItems,
    candidate_questions: clarificationQuestions,
  };
}
