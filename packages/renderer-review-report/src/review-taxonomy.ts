import type { ReviewFinding, ReviewSeverity } from "./review-report-output.js";

type ReviewTaxonomyId =
  | "too_thin"
  | "missing_audience"
  | "underspecified_subject"
  | "missing_context"
  | "missing_value_signal"
  | "implicit_quality_bar"
  | "tighten_viable_draft";

type ReviewSignalSnapshot = {
  normalizedText: string;
  tokenCount: number;
  excerpt: string;
  artifactKind: ReviewArtifactKind;
  hasAudience: boolean;
  hasSubject: boolean;
  hasContext: boolean;
  hasValueSignal: boolean;
  hasConstraints: boolean;
};

export type ReviewArtifactKind =
  | "prompt"
  | "product-copy"
  | "plan"
  | "architecture"
  | "general";

export type ReviewArtifactInsight = {
  tokenCount: number;
  excerpt: string;
  artifactKind: ReviewArtifactKind;
  strengths: string[];
  missingAreas: string[];
};

type ReviewTaxonomyRule = {
  id: ReviewTaxonomyId;
  severity: ReviewSeverity;
  title: string;
  when(signals: ReviewSignalSnapshot): boolean;
  buildDetail(signals: ReviewSignalSnapshot): string;
  buildRecommendation(signals: ReviewSignalSnapshot): string;
};

const AUDIENCE_PATTERNS = [
  /audience/i,
  /reader/i,
  /user/i,
  /customer/i,
  /team/i,
  /manager/i,
  /\uC0AC\uC6A9\uC790/u,
  /\uACE0\uAC1D/u,
  /\uB3C5\uC790/u,
  /\uD300/u,
  /\uAD00\uB9AC\uC790/u,
  /\uC9C1\uC7A5\uC778/u,
  /\uCD08\uBCF4\uC790/u,
];

const SUBJECT_PATTERNS = [
  /service/i,
  /product/i,
  /feature/i,
  /app/i,
  /system/i,
  /project/i,
  /campaign/i,
  /payment/i,
  /meeting/i,
  /launch/i,
  /order/i,
  /\uC11C\uBE44\uC2A4/u,
  /\uC81C\uD488/u,
  /\uAE30\uB2A5/u,
  /\uC571/u,
  /\uC2DC\uC2A4\uD15C/u,
  /\uD504\uB85C\uC81D\uD2B8/u,
  /\uACB0\uC81C/u,
  /\uC8FC\uBB38/u,
  /\uD68C\uC758/u,
  /\uC6B4\uB3D9/u,
];

const CONTEXT_PATTERNS = [
  /landing page/i,
  /app store/i,
  /homepage/i,
  /announcement/i,
  /email/i,
  /message/i,
  /proposal/i,
  /intro/i,
  /overview/i,
  /\uCCAB \uD654\uBA74/u,
  /\uB79C\uB529/u,
  /\uC571\uC2A4\uD1A0\uC5B4/u,
  /\uACF5\uC9C0/u,
  /\uBA54\uC77C/u,
  /\uBA54\uC2DC\uC9C0/u,
  /\uC18C\uAC1C/u,
  /\uC81C\uC548/u,
  /\uC694\uC57D/u,
  /\uCD08\uC548/u,
];

const CONSTRAINT_PATTERNS = [
  /tone/i,
  /style/i,
  /formal/i,
  /friendly/i,
  /concise/i,
  /short/i,
  /detailed/i,
  /bullet/i,
  /length/i,
  /must/i,
  /should/i,
  /include/i,
  /exclude/i,
  /\uD1A4/u,
  /\uBB38\uCCB4/u,
  /\uCE5C\uADFC/u,
  /\uC815\uC911/u,
  /\uACFC\uC7A5/u,
  /\uAC04\uB2E8/u,
  /\uC790\uC138/u,
  /\uAE38\uC774/u,
  /\uD3EC\uD568/u,
  /\uC81C\uC678/u,
  /\uD55C \uBB38\uC7A5/u,
];

const VALUE_PATTERNS = [
  /help/i,
  /save/i,
  /improve/i,
  /faster/i,
  /easier/i,
  /clearer/i,
  /better/i,
  /reduce/i,
  /increase/i,
  /solve/i,
  /support/i,
  /\uB3D5/u,
  /\uC27D/u,
  /\uBE60\uB974/u,
  /\uC904/u,
  /\uAC1C\uC120/u,
  /\uD6A8\uC728/u,
  /\uBB38\uC81C/u,
  /\uD574\uACB0/u,
  /\uB0AE/u,
  /\uC774\uD574/u,
];

