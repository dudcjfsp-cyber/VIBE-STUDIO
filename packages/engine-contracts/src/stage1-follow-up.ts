import type { EngineResult } from "./engine-result.js";

export type Stage1ActionId =
  | "revise-from-review"
  | "expand-plan-detail"
  | "expand-architecture-detail";

export type Stage1ResultKind =
  | "revised-draft"
  | "expanded-plan"
  | "expanded-architecture";

export type Stage1SupportedRenderer =
  | "review-report"
  | "plan"
  | "architecture";

export type Stage1ActionDescriptor = {
  action_id: Stage1ActionId;
  description: string;
  result_kind: Stage1ResultKind;
  supported_renderer: Stage1SupportedRenderer;
  user_label: string;
};

export type Stage1ReviewFinding = {
  detail: string;
  recommendation: string;
  severity: "high" | "medium" | "low";
  title: string;
};

export type Stage1ReviewResultContext = {
  artifact_text: string;
  findings: Stage1ReviewFinding[];
  notes: string[];
  verdict: "needs-revision" | "usable-with-fixes";
};

export type Stage1PlanSection = {
  bullets: string[];
  title: string;
};

export type Stage1PlanResultContext = {
  notes: string[];
  sections: Stage1PlanSection[];
  title: string;
};

export type Stage1ArchitectureComponent = {
  name: string;
  responsibility: string;
};

export type Stage1ArchitectureFlow = {
  name: string;
  steps: string[];
};

export type Stage1ArchitectureResultContext = {
  components: Stage1ArchitectureComponent[];
  expansion_focus: "flow-detail";
  interaction_flows: Stage1ArchitectureFlow[];
  notes: string[];
  system_boundary: string;
  title: string;
};

export type Stage1ResultContext =
  | Stage1ReviewResultContext
  | Stage1PlanResultContext
  | Stage1ArchitectureResultContext;

export type Stage1PolicyContext = {
  allow_freeform_instruction: false;
  boundary_rules: string[];
  default_expansion_focus?: "flow-detail";
  keep_renderer_family: true;
  max_follow_up_results: 1;
  present_as_separate_block: true;
};

export type Stage1ReviewRefinementAnswer = {
  answer: string;
  question: string;
};

export type Stage1ReviewRefinementContext = {
  answers: Stage1ReviewRefinementAnswer[];
  base_result_body: string;
  base_remaining_questions: string[];
  base_result_title: string;
  kind: "review-remaining-question-answers";
};

export type Stage1FollowUpRequest = {
  policy_context: Stage1PolicyContext;
  primary_result: Record<string, unknown>;
  renderer: Stage1SupportedRenderer;
  review_refinement?: Stage1ReviewRefinementContext;
  result_context: Stage1ResultContext;
  selected_action: Stage1ActionId;
  source_result_ref?: Stage1SourceResultRef;
  source_text: string;
};

export type Stage1SourceResultRef = {
  output_index: number;
  renderer: Stage1SupportedRenderer;
  title?: string;
};

export type Stage1FollowUpResult = {
  action_id: Stage1ActionId;
  change_summary: string[];
  remaining_questions: string[];
  result_body: string;
  result_kind: Stage1ResultKind;
  result_title: string;
  source_result_ref: Stage1SourceResultRef;
};

const STAGE1_ACTIONS: readonly Stage1ActionDescriptor[] = [
  {
    action_id: "revise-from-review",
    description: "검토에서 나온 지적을 반영한 수정안을 별도 블록으로 만듭니다.",
    result_kind: "revised-draft",
    supported_renderer: "review-report",
    user_label: "지적 반영해서 다시 쓰기",
  },
  {
    action_id: "expand-plan-detail",
    description: "현재 기획 정리를 더 구체적인 다음 초안으로 확장합니다.",
    result_kind: "expanded-plan",
    supported_renderer: "plan",
    user_label: "더 구체화하기",
  },
  {
    action_id: "expand-architecture-detail",
    description: "현재 구조를 flow-detail 중심 세부 설계로 확장합니다.",
    result_kind: "expanded-architecture",
    supported_renderer: "architecture",
    user_label: "세부 설계로 확장하기",
  },
] as const;

export function listStage1ActionRegistry(): Stage1ActionDescriptor[] {
  return [...STAGE1_ACTIONS];
}

