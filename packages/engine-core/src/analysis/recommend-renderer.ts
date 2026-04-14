import type {
  EngineRequest,
  ModeId,
  RendererId,
} from "@vive-studio/engine-contracts";

import { matchCardHint } from "./match-card-hint.js";
import { countMatches, lowerText } from "./text-utils.js";

const PROMPT_PATTERNS = [
  /프롬프트/u,
  /prompt/i,
  /공지문/u,
  /소개글/u,
  /문구/u,
  /메시지/u,
  /이메일/u,
  /사과/u,
  /작성해/u,
  /써줘/u,
  /물어봐야/u,
];

const SPEC_PATTERNS = [
  /기획/u,
  /정리해/u,
  /아이디어/u,
  /서비스/u,
  /앱/u,
  /문제/u,
  /대상/u,
  /목표/u,
  /plan/i,
  /scope/i,
];

const ARCHITECTURE_PATTERNS = [
  /구조/u,
  /아키텍처/u,
  /시스템/u,
  /컴포넌트/u,
  /페이지/u,
  /관리자/u,
  /결제/u,
  /알림/u,
  /흐름/u,
  /뼈대/u,
  /architecture/i,
  /component/i,
  /system/i,
];

export function recommendRenderer(
  request: EngineRequest,
  mode: ModeId,
): RendererId {
  if (mode === "review") {
    return "review-report";
  }

  const text = lowerText(request.source.text);
  const cardIntent = matchCardHint(request.card_hint);

  const scores: Record<Exclude<RendererId, "review-report">, number> = {
    prompt: countMatches(text, PROMPT_PATTERNS),
    plan: countMatches(text, SPEC_PATTERNS),
    architecture: countMatches(text, ARCHITECTURE_PATTERNS),
  };

  if (cardIntent && cardIntent.renderer !== "review-report") {
    scores[cardIntent.renderer] += 2;
  }

  const ordered = Object.entries(scores).sort((left, right) => {
    return right[1] - left[1];
  });

  const [bestRenderer, bestScore] = ordered[0] ?? ["plan", 0];
  const [, secondScore] = ordered[1] ?? ["plan", 0];
  const fallbackRenderer =
    cardIntent?.renderer && cardIntent.renderer !== "review-report"
      ? cardIntent.renderer
      : "plan";

  if (bestScore === 0) {
    return fallbackRenderer;
  }

  if (bestScore === secondScore) {
    return fallbackRenderer;
  }

  return bestRenderer as Exclude<RendererId, "review-report">;
}