const PROMPT_PATTERNS = [
  /prompt/i,
  /write/i,
  /rewrite/i,
  /summarize/i,
  /introduce/i,
  /\uC368\uC918/u,
  /\uC791\uC131/u,
  /\uC815\uB9AC/u,
  /\uC694\uC57D/u,
  /\uC18C\uAC1C/u,
];

const PRODUCT_COPY_PATTERNS = [
  /app store/i,
  /landing page/i,
  /homepage/i,
  /hero copy/i,
  /intro/i,
  /tagline/i,
  /announcement/i,
  /\uC571\uC2A4\uD1A0\uC5B4/u,
  /\uB79C\uB529/u,
  /\uD648\uD398\uC774\uC9C0/u,
  /\uC18C\uAC1C\uBB38/u,
  /\uD0DC\uADF8\uB77C\uC778/u,
  /\uACF5\uC9C0/u,
];

const PLAN_PATTERNS = [
  /plan/i,
  /spec/i,
  /proposal/i,
  /roadmap/i,
  /scope/i,
  /requirement/i,
  /strategy/i,
  /\uAE30\uD68D/u,
  /\uAE30\uD68D\uC548/u,
  /\uC81C\uC548/u,
  /\uB85C\uB4DC\uB9F5/u,
  /\uBC94\uC704/u,
  /\uC694\uAD6C\uC0AC\uD56D/u,
  /\uC804\uB7B5/u,
];

const ARCHITECTURE_PATTERNS = [
  /architecture/i,
  /system/i,
  /component/i,
  /flow/i,
  /api/i,
  /database/i,
  /service/i,
  /\uAD6C\uC870/u,
  /\uC544\uD0A4\uD14D\uCC98/u,
  /\uCEF4\uD3EC\uB10C\uD2B8/u,
  /\uD750\uB984/u,
  /\uC11C\uBE44\uC2A4/u,
  /\uB370\uC774\uD130\uBCA0\uC774\uC2A4/u,
];