export function listVisibleStage1Actions(
  result: EngineResult,
): Stage1ActionDescriptor[] {
  const primaryOutput = result.outputs[0];

  if (!primaryOutput) {
    return [];
  }

  if (primaryOutput.validation.status !== "ready") {
    return [];
  }

  switch (primaryOutput.renderer) {
    case "review-report":
      return hasReviewFindings(primaryOutput.output)
        ? [readAction("revise-from-review")]
        : [];
    case "plan":
      return hasPlanSections(primaryOutput.output)
        ? [readAction("expand-plan-detail")]
        : [];
    case "architecture":
      return hasArchitectureCore(primaryOutput.output)
        ? [readAction("expand-architecture-detail")]
        : [];
    default:
      return [];
  }
}

export function buildStage1FollowUpRequest(
  result: EngineResult,
  actionId: Stage1ActionId,
): Stage1FollowUpRequest | undefined {
  const primaryOutput = result.outputs[0];

  if (!primaryOutput || !isVisibleAction(result, actionId)) {
    return undefined;
  }

  const basePolicyContext: Stage1PolicyContext = {
    allow_freeform_instruction: false,
    boundary_rules: [
      "Keep approval -> renderer -> agent ordering intact.",
      "Do not silently switch renderer family, mode, or workflow direction.",
      "Do not overwrite the primary result; produce one separate follow-up block only.",
      "Do not ask for or expect a freeform follow-up instruction in Stage 1.",
    ],
    keep_renderer_family: true,
    max_follow_up_results: 1,
    present_as_separate_block: true,
  };

  if (primaryOutput.renderer === "review-report" && hasReviewFindings(primaryOutput.output)) {
    return {
      policy_context: basePolicyContext,
      primary_result: primaryOutput.output,
      renderer: "review-report",
      result_context: {
        artifact_text: resolveArtifactText(result),
        findings: primaryOutput.output.findings,
        notes: primaryOutput.output.notes,
        verdict: primaryOutput.output.verdict,
      },
      selected_action: actionId,
      source_text: result.source.text,
    };
  }

  if (primaryOutput.renderer === "plan" && hasPlanSections(primaryOutput.output)) {
    return {
      policy_context: basePolicyContext,
      primary_result: primaryOutput.output,
      renderer: "plan",
      result_context: {
        notes: primaryOutput.output.notes,
        sections: primaryOutput.output.sections,
        title: primaryOutput.output.title,
      },
      selected_action: actionId,
      source_text: result.source.text,
    };
  }

  if (
    primaryOutput.renderer === "architecture" &&
    hasArchitectureCore(primaryOutput.output)
  ) {
    return {
      policy_context: {
        ...basePolicyContext,
        boundary_rules: [
          ...basePolicyContext.boundary_rules,
          "For architecture detail expansion, keep the default focus on flow-detail.",
          "Do not turn the result into code generation, implementation tasks, or a different renderer family.",
        ],
        default_expansion_focus: "flow-detail",
      },
      primary_result: primaryOutput.output,
      renderer: "architecture",
      result_context: {
        components: primaryOutput.output.components,
        expansion_focus: "flow-detail",
        interaction_flows: primaryOutput.output.interaction_flows,
        notes: primaryOutput.output.notes,
        system_boundary: primaryOutput.output.system_boundary,
        title: primaryOutput.output.title,
      },
      selected_action: actionId,
      source_text: result.source.text,
    };
  }

  return undefined;
}

export function buildStage1ReviewRefinementRequest(
  result: EngineResult,
  followUp: Stage1FollowUpResult,
  answers: Stage1ReviewRefinementAnswer[],
): Stage1FollowUpRequest | undefined {
  if (
    followUp.action_id !== "revise-from-review" ||
    followUp.result_kind !== "revised-draft"
  ) {
    return undefined;
  }

  const baseRequest = buildStage1FollowUpRequest(result, "revise-from-review");
  const normalizedAnswers = answers
    .map((entry) => ({
      answer: entry.answer.trim(),
      question: entry.question.trim(),
    }))
    .filter((entry) => entry.question.length > 0 && entry.answer.length > 0);

  if (!baseRequest || normalizedAnswers.length === 0) {
    return undefined;
  }

  return {
    ...baseRequest,
    review_refinement: {
      answers: normalizedAnswers,
      base_result_body: followUp.result_body,
      base_remaining_questions: followUp.remaining_questions,
      base_result_title: followUp.result_title,
      kind: "review-remaining-question-answers",
    },
    source_result_ref: followUp.source_result_ref,
  };
}

