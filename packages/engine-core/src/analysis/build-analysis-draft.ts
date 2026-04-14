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
      return "service or system structure";
    case "review-report":
      return "evaluation and improvement report";
    case "plan":
      return "structured planning summary";
    case "prompt":
    default:
      return "directly usable prompt or wording";
  }
}

function summarizeIntent(
  renderer: RendererId,
  sourceText: string,
): string {
  switch (renderer) {
    case "architecture":
      return "Define the system structure before implementation.";
    case "review-report":
      return "Review an existing artifact and surface issues or missing points.";
    case "plan":
      return "Structure the idea into a clearer product plan.";
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
      audience: "",
      context: inlineArtifact ?? sourceText,
      desired_output: describeDesiredOutput(gateSignals.provisional_renderer),
      tone: deriveTone(sourceText),
    },
    constraints: [],
    success_criteria: [],
    risks:
      gateSignals.risk_score === 2
        ? ["High-impact output should be confirmed before final rendering."]
        : [],
    assumptions: request.card_hint
      ? [`Selected card hint: ${request.card_hint}`]
      : [],
    missing_information: missingItems,
    candidate_questions: clarificationQuestions,
  };
}
