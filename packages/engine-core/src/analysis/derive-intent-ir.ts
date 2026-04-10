import type {
  AnalysisDraft,
  GateSignals,
  IntentIr,
  SourceInput,
} from "@vive-studio/engine-contracts";

function mapConfidence(gateSignals: GateSignals): "low" | "medium" | "high" {
  if (
    gateSignals.next_step === "clarify_first" ||
    gateSignals.approval_level === "required"
  ) {
    return "low";
  }

  if (
    gateSignals.next_step === "approval_pending" ||
    gateSignals.ambiguity_score === 1 ||
    gateSignals.structure_score >= 1 ||
    gateSignals.risk_score >= 1
  ) {
    return "medium";
  }

  return "high";
}

function mapAmbiguityLevel(
  ambiguityScore: GateSignals["ambiguity_score"],
): "low" | "medium" | "high" {
  if (ambiguityScore === 2) {
    return "high";
  }

  if (ambiguityScore === 1) {
    return "medium";
  }

  return "low";
}

export function deriveIntentIr(args: {
  source: SourceInput;
  draft: AnalysisDraft;
  gateSignals: GateSignals;
}): IntentIr {
  const { source, draft, gateSignals } = args;

  return {
    version: 1,
    source_text: source.text,
    summary: draft.summary,
    mode: gateSignals.mode_guess,
    intent: {
      goal: draft.intent.goal,
      audience: draft.intent.audience,
      context: draft.intent.context,
      output_kind: gateSignals.provisional_renderer,
      tone: draft.intent.tone,
    },
    output_contract: {
      constraints: draft.constraints,
      success_criteria: draft.success_criteria,
    },
    analysis: {
      risks: draft.risks,
      assumptions: draft.assumptions,
      missing_information: draft.missing_information,
      clarification_questions: draft.candidate_questions,
    },
    signals: {
      confidence: mapConfidence(gateSignals),
      needs_clarification: gateSignals.next_step === "clarify_first",
      ambiguity_level: mapAmbiguityLevel(gateSignals.ambiguity_score),
    },
  };
}