export function runDeterministicStage1FollowUp(
  request: Stage1FollowUpRequest,
): Stage1FollowUpResult {
  switch (request.selected_action) {
    case "revise-from-review":
      return buildReviewFollowUp(request);
    case "expand-plan-detail":
      return buildPlanFollowUp(request);
    case "expand-architecture-detail":
      return buildArchitectureFollowUp(request);
  }
}

function buildReviewFollowUp(
  request: Stage1FollowUpRequest,
): Stage1FollowUpResult {
  if (request.renderer !== "review-report" || !isReviewContext(request.result_context)) {
    throw new Error("Review follow-up requires a review-report result context.");
  }

  const artifactText = resolveReviewArtifact(request.result_context.artifact_text);
  const refinement = readReviewRefinement(request);
  const answeredQuestions = refinement?.answers ?? [];
  const korean = prefersKorean(
    request.source_text,
    artifactText,
    ...answeredQuestions.map((entry) => `${entry.question} ${entry.answer}`),
  );
  const findings = request.result_context.findings;
  const topFindings = findings.slice(0, 3);
  const defaultRemainingQuestions = findings.slice(3, 5).map((finding) =>
    korean
      ? `${finding.title}까지 반영하려면 추가 맥락이 더 필요한지 확인`
      : `Check whether ${finding.title} needs more source context before another pass`,
  );
  const remainingQuestionSource =
    refinement?.base_remaining_questions.length
      ? refinement.base_remaining_questions
      : defaultRemainingQuestions;
  const remainingQuestions = refinement
    ? remainingQuestionSource.filter(
        (question) =>
          !answeredQuestions.some((entry) => entry.question.trim() === question.trim()),
      )
    : defaultRemainingQuestions;
  const refinementSummary = answeredQuestions.slice(0, 2).map((entry) =>
    korean
      ? `"${shortenSentence(entry.question)}" 답변을 반영해 수정안을 더 구체화했다.`
      : `Applied an answer to "${shortenSentence(entry.question)}" to refine the draft.`,
  );

  return {
    action_id: request.selected_action,
    change_summary: [
      ...topFindings.map((finding) =>
        korean
          ? `${finding.title} 지적을 반영해 ${shortenSentence(finding.recommendation)}`
          : `Addressed ${finding.title} by ${shortenSentence(finding.recommendation)}`,
      ),
      ...refinementSummary,
    ],
    remaining_questions: remainingQuestions,
    result_body: korean
      ? buildKoreanReviewRevision(
          artifactText,
          request.source_text,
          topFindings,
          refinement,
        )
      : buildEnglishReviewRevision(
          artifactText,
          request.source_text,
          topFindings,
          refinement,
        ),
    result_kind: "revised-draft",
    result_title:
      refinement?.base_result_title?.trim() ||
      (korean ? "지적 반영 수정안" : "Revision Based on Review"),
    source_result_ref: request.source_result_ref ?? buildSourceResultRef(request),
  };
}

function buildPlanFollowUp(
  request: Stage1FollowUpRequest,
): Stage1FollowUpResult {
  if (request.renderer !== "plan" || !isPlanContext(request.result_context)) {
    throw new Error("Plan follow-up requires a plan result context.");
  }

  const context = request.result_context;
  const korean = prefersKorean(request.source_text, context.title);
  const expandedSections = context.sections.map((section) =>
    renderExpandedPlanSection(section, korean),
  );
  const thinSections = context.sections
    .filter((section) => section.bullets.length < 2)
    .map((section) => section.title);

  return {
    action_id: request.selected_action,
    change_summary: context.sections.slice(0, 3).map((section) =>
      korean
        ? `${section.title} 섹션에 실행 관점과 확인 포인트를 덧붙였다.`
        : `Added execution detail and checkpoints to ${section.title}.`,
    ),
    remaining_questions:
      thinSections.length > 0
        ? thinSections.map((title) =>
            korean
              ? `${title} 섹션은 아직 근거 사례나 범위 기준을 더 채울 수 있다.`
              : `${title} still needs stronger examples or clearer scope boundaries.`,
          )
        : [
            korean
              ? "세부화한 계획을 실제 우선순위와 일정 관점에서 한 번 더 정리할 수 있다."
              : "The expanded plan could still be tightened around priority and sequencing.",
          ],
    result_body: [
      korean ? "확장된 계획 초안" : "Expanded Plan Draft",
      "",
      ...expandedSections,
    ].join("\n"),
    result_kind: "expanded-plan",
    result_title: korean ? "더 구체화한 계획" : "More Detailed Plan",
    source_result_ref: buildSourceResultRef(request),
  };
}

