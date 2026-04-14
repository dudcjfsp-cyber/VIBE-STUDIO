import type {
  EngineRequest,
  ModeId,
  RendererId,
  ScoreValue,
} from "@vive-studio/engine-contracts";

import { countMatches, includesAny, lowerText } from "./text-utils.js";

const HIGH_RISK_PATTERNS = [
  /결제/u,
  /환불/u,
  /고객/u,
  /공지문/u,
  /사과/u,
  /법률/u,
  /보안/u,
  /security/i,
  /customer/i,
  /refund/i,
  /public/i,
];

const REVIEW_MEDIUM_RISK_PATTERNS = [
  /기획안/u,
  /구조/u,
  /plan/i,
  /spec/i,
];

const MULTI_PATH_PATTERNS = [
  /혹은/u,
  /or/i,
];

const DETAILS_MISSING_PATTERNS = [
  /전체/u,
  /대충/u,
  /정리해줘/u,
];

const REVIEW_MEDIUM_IMPACT_PATTERNS = [
  /기획안/u,
  /구조/u,
  /소개문/u,
  /plan/i,
  /spec/i,
  /architecture/i,
];

export type RequestScores = {
  ambiguity_score: ScoreValue;
  structure_score: ScoreValue;
  risk_score: ScoreValue;
};

export function scoreRequest(
  request: EngineRequest,
  mode: ModeId,
  renderer: RendererId,
  _missingCriticalFacts: boolean,
): RequestScores {
  const text = lowerText(request.source.text);

  let ambiguityScore: ScoreValue = 0;

  if (countMatches(text, MULTI_PATH_PATTERNS) > 0) {
    ambiguityScore = 2;
  } else if (countMatches(text, DETAILS_MISSING_PATTERNS) > 0) {
    ambiguityScore = 1;
  }

  let structureScore: ScoreValue = 0;

  if (renderer === "architecture") {
    structureScore = 2;
  } else if (renderer === "plan") {
    structureScore = 1;
  } else if (
    mode === "review" &&
    includesAny(text, REVIEW_MEDIUM_RISK_PATTERNS)
  ) {
    structureScore = 1;
  }

  let riskScore: ScoreValue = 0;

  if (renderer === "architecture" || includesAny(text, HIGH_RISK_PATTERNS)) {
    riskScore = 2;
  } else if (
    renderer === "plan" ||
    (mode === "review" &&
      includesAny(text, REVIEW_MEDIUM_IMPACT_PATTERNS))
  ) {
    riskScore = 1;
  }

  return {
    ambiguity_score: ambiguityScore,
    structure_score: structureScore,
    risk_score: riskScore,
  };
}
