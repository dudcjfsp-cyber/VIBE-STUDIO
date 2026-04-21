import type {
  EngineRequest,
  ModeId,
  RendererId,
} from "@vive-studio/engine-contracts";

import { extractInlineArtifact } from "./extract-inline-artifact.js";
import { includesAny, lowerText } from "./text-utils.js";

const GENERIC_PRODUCT_PATTERNS = [
  /만들고 싶은 앱/u,
  /필요한 서비스/u,
  /만들 서비스/u,
  /서비스인데/u,
];

const SPEC_PROBLEM_PATTERNS = [/문제/u, /해결/u, /불편/u, /도와/u];
const SPEC_AUDIENCE_PATTERNS = [
  /사용자/u,
  /고객/u,
  /사람/u,
  /직장인/u,
  /학생/u,
  /이웃/u,
  /팀/u,
];
const SPEC_SCOPE_PATTERNS = [
  /앱/u,
  /서비스/u,
  /기획/u,
  /아이디어/u,
  /플랫폼/u,
  /mvp/i,
];

const ARCHITECTURE_FOCUS_PATTERNS = [
  /전체 구조/u,
  /흐름/u,
  /mvp/i,
  /권한/u,
  /데이터/u,
  /api/i,
  /db/i,
  /백엔드/u,
  /frontend/i,
];

const PROMPT_GOAL_PATTERNS = [
  /프롬프트/u,
  /prompt/i,
  /공지문/u,
  /소개글/u,
  /문구/u,
  /메시지/u,
  /이메일/u,
  /질문/u,
  /작성/u,
  /써줘/u,
];

export type CriticalFactDetection = {
  missing_critical_facts: boolean;
  missing_items: string[];
  artifact_available: boolean;
};

function hasMeaningfulArchitectureBoundary(text: string): boolean {
  if (includesAny(text, GENERIC_PRODUCT_PATTERNS)) {
    return false;
  }

  return /[가-힣a-z0-9]{2,}\s*(앱|서비스|플랫폼)/u.test(text);
}

function hasConcretePlanSubject(text: string): boolean {
  return /[가-힣a-z0-9][가-힣a-z0-9\s]{2,}\s*(앱|서비스|플랫폼|모임)/u.test(text);
}

export function detectCriticalFacts(
  request: EngineRequest,
  mode: ModeId,
  renderer: RendererId,
): CriticalFactDetection {
  const text = lowerText(request.source.text);
  const artifactAvailable =
    Boolean(request.source.artifacts?.length) ||
    Boolean(extractInlineArtifact(request.source.text));
  const missingItems: string[] = [];

  if (mode === "review" || renderer === "review-report") {
    if (!artifactAvailable) {
      missingItems.push("review.artifact");
    }

    return {
      missing_critical_facts: missingItems.length > 0,
      missing_items: missingItems,
      artifact_available: artifactAvailable,
    };
  }

  if (renderer === "architecture") {
    if (!hasMeaningfulArchitectureBoundary(text)) {
      missingItems.push("architecture.boundary");
    }

    if (!includesAny(text, ARCHITECTURE_FOCUS_PATTERNS)) {
      missingItems.push("architecture.focus");
    }
  }

  if (renderer === "plan") {
    const planSignals = [
      includesAny(text, SPEC_PROBLEM_PATTERNS),
      includesAny(text, SPEC_AUDIENCE_PATTERNS),
      includesAny(text, SPEC_SCOPE_PATTERNS),
      hasConcretePlanSubject(text),
    ].filter(Boolean).length;

    if (planSignals < 2) {
      missingItems.push("plan.problem_or_scope");
    }
  }

  if (renderer === "prompt" && !includesAny(text, PROMPT_GOAL_PATTERNS)) {
    missingItems.push("prompt.goal");
  }

  return {
    missing_critical_facts: missingItems.length > 0,
    missing_items: missingItems,
    artifact_available: artifactAvailable,
  };
}