function buildArchitectureFollowUp(
  request: Stage1FollowUpRequest,
): Stage1FollowUpResult {
  if (
    request.renderer !== "architecture" ||
    !isArchitectureContext(request.result_context)
  ) {
    throw new Error("Architecture follow-up requires an architecture result context.");
  }

  const context = request.result_context;
  const korean = prefersKorean(request.source_text, context.system_boundary);
  const flowDetails = context.interaction_flows.map((flow) =>
    renderDetailedFlow(flow, context.components, korean),
  );
  const outOfScope = korean
    ? [
        "API 명세 확장은 이번 단계에 포함하지 않았다.",
        "데이터 모델 세부화는 이번 단계에 포함하지 않았다.",
        "구현 작업 분해나 코드 생성으로는 넘어가지 않았다.",
      ]
    : [
        "API specification expansion stays out of scope in this pass.",
        "Detailed data modeling stays out of scope in this pass.",
        "This pass does not turn into implementation tasks or code generation.",
      ];

  return {
    action_id: request.selected_action,
    change_summary: [
      korean
        ? "기본 확장 축을 flow-detail로 고정했다."
        : "Kept the expansion anchored to flow-detail.",
      ...context.interaction_flows.slice(0, 2).map((flow) =>
        korean
          ? `${flow.name} 흐름을 단계별 책임 관점으로 더 잘게 풀었다.`
          : `Expanded ${flow.name} into finer-grained flow responsibilities.`,
      ),
    ],
    remaining_questions: outOfScope,
    result_body: [
      korean ? "세부 설계 확장" : "Detailed Flow Expansion",
      "",
      korean
        ? `이번 후속 결과는 "${context.system_boundary}" 구조를 유지한 채 주요 흐름을 더 세밀하게 풀어쓴 것이다.`
        : `This follow-up keeps the existing boundary around "${context.system_boundary}" and expands the main flows in more detail.`,
      "",
      ...(korean
        ? ["확장 초점: flow-detail", ""]
        : ["Expansion focus: flow-detail", ""]),
      ...flowDetails,
    ].join("\n"),
    result_kind: "expanded-architecture",
    result_title: korean ? "세부 설계 확장안" : "Detailed Architecture Expansion",
    source_result_ref: buildSourceResultRef(request),
  };
}