const TAXONOMY_RULES: ReviewTaxonomyRule[] = [
  {
    id: "too_thin",
    severity: "high",
    title: "검토 대상이 너무 짧습니다",
    when: (signals) =>
      signals.normalizedText.length < 20 || signals.tokenCount <= 4,
    buildDetail: (signals) =>
      `현재 초안은 ${signals.tokenCount}개 토큰 정도로 매우 짧습니다. ${quoteExcerpt(
        signals.excerpt,
      )}만으로는 의도한 메시지, 범위, 품질 기준을 추측해야 합니다.`,
    buildRecommendation: () =>
      "초안에 핵심 주제, 대상, 사용 위치, 최종 결과에서 꼭 지켜야 할 조건을 함께 적어 주세요.",
  },
  {
    id: "missing_audience",
    severity: "medium",
    title: "대상이 명확하지 않습니다",
    when: (signals) => !signals.hasAudience,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} ${quoteExcerpt(
        signals.excerpt,
      )}에는 누가 읽거나 사용할 결과인지가 분명하지 않아, 대상 적합성과 강조점을 판단하기 어렵습니다.`,
    buildRecommendation: (signals) =>
      `초안에 주 독자나 사용자를 직접 적어 주세요. 예: "${buildAudienceExample(
        signals.artifactKind,
      )}".`,
  },
  {
    id: "underspecified_subject",
    severity: "medium",
    title: "주제가 아직 구체적이지 않습니다",
    when: (signals) => !signals.hasSubject,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} 현재 초안 ${quoteExcerpt(
        signals.excerpt,
      )}은 구체적인 제품, 주제, 대상물에 충분히 고정되어 있지 않아 관련성과 완성도를 판단하기 어렵습니다.`,
    buildRecommendation: () =>
      "무엇에 대한 글인지 정확히 적어 주세요. 그래야 주장, 표현, 빠진 내용이 주제와 맞는지 검토할 수 있습니다.",
  },
  {
    id: "missing_context",
    severity: "medium",
    title: "사용 맥락이 빠져 있습니다",
    when: (signals) => !signals.hasContext,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} ${quoteExcerpt(
        signals.excerpt,
      )}에는 이 글이 어디에서 쓰이는지가 드러나지 않아, 적절한 상세도와 프레이밍, 행동 유도를 판단하기 어렵습니다.`,
    buildRecommendation: (signals) =>
      `전달 맥락을 추가해 주세요. 예: ${buildContextExample(
        signals.artifactKind,
      )}.`,
  },
  {
    id: "missing_value_signal",
    severity: "medium",
    title: "사용자 가치가 아직 암시적입니다",
    when: (signals) =>
      signals.tokenCount > 6 && signals.hasSubject && !signals.hasValueSignal,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} 초안에 주제는 보이지만 ${quoteExcerpt(
        signals.excerpt,
      )}만으로는 사용자에게 생기는 변화나 이점이 충분히 드러나지 않아 메시지의 의미를 판단하기 어렵습니다.`,
    buildRecommendation: (signals) =>
      signals.artifactKind === "architecture"
        ? "이 구조가 무엇을 더 안전하게, 단순하게, 빠르게, 운영하기 쉽게 만드는지 같은 설계 가치를 적어 주세요."
        : "이 제품이나 메시지 때문에 사용자가 무엇을 더 쉽게, 빠르게, 안전하게, 명확하게 할 수 있는지 적어 주세요.",
  },
  {
    id: "implicit_quality_bar",
    severity: "low",
    title: "품질 기준이 대부분 암시적입니다",
    when: (signals) => !signals.hasConstraints,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} ${quoteExcerpt(
        signals.excerpt,
      )}에는 톤, 구조, 꼭 지켜야 할 조건이 대부분 암시되어 있어 방향이 맞더라도 결과가 일반적으로 흐를 수 있습니다.`,
    buildRecommendation: (signals) =>
      `명시적인 제약을 한두 개 추가해 주세요. 예: ${buildConstraintExample(
        signals.artifactKind,
      )}.`,
  },
  {
    id: "tighten_viable_draft",
    severity: "low",
    title: "사용 가능한 초안이지만 더 다듬을 수 있습니다",
    when: () => true,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} 이 초안은 핵심 방향을 어느 정도 담고 있습니다. ${quoteExcerpt(
        signals.excerpt,
      )} 다만 마지막 정리를 통해 정확성, 대상 적합성, 일관성을 더 높일 수 있습니다.`,
    buildRecommendation: (signals) =>
      `${describeArtifactKind(
        signals.artifactKind,
      )}의 핵심 주장을 더 선명하게 만들고, 독자 적합성과 최종 제약을 구체화해 일반적인 수정으로 흐르지 않게 해 주세요.`,
  },
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function buildSignals(artifactText: string): ReviewSignalSnapshot {
  const normalizedText = normalizeText(artifactText);
  const excerpt = truncateArtifactExcerpt(normalizedText, 96);

  return {
    normalizedText,
    tokenCount: tokenize(normalizedText).length,
    excerpt,
    artifactKind: classifyArtifactKind(normalizedText),
    hasAudience: matchesAny(normalizedText, AUDIENCE_PATTERNS),
    hasSubject: matchesAny(normalizedText, SUBJECT_PATTERNS),
    hasContext: matchesAny(normalizedText, CONTEXT_PATTERNS),
    hasValueSignal: matchesAny(normalizedText, VALUE_PATTERNS),
    hasConstraints: matchesAny(normalizedText, CONSTRAINT_PATTERNS),
  };
}

export function truncateArtifactExcerpt(
  artifactText: string,
  maxLength = 140,
): string {
  const normalized = normalizeText(artifactText);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function quoteExcerpt(excerpt: string): string {
  return `"${excerpt}"`;
}

function classifyArtifactKind(text: string): ReviewArtifactKind {
  if (matchesAny(text, PRODUCT_COPY_PATTERNS)) {
    return "product-copy";
  }

  if (matchesAny(text, ARCHITECTURE_PATTERNS)) {
    return "architecture";
  }

  if (matchesAny(text, PLAN_PATTERNS)) {
    return "plan";
  }

  if (matchesAny(text, PROMPT_PATTERNS)) {
    return "prompt";
  }

  return "general";
}

function describeArtifactKind(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "prompt":
      return "프롬프트형 초안";
    case "product-copy":
      return "제품 문구 초안";
    case "plan":
      return "기획 초안";
    case "architecture":
      return "구조 설계 초안";
    default:
      return "일반 초안";
  }
}

function buildAudienceExample(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "product-copy":
      return "앱스토어를 처음 방문하는 사용자";
    case "plan":
      return "이 기획을 사용할 창업자, 운영자, 내부 팀";
    case "architecture":
      return "이 구조를 검토할 개발자나 팀";
    case "prompt":
      return "이 프롬프트가 전제하는 모델 역할이나 사용자 역할";
    default:
      return "이 초안의 주 독자나 사용자";
  }
}

function buildContextExample(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "product-copy":
      return "앱스토어 문구, 랜딩 페이지 첫 화면 문구, 첫 소개 문구";
    case "plan":
      return "킥오프 노트, 제안 요약, 범위 정렬 문서";
    case "architecture":
      return "시스템 설계 검토, 구현 계획, 인수인계 노트";
    case "prompt":
      return "채팅 프롬프트, 시스템 프롬프트, 템플릿 프롬프트";
    default:
      return "공개 공지, 내부 노트, 요약문, 발표 자료 맥락";
  }
}

function buildConstraintExample(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "product-copy":
      return "톤, 길이, 과장 금지, 꼭 언급할 가치";
    case "plan":
      return "범위 경계, 성공 기준, 제외할 것";
    case "architecture":
      return "시스템 경계, 설계 초점, 구조에 영향을 주는 제약";
    case "prompt":
      return "출력 형식, 톤, 꼭 포함할 맥락, 제외할 가정";
    default:
      return "톤, 길이, 구조, 꼭 포함할 항목";
  }
}

function formatLabelList(items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]}와 ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, ${items[items.length - 1]}`;
}

