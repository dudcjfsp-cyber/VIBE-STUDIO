import type { EngineRequest, ModeId } from "@vive-studio/engine-contracts";

import { extractInlineArtifact } from "./extract-inline-artifact.js";
import { includesAny, lowerText } from "./text-utils.js";

const REVIEW_PATTERNS = [
  /봐줘/u,
  /검토/u,
  /리뷰/u,
  /평가/u,
  /진단/u,
  /분석해/u,
  /이상한지/u,
  /말이 되는지/u,
  /빠졌는지/u,
  /부족한지/u,
  /문제/u,
  /critic/i,
  /review/i,
  /assess/i,
  /evaluate/i,
  /inspect/i,
  /what('?s| is) wrong/i,
  /weak point/i,
  /flaw/i,
];

const ARTIFACT_PATTERNS = [
  /프롬프트/u,
  /기획안/u,
  /소개문/u,
  /초안/u,
  /문서/u,
  /계획/u,
  /구조/u,
  /draft/i,
  /prompt/i,
  /spec/i,
  /plan/i,
  /architecture/i,
];

export type ModeDetection = {
  mode: ModeId;
  review_requested: boolean;
  artifact_available: boolean;
};

export function detectMode(request: EngineRequest): ModeDetection {
  const text = lowerText(request.source.text);
  const hasReviewLanguage = includesAny(text, REVIEW_PATTERNS);
  const hasArtifactReference = includesAny(text, ARTIFACT_PATTERNS);
  const artifactAvailable =
    Boolean(request.source.artifacts?.length) ||
    Boolean(extractInlineArtifact(request.source.text));

  if (hasReviewLanguage && (hasArtifactReference || artifactAvailable)) {
    return {
      mode: "review",
      review_requested: true,
      artifact_available: artifactAvailable,
    };
  }

  if (request.card_hint === "critical-review" && !hasReviewLanguage) {
    return {
      mode: "review",
      review_requested: true,
      artifact_available: artifactAvailable,
    };
  }

  return {
    mode: "create",
    review_requested: false,
    artifact_available: artifactAvailable,
  };
}