function buildKoreanReviewRevision(
  artifactText: string,
  sourceText: string,
  findings: Stage1ReviewFinding[],
  refinement?: Stage1ReviewRefinementContext,
): string {
  const subject = inferKoreanSubject(artifactText, sourceText);
  const audiencePrefix = hasKeyword(`${artifactText} ${sourceText}`, ["초보자"])
    ? "초보자도 바로 적응할 수 있는 "
    : "";
  const defaultFeatureSentence =
    subject === "생산성 앱"
      ? "복잡한 할 일을 쉽게 정리하고 우선순위를 빠르게 잡아 시간을 아끼게 도와줍니다."
      : `${subject}의 핵심 가치와 사용 이점을 더 분명하게 전달합니다.`;
  const ctaSentence = hasFindingKeyword(findings, ["흥미", "유도", "설득", "행동"])
    ? "지금 바로 시작해 더 가볍고 선명하게 하루를 관리해보세요."
    : "";
  const baseLines = (
    refinement?.base_result_body.trim() ||
    [`${audiencePrefix}${subject}입니다.`, defaultFeatureSentence, ctaSentence]
      .filter(Boolean)
      .join("\n")
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const audienceAnswer = findReviewAnswer(refinement, ["대상 사용자", "핵심 대상", "누가"]);
  const valueAnswer = findReviewAnswer(refinement, ["가치", "문제", "해결", "효율"]);
  const extraAnswers = (refinement?.answers ?? [])
    .filter(
      (entry) =>
        entry.answer !== audienceAnswer &&
        entry.answer !== valueAnswer,
    )
    .map((entry) => ensureSentence(entry.answer))
    .filter(Boolean);

  if (audienceAnswer) {
    baseLines[0] = buildAudienceLine(audienceAnswer, subject, "ko");
  } else if (!baseLines[0]) {
    baseLines[0] = `${audiencePrefix}${subject}입니다.`;
  }

  if (valueAnswer) {
    baseLines[1] = ensureSentence(valueAnswer);
  } else if (!baseLines[1]) {
    baseLines[1] = defaultFeatureSentence;
  }

  if (ctaSentence) {
    if (baseLines.length >= 3) {
      baseLines[2] = ctaSentence;
    } else {
      baseLines.push(ctaSentence);
    }
  }

  return [...baseLines.slice(0, 2), ...extraAnswers.slice(0, 1), ...baseLines.slice(2)]
    .filter(Boolean)
    .join("\n");
}

function buildEnglishReviewRevision(
  artifactText: string,
  sourceText: string,
  findings: Stage1ReviewFinding[],
  refinement?: Stage1ReviewRefinementContext,
): string {
  const subject = inferEnglishSubject(artifactText, sourceText);
  const defaultFirstSentence = /\bbeginner|first-time\b/i.test(
    `${artifactText} ${sourceText}`,
  )
    ? `A beginner-friendly ${subject}.`
    : `A clearer ${subject}.`;
  const defaultFeatureSentence =
    subject === "productivity app"
      ? "It helps you organize tasks quickly, set priorities with less friction, and save time as you work."
      : `It makes the core value and practical benefit of this ${subject} easier to understand.`;
  const ctaSentence = hasFindingKeyword(findings, ["engage", "persuade", "interest", "action"])
    ? "Start now and build a more focused, productive routine."
    : "";
  const baseLines = (
    refinement?.base_result_body.trim() ||
    [defaultFirstSentence, defaultFeatureSentence, ctaSentence]
      .filter(Boolean)
      .join("\n")
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const audienceAnswer = findReviewAnswer(refinement, ["target user", "audience", "who"]);
  const valueAnswer = findReviewAnswer(refinement, ["value", "problem", "benefit"]);

  if (audienceAnswer) {
    baseLines[0] = buildAudienceLine(audienceAnswer, subject, "en");
  } else if (!baseLines[0]) {
    baseLines[0] = defaultFirstSentence;
  }

  if (valueAnswer) {
    baseLines[1] = ensureSentence(valueAnswer);
  } else if (!baseLines[1]) {
    baseLines[1] = defaultFeatureSentence;
  }

  if (ctaSentence) {
    if (baseLines.length >= 3) {
      baseLines[2] = ctaSentence;
    } else {
      baseLines.push(ctaSentence);
    }
  }

  return baseLines.filter(Boolean).join("\n");
}

function inferKoreanSubject(artifactText: string, sourceText: string): string {
  const combined = `${artifactText} ${sourceText}`;

  if (combined.includes("생산성 앱")) {
    return "생산성 앱";
  }

  if (combined.includes("앱")) {
    return "앱";
  }

  if (combined.includes("서비스")) {
    return "서비스";
  }

  if (combined.includes("소개문")) {
    return "소개문";
  }

  return "초안";
}

function inferEnglishSubject(artifactText: string, sourceText: string): string {
  const combined = `${artifactText} ${sourceText}`.toLowerCase();

  if (combined.includes("productivity app")) {
    return "productivity app";
  }

  if (combined.includes("app")) {
    return "app";
  }

  if (combined.includes("service")) {
    return "service";
  }

  return "draft";
}

function renderExpandedPlanSection(
  section: Stage1PlanSection,
  korean: boolean,
): string {
  const lines = [section.title];

  for (const bullet of section.bullets) {
    lines.push(`- ${bullet}`);
    lines.push(
      korean
        ? "  - 더 구체하게: 이 항목이 실제 판단이나 실행에서 어떻게 쓰이는지 한 번 더 적는다."
        : "  - More detail: state how this point changes an actual decision or next step.",
    );
    lines.push(
      korean
        ? "  - 확인 포인트: 범위, 우선순위, 성공 기준 중 무엇을 먼저 잠글지 적는다."
        : "  - Checkpoint: clarify whether scope, priority, or success criteria should be locked first.",
    );
  }

  return lines.join("\n");
}

function renderDetailedFlow(
  flow: Stage1ArchitectureFlow,
  components: Stage1ArchitectureComponent[],
  korean: boolean,
): string {
  const lines = [flow.name];
  const relatedComponents = components.slice(0, 3).map((component) => component.name);

  flow.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
    lines.push(
      korean
        ? `   - 관여 컴포넌트: ${relatedComponents.join(", ")}`
        : `   - Involved components: ${relatedComponents.join(", ")}`,
    );
    lines.push(
      korean
        ? "   - 세부 설명: 입력 조건, 상태 변화, 다음 전달 대상을 짧게 적는다."
        : "   - Detail: capture the entry condition, state change, and next handoff.",
    );
  });

  return lines.join("\n");
}

