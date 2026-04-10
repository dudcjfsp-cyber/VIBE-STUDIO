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
    title: "Review target is too thin",
    when: (signals) =>
      signals.normalizedText.length < 20 || signals.tokenCount <= 4,
    buildDetail: (signals) =>
      `The current draft is only ${signals.tokenCount} tokens (${quoteExcerpt(
        signals.excerpt,
      )}), so the review would have to guess the intended message, scope, and quality bar.`,
    buildRecommendation: () =>
      "Expand the draft itself with the core subject, who it is for, where it will be used, and at least one non-negotiable expectation for the final result.",
  },
  {
    id: "missing_audience",
    severity: "medium",
    title: "Audience is not identified",
    when: (signals) => !signals.hasAudience,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} ${quoteExcerpt(
        signals.excerpt,
      )} does not clearly say who should read or use the result, so audience fit and emphasis are hard to judge.`,
    buildRecommendation: (signals) =>
      `Name the primary reader or user directly in the draft, for example "${buildAudienceExample(
        signals.artifactKind,
      )}".`,
  },
  {
    id: "underspecified_subject",
    severity: "medium",
    title: "Subject is still underspecified",
    when: (signals) => !signals.hasSubject,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} The current draft ${quoteExcerpt(
        signals.excerpt,
      )} does not anchor itself to a concrete product, topic, or object strongly enough to judge relevance and completeness.`,
    buildRecommendation: () =>
      "State exactly what the text is about so the review can check whether the claims, wording, and missing points actually match that subject.",
  },
  {
    id: "missing_context",
    severity: "medium",
    title: "Usage context is missing",
    when: (signals) => !signals.hasContext,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} ${quoteExcerpt(
        signals.excerpt,
      )} does not explain where this text will be used, which makes it difficult to judge the right level of detail, framing, and call-to-action.`,
    buildRecommendation: (signals) =>
      `Add the delivery context, such as ${buildContextExample(
        signals.artifactKind,
      )}.`,
  },
  {
    id: "missing_value_signal",
    severity: "medium",
    title: "User value is still implicit",
    when: (signals) =>
      signals.tokenCount > 6 && signals.hasSubject && !signals.hasValueSignal,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} The draft identifies the subject, but ${quoteExcerpt(
        signals.excerpt,
      )} still does not make the user benefit or outcome explicit enough to judge whether the message is meaningful.`,
    buildRecommendation: (signals) =>
      signals.artifactKind === "architecture"
        ? "Add the concrete design value or tradeoff outcome, such as what this structure makes safer, simpler, faster, or easier to operate."
        : "Add the concrete benefit or change for the user, such as what becomes easier, faster, safer, or clearer because of this product or message.",
  },
  {
    id: "implicit_quality_bar",
    severity: "low",
    title: "Quality bar is mostly implicit",
    when: (signals) => !signals.hasConstraints,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} Tone, structure, or non-negotiable constraints are still mostly implicit in ${quoteExcerpt(
        signals.excerpt,
      )}, so the draft can drift toward a generic result even if the direction is roughly right.`,
    buildRecommendation: (signals) =>
      `Add one or two explicit constraints, such as ${buildConstraintExample(
        signals.artifactKind,
      )}.`,
  },
  {
    id: "tighten_viable_draft",
    severity: "low",
    title: "Draft is usable but still worth tightening",
    when: () => true,
    buildDetail: (signals) =>
      `${buildPresentAnchorSummary(signals)} The artifact already covers the main direction (${quoteExcerpt(
        signals.excerpt,
      )}), but a final pass can still improve precision, reader fit, and consistency.`,
    buildRecommendation: (signals) =>
      `Tighten the main claim for this ${describeArtifactKind(
        signals.artifactKind,
      )}, keep the reader fit explicit, and make the final constraints concrete enough to prevent a generic rewrite.`,
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
      return "prompt-like draft";
    case "product-copy":
      return "product copy draft";
    case "plan":
      return "planning draft";
    case "architecture":
      return "structure or architecture draft";
    default:
      return "general draft";
  }
}

function buildAudienceExample(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "product-copy":
      return "for first-time app store visitors";
    case "plan":
      return "for founders, operators, or the internal team using this plan";
    case "architecture":
      return "for the engineer or team reviewing this structure";
    case "prompt":
      return "for the model or user role this prompt is written around";
    default:
      return "for the primary reader or user of this draft";
  }
}

function buildContextExample(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "product-copy":
      return "app store copy, landing page hero text, or a first-screen intro";
    case "plan":
      return "kickoff note, proposal summary, or scope alignment document";
    case "architecture":
      return "system design review, implementation planning, or handoff note";
    case "prompt":
      return "chat prompt, system prompt, or template prompt";
    default:
      return "public announcement, internal note, summary, or presentation context";
  }
}

function buildConstraintExample(kind: ReviewArtifactKind): string {
  switch (kind) {
    case "product-copy":
      return "tone, length, overclaim limits, or must-mention value points";
    case "plan":
      return "scope boundary, success criteria, or non-goals";
    case "architecture":
      return "system boundary, design focus, or constraints that must shape the structure";
    case "prompt":
      return "output format, tone, must-include context, or excluded assumptions";
    default:
      return "tone, length, structure, or must-include points";
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
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildPresentAnchorSummary(signals: ReviewSignalSnapshot): string {
  const strengths = buildStrengths(signals);

  if (strengths.length === 0) {
    return "The draft does not yet establish strong review anchors.";
  }

  return `The draft already establishes ${formatLabelList(strengths)}.`;
}

function buildStrengths(signals: ReviewSignalSnapshot): string[] {
  const strengths: string[] = [];

  if (signals.hasAudience) {
    strengths.push("audience");
  }

  if (signals.hasSubject) {
    strengths.push("subject");
  }

  if (signals.hasContext) {
    strengths.push("usage context");
  }

  if (signals.hasValueSignal) {
    strengths.push("user value");
  }

  if (signals.hasConstraints) {
    strengths.push("constraints");
  }

  return strengths;
}

function buildMissingAreas(signals: ReviewSignalSnapshot): string[] {
  const missingAreas: string[] = [];

  if (!signals.hasAudience) {
    missingAreas.push("audience");
  }

  if (!signals.hasSubject) {
    missingAreas.push("subject");
  }

  if (!signals.hasContext) {
    missingAreas.push("usage context");
  }

  if (!signals.hasValueSignal && signals.hasSubject) {
    missingAreas.push("user value");
  }

  if (!signals.hasConstraints) {
    missingAreas.push("constraints");
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
