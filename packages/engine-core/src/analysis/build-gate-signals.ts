import type {
  ApprovalLevel,
  CardHint,
  GateSignals,
  ModeId,
  NextStep,
  RendererId,
  ScoreValue,
} from "@vive-studio/engine-contracts";

import { matchCardHint } from "./match-card-hint.js";

export type GateSignalInput = {
  card_hint?: CardHint;
  mode_guess: ModeId;
  provisional_renderer: RendererId;
  missing_critical_facts: boolean;
  ambiguity_score: ScoreValue;
  structure_score: ScoreValue;
  risk_score: ScoreValue;
};

function detectStrongMismatch(
  cardHint: CardHint | undefined,
  modeGuess: ModeId,
  renderer: RendererId,
): { pivot_recommended: boolean; pivot_reason?: string } {
  const cardIntent = matchCardHint(cardHint);

  if (!cardIntent) {
    return {
      pivot_recommended: false,
    };
  }

  if (cardIntent.mode !== modeGuess) {
    return {
      pivot_recommended: true,
      pivot_reason: "selected card implies a different work posture",
    };
  }

  if (cardIntent.renderer !== renderer) {
    return {
      pivot_recommended: true,
      pivot_reason: "selected card implies a different renderer family",
    };
  }

  return {
    pivot_recommended: false,
  };
}

export function buildGateSignals(input: GateSignalInput): GateSignals {
  const reasonCodes: string[] = [];
  const mismatch = detectStrongMismatch(
    input.card_hint,
    input.mode_guess,
    input.provisional_renderer,
  );

  let nextStep: NextStep = "direct_render";
  let approvalLevel: ApprovalLevel = "none";

  if (input.mode_guess === "review") {
    reasonCodes.push("review_intent");
  }

  if (input.missing_critical_facts) {
    nextStep = "clarify_first";
    reasonCodes.push("critical_facts_missing");
  } else if (input.risk_score === 2 || input.ambiguity_score === 2) {
    nextStep = "approval_pending";
    approvalLevel = "required";

    if (input.risk_score === 2) {
      reasonCodes.push("high_risk_output");
    }

    if (input.ambiguity_score === 2) {
      reasonCodes.push("high_ambiguity");
    }
  } else if (
    input.structure_score === 2 ||
    [input.ambiguity_score, input.structure_score, input.risk_score].filter(
      (score) => score >= 1,
    ).length >= 2
  ) {
    nextStep = "approval_pending";
    approvalLevel = "recommended";

    if (input.structure_score === 2) {
      reasonCodes.push("high_structure_request");
    } else {
      reasonCodes.push("multiple_medium_scores");
    }
  }

  if (mismatch.pivot_recommended) {
    reasonCodes.push("strong_renderer_mismatch");
  }

  const baseSignals = {
    mode_guess: input.mode_guess,
    provisional_renderer: input.provisional_renderer,
    missing_critical_facts: input.missing_critical_facts,
    ambiguity_score: input.ambiguity_score,
    structure_score: input.structure_score,
    risk_score: input.risk_score,
    next_step: nextStep,
    approval_level: approvalLevel,
    pivot_recommended: mismatch.pivot_recommended,
    reason_codes: reasonCodes,
  };

  if (mismatch.pivot_reason) {
    return {
      ...baseSignals,
      pivot_reason: mismatch.pivot_reason,
    };
  }

  return baseSignals;
}