function buildSourceResultRef(
  request: Stage1FollowUpRequest,
): Stage1SourceResultRef {
  const primaryTitle =
    typeof request.primary_result.title === "string"
      ? request.primary_result.title.trim()
      : undefined;

  return {
    output_index: 0,
    renderer: request.renderer,
    ...(primaryTitle ? { title: primaryTitle } : {}),
  };
}

function isVisibleAction(result: EngineResult, actionId: Stage1ActionId): boolean {
  return listVisibleStage1Actions(result).some(
    (action) => action.action_id === actionId,
  );
}

function readAction(actionId: Stage1ActionId): Stage1ActionDescriptor {
  const action = STAGE1_ACTIONS.find((entry) => entry.action_id === actionId);

  if (!action) {
    throw new Error(`Unknown Stage 1 action: ${actionId}`);
  }

  return action;
}

function hasReviewFindings(
  output: unknown,
): output is {
  findings: Stage1ReviewFinding[];
  notes: string[];
  title: string;
  verdict: "needs-revision" | "usable-with-fixes";
} {
  return (
    isRecord(output) &&
    Array.isArray(output.findings) &&
    output.findings.length > 0 &&
    output.findings.every(isReviewFinding)
  );
}

function hasPlanSections(
  output: unknown,
): output is {
  notes: string[];
  sections: Stage1PlanSection[];
  title: string;
} {
  return (
    isRecord(output) &&
    Array.isArray(output.sections) &&
    output.sections.length > 0 &&
    output.sections.every(isPlanSection)
  );
}

function hasArchitectureCore(
  output: unknown,
): output is {
  components: Stage1ArchitectureComponent[];
  interaction_flows: Stage1ArchitectureFlow[];
  notes: string[];
  system_boundary: string;
  title: string;
} {
  return (
    isRecord(output) &&
    typeof output.system_boundary === "string" &&
    output.system_boundary.trim().length > 0 &&
    Array.isArray(output.components) &&
    output.components.length > 0 &&
    output.components.every(isArchitectureComponent) &&
    Array.isArray(output.interaction_flows) &&
    output.interaction_flows.length > 0 &&
    output.interaction_flows.every(isArchitectureFlow)
  );
}

function isReviewFinding(value: unknown): value is Stage1ReviewFinding {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    typeof value.detail === "string" &&
    typeof value.recommendation === "string" &&
    (value.severity === "high" ||
      value.severity === "medium" ||
      value.severity === "low")
  );
}

function isPlanSection(value: unknown): value is Stage1PlanSection {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    Array.isArray(value.bullets) &&
    value.bullets.every((bullet) => typeof bullet === "string")
  );
}

function isArchitectureComponent(
  value: unknown,
): value is Stage1ArchitectureComponent {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.responsibility === "string"
  );
}

function isArchitectureFlow(value: unknown): value is Stage1ArchitectureFlow {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Array.isArray(value.steps) &&
    value.steps.every((step) => typeof step === "string")
  );
}

function isReviewContext(
  value: Stage1ResultContext,
): value is Stage1ReviewResultContext {
  return "findings" in value;
}

