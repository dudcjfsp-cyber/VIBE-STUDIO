import type {
  EngineRequest,
  ModeId,
  RendererId,
} from "@vive-studio/engine-contracts";

import { matchCardHint } from "./match-card-hint.js";
import { countMatches, lowerText } from "./text-utils.js";

const PROMPT_PATTERNS = [
  /\ud504\ub86c\ud504\ud2b8/u,
  /prompt/i,
  /\uacf5\uc9c0\ubb38/u,
  /\uc18c\uac1c\uae00/u,
  /\ubb38\uad6c/u,
  /\uba54\uc2dc\uc9c0/u,
  /\uc774\uba54\uc77c/u,
  /\uacb0\uacfc/u,
  /\uc791\uc131\ud574/u,
  /\uc9c8\ubb38/u,
  /\ubb3c\uc5b4\ubd10\uc57c/u,
  /\uc368\uc918/u,
];

const SPEC_PATTERNS = [
  /\uae30\ud68d/u,
  /\uc815\ub9ac/u,
  /\uc544\uc774\ub514\uc5b4/u,
  /\uc11c\ube44\uc2a4/u,
  /\ubc94\uc704/u,
  /\ubb38\uc81c/u,
  /\ub300\uc0c1/u,
  /\ubaa9\ud45c/u,
  /plan/i,
  /scope/i,
];

const ARCHITECTURE_PATTERNS = [
  /\uad6c\uc870/u,
  /\uc544\ud0a4\ud14d\ucc98/u,
  /\uc2dc\uc2a4\ud15c/u,
  /\ucef4\ud3ec\ub10c\ud2b8/u,
  /\ud398\uc774\uc9c0/u,
  /\uad00\ub9ac\uc790/u,
  /\uacb0\uc81c/u,
  /\uc54c\ub9bc/u,
  /\ud750\ub984/u,
  /\ubc31\uc5d4\ub4dc/u,
  /api/i,
  /db/i,
  /architecture/i,
  /component/i,
  /system/i,
];

const STRONG_PROMPT_TERMS = [
  "\ud504\ub86c\ud504\ud2b8",
  "\uacf5\uc9c0\ubb38",
  "\uc18c\uac1c\uae00",
  "\ubb38\uad6c",
  "\uba54\uc2dc\uc9c0",
  "\uc774\uba54\uc77c",
  "\uc791\uc131",
  "\uc368\uc918",
];

const STRONG_ARCHITECTURE_TERMS = [
  "\uad6c\uc870",
  "\uc544\ud0a4\ud14d\ucc98",
  "\uc2dc\uc2a4\ud15c",
  "\ubc31\uc5d4\ub4dc",
  "api",
  "db",
  "component",
  "architecture",
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
  const promptIntentIsExplicit = includesAnyTerm(text, STRONG_PROMPT_TERMS);
  const architectureIntentIsExplicit = includesAnyTerm(
    text,
    STRONG_ARCHITECTURE_TERMS,
  );

  if (bestScore === 0) {
    return fallbackRenderer;
  }

  if (promptIntentIsExplicit && scores.architecture === 0) {
    return "prompt";
  }

  if (architectureIntentIsExplicit && scores.prompt === 0) {
    return "architecture";
  }

  if (bestScore === secondScore) {
    return fallbackRenderer;
  }

  return bestRenderer as Exclude<RendererId, "review-report">;
}

function includesAnyTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}