function buildPresentAnchorSummary(signals: ReviewSignalSnapshot): string {
  const strengths = buildStrengths(signals);

  if (strengths.length === 0) {
    return "이 초안은 아직 강한 검토 기준점을 충분히 만들지 못했습니다.";
  }

  return `이 초안은 이미 ${formatLabelList(strengths)} 항목을 어느 정도 보여줍니다.`;
}

function buildStrengths(signals: ReviewSignalSnapshot): string[] {
  const strengths: string[] = [];

  if (signals.hasAudience) {
    strengths.push("대상");
  }

  if (signals.hasSubject) {
    strengths.push("주제");
  }

  if (signals.hasContext) {
    strengths.push("사용 맥락");
  }

  if (signals.hasValueSignal) {
    strengths.push("사용자 가치");
  }

  if (signals.hasConstraints) {
    strengths.push("제약");
  }

  return strengths;
}

function buildMissingAreas(signals: ReviewSignalSnapshot): string[] {
  const missingAreas: string[] = [];

  if (!signals.hasAudience) {
    missingAreas.push("대상");
  }

  if (!signals.hasSubject) {
    missingAreas.push("주제");
  }

  if (!signals.hasContext) {
    missingAreas.push("사용 맥락");
  }

  if (!signals.hasValueSignal && signals.hasSubject) {
    missingAreas.push("사용자 가치");
  }

  if (!signals.hasConstraints) {
    missingAreas.push("제약");
  }

  return missingAreas;
}

export function analyzeReviewArtifact(artifactText: string): {
  findings: ReviewFinding[];
  insight: ReviewArtifactInsight;
} {
  const signals = buildSignals(artifactText);
  const findings = TAXONOMY_RULES.filter(
    (rule) => rule.id !== "tighten_viable_draft" && rule.when(signals),
  ).map<ReviewFinding>((rule) => ({
    severity: rule.severity,
    title: rule.title,
    detail: rule.buildDetail(signals),
    recommendation: rule.buildRecommendation(signals),
  }));

  if (findings.length === 0) {
    const fallbackRule = TAXONOMY_RULES.find(
      (rule) => rule.id === "tighten_viable_draft",
    );

    if (fallbackRule) {
      findings.push({
        severity: fallbackRule.severity,
        title: fallbackRule.title,
        detail: fallbackRule.buildDetail(signals),
        recommendation: fallbackRule.buildRecommendation(signals),
      });
    }
  }

  findings.sort((left, right) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    return severityRank[left.severity] - severityRank[right.severity];
  });

  return {
    findings,
    insight: {
      tokenCount: signals.tokenCount,
      excerpt: signals.excerpt,
      artifactKind: signals.artifactKind,
      strengths: buildStrengths(signals),
      missingAreas: buildMissingAreas(signals),
    },
  };
}

export function buildReviewFindings(artifactText: string): ReviewFinding[] {
  return analyzeReviewArtifact(artifactText).findings;
}