function isPlanContext(
  value: Stage1ResultContext,
): value is Stage1PlanResultContext {
  return "sections" in value;
}

function isArchitectureContext(
  value: Stage1ResultContext,
): value is Stage1ArchitectureResultContext {
  return "interaction_flows" in value && "system_boundary" in value;
}

function readReviewRefinement(
  request: Stage1FollowUpRequest,
): Stage1ReviewRefinementContext | undefined {
  if (!request.review_refinement) {
    return undefined;
  }

  return isReviewRefinementContext(request.review_refinement)
    ? request.review_refinement
    : undefined;
}

function resolveArtifactText(result: EngineResult): string {
  const artifactText = result.source.artifacts?.[0]?.text?.trim();

  if (artifactText) {
    return artifactText;
  }

  const extractedArtifact =
    extractQuotedArtifact(result.source.text) ?? extractColonArtifact(result.source.text);

  if (extractedArtifact) {
    return extractedArtifact;
  }

  return result.source.text.trim();
}

function resolveReviewArtifact(value: string): string {
  return (
    extractQuotedArtifact(value) ??
    extractColonArtifact(value) ??
    value.trim()
  );
}

function extractQuotedArtifact(value: string): string | undefined {
  const quotedMatch = value.match(/["'`“”‘’](.+?)["'`“”‘’]/s);

  if (!quotedMatch?.[1]) {
    return undefined;
  }

  const artifact = quotedMatch[1].trim();

  return artifact.length >= 2 ? artifact : undefined;
}

function extractColonArtifact(value: string): string | undefined {
  const colonIndex = value.lastIndexOf(":");

  if (colonIndex === -1) {
    return undefined;
  }

  const artifact = value.slice(colonIndex + 1).trim();

  return artifact.length >= 2 ? artifact : undefined;
}

function shortenSentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= 88) {
    return normalized;
  }

  return `${normalized.slice(0, 85)}...`;
}

function prefersKorean(...values: string[]): boolean {
  return values.some((value) => /[가-힣]/u.test(value));
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasFindingKeyword(
  findings: Stage1ReviewFinding[],
  keywords: string[],
): boolean {
  const text = findings
    .map((finding) => `${finding.title} ${finding.detail} ${finding.recommendation}`)
    .join(" ");

  return keywords.some((keyword) => text.includes(keyword));
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function isReviewRefinementContext(
  value: unknown,
): value is Stage1ReviewRefinementContext {
  return (
    isRecord(value) &&
    value.kind === "review-remaining-question-answers" &&
    typeof value.base_result_body === "string" &&
    Array.isArray(value.base_remaining_questions) &&
    value.base_remaining_questions.every(
      (entry) => typeof entry === "string",
    ) &&
    typeof value.base_result_title === "string" &&
    Array.isArray(value.answers) &&
    value.answers.every(isReviewRefinementAnswer)
  );
}

function isReviewRefinementAnswer(
  value: unknown,
): value is Stage1ReviewRefinementAnswer {
  return (
    isRecord(value) &&
    typeof value.question === "string" &&
    typeof value.answer === "string"
  );
}

function findReviewAnswer(
  refinement: Stage1ReviewRefinementContext | undefined,
  keywords: string[],
): string | undefined {
  if (!refinement) {
    return undefined;
  }

  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());
  const entry = refinement.answers.find((candidate) => {
    const question = candidate.question.toLowerCase();

    return loweredKeywords.some((keyword) => question.includes(keyword));
  });

  return entry?.answer.trim() || undefined;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/[.!?。！？]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function buildAudienceLine(
  audience: string,
  subject: string,
  language: "ko" | "en",
): string {
  const trimmed = audience.trim();

  if (!trimmed) {
    return language === "ko" ? `${subject}입니다.` : `A clearer ${subject}.`;
  }

  if (language === "ko") {
    if (trimmed.includes(subject)) {
      return /[.!?。！？]$/.test(trimmed) ? trimmed : `${trimmed}.`;
    }

    return `${trimmed}를 위한 ${subject}입니다.`;
  }

  if (trimmed.toLowerCase().includes(subject.toLowerCase())) {
    return ensureSentence(trimmed);
  }

  return `A ${subject} for ${trimmed}.`;
}
