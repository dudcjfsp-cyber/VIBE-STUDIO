import { useEffect, useMemo, useState } from "react";

import {
  buildStage1FollowUpRequest,
  buildStage1ReviewRefinementRequest,
  listVisibleStage1Actions,
  type EngineResult,
  type Stage1ActionId,
  type Stage1FollowUpResult,
  type Stage1ReviewRefinementAnswer,
} from "@vive-studio/engine-contracts";
import type { ArchitectureOutput } from "@vive-studio/renderer-architecture";
import type { PlanOutput } from "@vive-studio/renderer-plan";
import type { PromptOutput } from "@vive-studio/renderer-prompt";
import type { ReviewReportOutput } from "@vive-studio/renderer-review-report";

import { runStage1FollowUp } from "../../../lib/engine/stage1FollowUpClient";
import {
  createTelemetryRunId,
  trackProductEvent,
} from "../../../lib/observability/browserTelemetry";
import type { ProviderRuntimeConfig } from "../../../lib/provider/types";
import { buildArchitectureLearningPanel } from "../../../lib/ux/architectureLearning";
import { buildBeforeBuildKnowledgePanel } from "../../../lib/ux/beforeBuildKnowledge";
import { formatVisibleErrorMessage } from "../../../lib/ux/formatVisibleErrorMessage";
import {
  buildDecisionCardCopy,
  buildInputImprovementHints,
} from "../../../lib/ux/formatSignalCopy";
import { buildPlanLearningPanel } from "../../../lib/ux/planLearning";
import { buildPromptHelpLearningPanel } from "../../../lib/ux/promptHelpLearning";
import { buildReviewReportLearningPanel } from "../../../lib/ux/reviewReportLearning";
import { LearningPanel, LearningPointGrid } from "./LearningPanel";

type ResultPanelProps = {
  onReset: () => void;
  result: EngineResult;
  runId?: string;
  runtime: ProviderRuntimeConfig | undefined;
};

export function ResultPanel({ onReset, result, runId, runtime }: ResultPanelProps) {
  const output = result.outputs[0];
  const decisionCard = buildDecisionCardCopy(result);
  const inputImprovementHints = buildInputImprovementHints(result);
  const promptLearningPanel =
    output?.renderer === "prompt"
      ? buildPromptHelpLearningPanel(result, output.output as PromptOutput)
      : undefined;
  const planLearningPanel =
    output?.renderer === "plan"
      ? buildPlanLearningPanel(result, output.output as PlanOutput)
      : undefined;
  const reviewLearningPanel =
    output?.renderer === "review-report"
      ? buildReviewReportLearningPanel(result, output.output as ReviewReportOutput)
      : undefined;
  const architectureLearningPanel =
    output?.renderer === "architecture"
      ? buildArchitectureLearningPanel(result, output.output as ArchitectureOutput)
      : undefined;
  const beforeBuildKnowledgePanel =
    output?.renderer === "plan" || output?.renderer === "architecture"
      ? buildBeforeBuildKnowledgePanel(result)
      : undefined;
  const [copyLabel, setCopyLabel] = useState("복사");
  const [followUp, setFollowUp] = useState<Stage1FollowUpResult | undefined>();
  const [followUpError, setFollowUpError] = useState<string | undefined>();
  const [reviewRefinementAnswers, setReviewRefinementAnswers] = useState<string[]>(
    [],
  );
  const [isReviewRefining, setIsReviewRefining] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<
    Stage1ActionId | undefined
  >();
  const stage1Actions = useMemo(
    () => (followUp ? [] : listVisibleStage1Actions(result)),
    [followUp, result],
  );

  useEffect(() => {
    setCopyLabel("복사");
    setFollowUp(undefined);
    setFollowUpError(undefined);
    setReviewRefinementAnswers([]);
    setIsReviewRefining(false);
    setPendingActionId(undefined);
  }, [result]);

  useEffect(() => {
    setReviewRefinementAnswers(
      followUp?.action_id === "revise-from-review"
        ? followUp.remaining_questions.map(() => "")
        : [],
    );
    setIsReviewRefining(false);
  }, [followUp]);

  useEffect(() => {
    if (!promptLearningPanel || output?.renderer !== "prompt") {
      return;
    }

    trackProductEvent("prompt_help_learning_panel_shown", "result", {
      always_visible_technique_count: promptLearningPanel.techniques.length,
      conditional_technique_count: promptLearningPanel.conditionalTechniques.length,
      renderer: "prompt",
      run_id: runId,
      summary_item_count: promptLearningPanel.summaryItems.length,
    });
  }, [output?.renderer, promptLearningPanel, runId]);

  if (!output) {
    return null;
  }

  async function handleCopyPrompt() {
    if (output.renderer !== "prompt") {
      return;
    }

    try {
      await navigator.clipboard.writeText((output.output as PromptOutput).prompt);
      trackProductEvent("prompt_help_copy_clicked", "result", {
        renderer: "prompt",
        run_id: runId,
      });
      setCopyLabel("복사됨");
      window.setTimeout(() => setCopyLabel("복사"), 1600);
    } catch {
      setCopyLabel("복사 실패");
      window.setTimeout(() => setCopyLabel("복사"), 1600);
    }
  }

  async function handleFollowUpAction(actionId: Stage1ActionId) {
    const request = buildStage1FollowUpRequest(result, actionId);
    const followUpRunId = createTelemetryRunId();

    if (!request) {
      setFollowUpError("지금 결과에서는 이 후속 작업을 실행할 수 없어요.");
      return;
    }

    setFollowUpError(undefined);
    setPendingActionId(actionId);
    trackProductEvent("followup_action_clicked", "followup", {
      action_id: actionId,
      run_id: followUpRunId,
      source_renderer: output.renderer,
      source_run_id: runId,
    });
    trackProductEvent("followup_request_started", "followup", {
      action_id: actionId,
      run_id: followUpRunId,
      source_renderer: output.renderer,
      source_run_id: runId,
    });

    try {
      const nextResult = await runStage1FollowUp(request, runtime);
      trackProductEvent("followup_request_completed", "followup", {
        action_id: actionId,
        result_kind: nextResult.result_kind,
        run_id: followUpRunId,
        source_renderer: output.renderer,
        source_run_id: runId,
      });
      setFollowUp(nextResult);
    } catch (error) {
      trackProductEvent("followup_request_failed", "followup", {
        action_id: actionId,
        error_type: "client-followup-error",
        message_preview:
          error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
        run_id: followUpRunId,
        source_renderer: output.renderer,
        source_run_id: runId,
      });
      setFollowUpError(
        formatVisibleErrorMessage(
          error,
          "후속 결과를 만드는 중 문제가 생겼어요.",
        ),
      );
    } finally {
      setPendingActionId(undefined);
    }
  }

  function handleReviewRefinementAnswerChange(index: number, value: string) {
    setReviewRefinementAnswers((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? value : entry)),
    );
  }

  async function handleReviewRefinement() {
    if (!followUp || followUp.action_id !== "revise-from-review") {
      return;
    }

    const answers: Stage1ReviewRefinementAnswer[] = followUp.remaining_questions
      .map((question, index) => ({
        answer: reviewRefinementAnswers[index] ?? "",
        question,
      }))
      .filter((entry) => entry.answer.trim().length > 0);
    const request = buildStage1ReviewRefinementRequest(result, followUp, answers);

    if (!request) {
      setFollowUpError("남은 질문에 대한 답변을 입력한 뒤 다시 시도해 주세요.");
      return;
    }

    setFollowUpError(undefined);
    setIsReviewRefining(true);
    const refinementRunId = createTelemetryRunId();
    trackProductEvent("review_refinement_started", "followup", {
      action_id: followUp.action_id,
      answered_question_count: answers.length,
      remaining_question_count: followUp.remaining_questions.length,
      run_id: refinementRunId,
      source_run_id: runId,
    });

    try {
      const nextResult = await runStage1FollowUp(request, runtime);
      trackProductEvent("review_refinement_completed", "followup", {
        action_id: followUp.action_id,
        answered_question_count: answers.length,
        remaining_question_count: nextResult.remaining_questions.length,
        run_id: refinementRunId,
        source_run_id: runId,
      });
      setFollowUp(nextResult);
    } catch (error) {
      trackProductEvent("review_refinement_failed", "followup", {
        action_id: followUp.action_id,
        answered_question_count: answers.length,
        error_type: "client-review-refinement-error",
        message_preview:
          error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
        run_id: refinementRunId,
        source_run_id: runId,
      });
      setFollowUpError(
        formatVisibleErrorMessage(
          error,
          "답변을 반영해 수정안을 보완하는 중 문제가 생겼어요.",
        ),
      );
    } finally {
      setIsReviewRefining(false);
    }
  }

  return (
    <section className="result-panel">
      <p className="panel-kicker">결과</p>
      <h2>{readOutputTitle(output)}</h2>
      <p className="panel-copy">{renderSummary(output.renderer)}</p>

      <section className="decision-card" aria-label="판단 근거">
        <div className="decision-card-header">
          <p className="panel-kicker">{decisionCard.title}</p>
          <p>이 결과 방향은 현재 입력을 바탕으로 한 추천입니다.</p>
        </div>

        <dl className="decision-card-grid">
          {decisionCard.items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <ul className="decision-reasons">
          {decisionCard.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <div className="result-body">
        {output.renderer === "prompt" ? (
          <>
            <section className="result-section result-section-prompt">
              <div className="result-toolbar">
                <h3>프롬프트</h3>
                <button
                  className="ghost-action copy-action"
                  onClick={() => {
                    void handleCopyPrompt();
                  }}
                  type="button"
                >
                  {copyLabel}
                </button>
              </div>
              <pre className="prompt-block">{(output.output as PromptOutput).prompt}</pre>
            </section>

            {promptLearningPanel ? (
              <LearningPanel
                inactiveLabel="이번 미적용"
                lead="이 프롬프트가 어떻게 더 안정적인 결과를 만들도록 정리됐는지, 대표적인 방법만 짧게 보여드립니다."
                points={promptLearningPanel.techniques}
                summaryItems={promptLearningPanel.summaryItems}
              >
                {promptLearningPanel.conditionalTechniques.length > 0 ? (
                  <div className="learning-conditional">
                    <h3>이번 입력에서 더 중요했던 포인트</h3>
                    <LearningPointGrid
                      inactiveLabel="이번 미적용"
                      points={promptLearningPanel.conditionalTechniques}
                    />
                  </div>
                ) : null}
              </LearningPanel>
            ) : null}
          </>
        ) : null}

        {output.renderer === "plan" ? (
          <>
            {(output.output as PlanOutput).sections.map((section) => (
                <section className="result-section" key={section.title}>
                  <h3>{section.title}</h3>
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </section>
              ))}

            {planLearningPanel ? (
              <LearningPanel
                lead="이 계획이 어떤 사고 순서로 정리됐는지, 다음에 직접 아이디어를 다듬을 때 써먹기 좋은 기준만 짧게 보여드립니다."
                points={planLearningPanel.points}
                summaryItems={planLearningPanel.summaryItems}
              />
            ) : null}

            {beforeBuildKnowledgePanel ? (
              <BeforeBuildKnowledgePanel panel={beforeBuildKnowledgePanel} />
            ) : null}
          </>
        ) : null}

        {output.renderer === "architecture" ? (
          <>
            <section className="result-section">
              <h3>시스템 경계</h3>
              <p>{(output.output as ArchitectureOutput).system_boundary}</p>
            </section>

            <ArchitectureDiagram architecture={output.output as ArchitectureOutput} />

            <section className="result-section">
              <h3>구성 요소</h3>
              <ul>
                {(output.output as ArchitectureOutput).components.map((component) => (
                  <li key={component.name}>
                    <strong>{component.name}</strong>
                    <span>{component.responsibility}</span>
                  </li>
                ))}
              </ul>
            </section>
            {(output.output as ArchitectureOutput).interaction_flows.map((flow) => (
              <section className="result-section" key={flow.name}>
                <h3>{flow.name}</h3>
                <ol>
                  {flow.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}

            {architectureLearningPanel ? (
              <LearningPanel
                lead="이 구조 설계가 어떤 순서로 시스템을 나눠 봤는지, 다음에 직접 아이디어를 설계할 때 쓸 수 있는 관점만 짧게 보여드립니다."
                points={architectureLearningPanel.points}
                summaryItems={architectureLearningPanel.summaryItems}
              />
            ) : null}

            {beforeBuildKnowledgePanel ? (
              <BeforeBuildKnowledgePanel panel={beforeBuildKnowledgePanel} />
            ) : null}
          </>
        ) : null}

        {output.renderer === "review-report" ? (
          <>
            <section className="result-section">
              <h3>판단</h3>
              <p>{formatReviewVerdict((output.output as ReviewReportOutput).verdict)}</p>
            </section>
            {(output.output as ReviewReportOutput).findings.map((finding) => (
              <section className="result-section" key={`${finding.severity}-${finding.title}`}>
                <h3>{`[${formatReviewSeverity(finding.severity)}] ${finding.title}`}</h3>
                <p>{finding.detail}</p>
                <p>{finding.recommendation}</p>
              </section>
            ))}

            {reviewLearningPanel ? (
              <LearningPanel
                lead="이 검토가 어떤 기준으로 문제를 나누고 다음 행동을 만든 것인지, 직접 초안을 점검할 때 쓸 수 있는 관점만 짧게 보여드립니다."
                points={reviewLearningPanel.points}
                summaryItems={reviewLearningPanel.summaryItems}
              />
            ) : null}
          </>
        ) : null}
      </div>

      <section className="result-note-panel" aria-label="결과 상태">
        <p className="panel-kicker">결과 상태</p>
        <ul className="note-list">
          {readOutputNotes(output).map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="input-hints-panel" aria-label="다음 입력 개선 힌트">
        <div className="input-hints-header">
          <p className="panel-kicker">{inputImprovementHints.title}</p>
          <p>{inputImprovementHints.lead}</p>
        </div>

        <div className="input-hints-grid">
          {inputImprovementHints.items.map((item) => (
            <article className="input-hint-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.example}</p>
            </article>
          ))}
        </div>
      </section>

      {stage1Actions.length > 0 ? (
        <section className="follow-up-actions">
          <div className="follow-up-actions-header">
            <p className="panel-kicker">결과 다음 행동</p>
            <p className="follow-up-limit">Stage 1에서는 후속 결과를 1개만 만듭니다.</p>
          </div>

          <div className="follow-up-action-list">
            {stage1Actions.map((action) => {
              const isPending = pendingActionId === action.action_id;

              return (
                <button
                  className="follow-up-action-card"
                  disabled={Boolean(pendingActionId)}
                  key={action.action_id}
                  onClick={() => {
                    void handleFollowUpAction(action.action_id);
                  }}
                  type="button"
                >
                  <strong>{action.user_label}</strong>
                  <span>
                    {isPending ? "후속 결과를 만드는 중..." : action.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {followUpError ? <p className="flow-error">{followUpError}</p> : null}

      {followUp ? (
        <section className="follow-up-result">
          <p className="panel-kicker">후속 결과</p>
          <h3>{followUp.result_title}</h3>
          <p className="follow-up-origin">
            원본 {followUp.source_result_ref.renderer}
            {followUp.source_result_ref.title
              ? ` 결과 "${followUp.source_result_ref.title}" 기준`
              : " 결과 기준"}
          </p>

          <div className="follow-up-result-body">
            <pre className="follow-up-body">{followUp.result_body}</pre>
          </div>

          {followUp.change_summary.length > 0 ? (
            <section className="result-section follow-up-meta">
              <h3>무엇이 달라졌는지</h3>
              <ul>
                {followUp.change_summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {followUp.remaining_questions.length > 0 ? (
            <section className="result-section follow-up-meta">
              <h3>남은 질문 또는 주의점</h3>
              <ul>
                {followUp.remaining_questions.map((item, index) => (
                  <li
                    className={
                      followUp.action_id === "revise-from-review"
                        ? "follow-up-question-item"
                        : undefined
                    }
                    key={item}
                  >
                    <span>{item}</span>
                    {followUp.action_id === "revise-from-review" ? (
                      <textarea
                        className="follow-up-answer-input"
                        onChange={(event) => {
                          handleReviewRefinementAnswerChange(index, event.target.value);
                        }}
                        placeholder="이 질문에 대한 답을 입력하면 수정안에 바로 반영됩니다."
                        rows={3}
                        value={reviewRefinementAnswers[index] ?? ""}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>

              {followUp.action_id === "revise-from-review" ? (
                <button
                  className="primary-action follow-up-refine-action"
                  disabled={
                    isReviewRefining ||
                    !reviewRefinementAnswers.some((entry) => entry.trim().length > 0)
                  }
                  onClick={() => {
                    void handleReviewRefinement();
                  }}
                  type="button"
                >
                  {isReviewRefining
                    ? "답변 반영 중..."
                    : "답변 반영해서 수정안 보완하기"}
                </button>
              ) : null}
            </section>
          ) : null}
        </section>
      ) : null}

      <button
        className="ghost-action"
        onClick={() => {
          trackProductEvent("result_restart_clicked", "result", {
            renderer: output.renderer,
            run_id: runId,
          });
          onReset();
        }}
        type="button"
      >
        새로 시작
      </button>
    </section>
  );
}

type BeforeBuildKnowledgePanelProps = {
  panel: ReturnType<typeof buildBeforeBuildKnowledgePanel>;
};

function BeforeBuildKnowledgePanel({ panel }: BeforeBuildKnowledgePanelProps) {
  return (
    <details className="result-section before-build-panel">
      <summary>만들기 전에 알아두면 좋은 것</summary>

      <div className="before-build-grid">
        <section>
          <h3>필요한 개념</h3>
          <ul>
            {panel.concepts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3>알아두면 좋은 용어</h3>
          <ul>
            {panel.terms.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3>먼저 추천하는 생각</h3>
          <ul>
            {panel.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}

type ArchitectureDiagramProps = {
  architecture: ArchitectureOutput;
  intro?: string;
  title?: string;
};

function ArchitectureDiagram({
  architecture,
  intro = "주요 구성요소와 처리 흐름을 한눈에 볼 수 있게 정리했습니다.",
  title = "구성도와 흐름도",
}: ArchitectureDiagramProps) {
  return (
    <section className="result-section architecture-diagram">
      <div className="architecture-diagram-header">
        <h3>{title}</h3>
        <p>{intro}</p>
      </div>

      <div className="architecture-node-grid" aria-label="아키텍처 구성요소">
        {architecture.components.map((component) => (
          <article className="architecture-node" key={component.name}>
            <strong>{component.name}</strong>
            <ul className="architecture-node-lines">
              {splitArchitectureResponsibility(component.responsibility).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="architecture-flow-list">
        {architecture.interaction_flows.map((flow) => (
          <section className="architecture-flow-chart" key={flow.name}>
            <h4>{flow.name}</h4>
            <ol>
              {flow.steps.map((step, index) => (
                <li key={step}>
                  <span className="architecture-step-index">{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

function splitArchitectureResponsibility(value: string): string[] {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const parts = normalized
    .split(/[,，]\s*|\s+및\s+|\s+그리고\s+|\s+and\s+/iu)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : [normalized];
}

function readOutputTitle(output: EngineResult["outputs"][number]) {
  if (output.renderer === "plan") {
    return (output.output as PlanOutput).title;
  }

  if (output.renderer === "architecture") {
    return (output.output as ArchitectureOutput).title;
  }

  if (output.renderer === "review-report") {
    return (output.output as ReviewReportOutput).title;
  }

  return (output.output as PromptOutput).title;
}

function readOutputNotes(output: EngineResult["outputs"][number]) {
  const notes =
    output.renderer === "plan"
      ? (output.output as PlanOutput).notes
      : output.renderer === "architecture"
        ? (output.output as ArchitectureOutput).notes
        : output.renderer === "review-report"
          ? (output.output as ReviewReportOutput).notes
          : (output.output as PromptOutput).notes;

  return notes
    .map(formatVisibleNote)
    .filter((note): note is string => Boolean(note));
}

function formatVisibleNote(note: string): string | undefined {
  const normalized = note.trim();

  if (!normalized || normalized.startsWith("Fallback:")) {
    return undefined;
  }

  const [rawLabel, ...rest] = normalized.split(":");
  const value = rest.join(":").trim();

  switch (rawLabel.trim()) {
    case "Mode":
      return `요청 유형: ${formatMode(value)}`;
    case "Confidence":
      return `확실도: ${formatConfidence(value)}`;
    case "Summary":
      return `AI가 이해한 방향: ${formatSummary(value)}`;
    case "Recommended renderer":
      return `추천 결과 유형: ${formatOutputKind(value)}`;
    case "Technique":
      return `프롬프트 구성 방식: ${formatPromptTechnique(value)}`;
    case "Risk note":
      return `주의할 점: ${formatSummary(value)}`;
    case "Artifact kind":
      return `검토 대상 유형: ${formatArtifactKind(value.replace(/\.$/, ""))}`;
    case "Finding profile":
      return `발견 항목: ${formatFindingProfile(value)}`;
    case "Strength snapshot":
      return `강점 요약: ${formatStrengthSnapshot(value)}`;
    case "Coverage snapshot":
      return `검토 범위: ${formatCoverageSnapshot(value)}`;
    case "Coverage gaps":
      return `비어 있는 부분: ${formatListLikeText(value)}`;
    case "Next best move":
      return `다음 우선 작업: ${formatNextBestMove(value)}`;
    case "Review focus":
      return `검토 초점: ${formatReviewFocus(value)}`;
    case "Artifact excerpt":
      return `검토 원문 일부: ${value}`;
    case "Artifact size":
      return `검토 분량: ${value.replace(/\btokens?\b\.?/i, "토큰")}`;
    default:
      return normalized;
  }
}

function formatMode(value: string): string {
  switch (value) {
    case "create":
      return "새 결과를 만드는 요청으로 봤습니다.";
    case "review":
      return "기존 내용을 점검하는 요청으로 봤습니다.";
    default:
      return value || "알 수 없음";
  }
}

function formatConfidence(value: string): string {
  switch (value) {
    case "low":
      return "아직 확인할 정보가 더 있으면 좋습니다.";
    case "medium":
      return "대체 방향은 잡혔지만 더 다듬을 여지가 있습니다.";
    case "high":
      return "요청 방향이 비교적 분명합니다.";
    default:
      return value || "알 수 없음";
  }
}

function formatSummary(value: string): string {
  const normalized = value.trim().replace(/\.$/, "");

  switch (normalized) {
    case "Define the system structure before implementation":
      return "구현 전에 시스템 구조를 먼저 정리합니다.";
    case "Review an existing artifact and surface issues or missing points":
      return "기존 초안을 검토하고 문제나 빠진 부분을 드러냅니다.";
    case "Structure the idea into a clearer product plan":
      return "아이디어를 더 선명한 제품 기획으로 구조화합니다.";
    case "High-impact output should be confirmed before final rendering":
      return "영향도가 큰 결과는 최종 생성 전에 확인이 필요합니다.";
    default:
      return value;
  }
}

function formatOutputKind(value: string): string {
  switch (value) {
    case "directly usable prompt or wording":
      return "바로 쓸 수 있는 프롬프트 또는 문구";
    case "structured planning summary":
      return "구조화된 기획 정리";
    case "service or system structure":
      return "서비스 또는 시스템 구조";
    case "evaluation and improvement report":
      return "평가와 개선 리포트";
    default:
      return value;
  }
}

function formatPromptTechnique(value: string): string {
  switch (value) {
    case "few-shot or pattern-anchored prompt":
      return "예시나 패턴을 기준으로 잡는 프롬프트";
    case "zero-shot structured prompt":
      return "예시 없이 구조를 먼저 잡는 프롬프트";
    default:
      return value;
  }
}

function formatArtifactKind(value: string): string {
  switch (value) {
    case "prompt":
      return "프롬프트";
    case "product-copy":
      return "제품 문구";
    case "plan":
      return "기획 초안";
    case "architecture":
      return "구조 설계";
    default:
      return value || "초안";
  }
}

function formatReviewVerdict(
  value: ReviewReportOutput["verdict"],
): string {
  switch (value) {
    case "needs-revision":
      return "수정이 필요합니다.";
    case "usable-with-fixes":
      return "보완하면 사용할 수 있습니다.";
    default:
      return value;
  }
}

function formatReviewSeverity(value: string): string {
  switch (value) {
    case "high":
      return "높음";
    case "medium":
      return "보통";
    case "low":
      return "낮음";
    default:
      return value;
  }
}

function formatFindingProfile(value: string): string {
  return value
    .replace(/(\d+)\s+high/i, "높음 $1개")
    .replace(/(\d+)\s+medium/i, "보통 $1개")
    .replace(/(\d+)\s+low/i, "낮음 $1개")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\.$/, "");
}

function formatStrengthSnapshot(value: string): string {
  if (/no strong anchors yet/i.test(value)) {
    return "아직 강하게 잡힌 근거가 없습니다.";
  }

  return formatListLikeText(value.replace(/^explicit\s+/i, ""));
}

function formatCoverageSnapshot(value: string): string {
  return formatListLikeText(value.replace(/^explicit\s+/i, ""));
}

function formatListLikeText(value: string): string {
  return value.replace(/\.$/, "").trim();
}

function formatNextBestMove(value: string): string {
  if (/keep the current direction/i.test(value)) {
    return "현재 방향을 유지하고 마지막으로 더 다듬습니다.";
  }

  return value.replace(/^address\s+/i, "먼저 보완: ").replace(/\.$/, "");
}

function formatReviewFocus(value: string): string {
  switch (value.replace(/\.$/, "")) {
    case "instruction clarity, task framing, input context, and explicit output constraints":
      return "지시 명확성, 작업 framing, 입력 맥락, 출력 제약";
    case "audience fit, value clarity, usage context, and overclaim control":
      return "대상 적합성, 가치 명확성, 사용 맥락, 과장 통제";
    case "scope clarity, target user, success criteria, and non-goal discipline":
      return "범위 명확성, 핵심 사용자, 성공 기준, 제외 범위";
    case "boundary clarity, component responsibility, interaction flow, and design tradeoffs":
      return "경계 명확성, 구성요소 책임, 상호작용 흐름, 설계 trade-off";
    case "clarity, audience fit, completeness, and explicit constraints":
      return "명확성, 대상 적합성, 완성도, 명시적 제약";
    default:
      return value;
  }
}

function renderSummary(renderer: EngineResult["provisional_renderer"]) {
  switch (renderer) {
    case "plan":
      return "문제, 대상, 방향이 보이도록 정리한 기획 결과입니다.";
    case "architecture":
      return "경계, 구성 요소, 흐름이 보이도록 정리한 구조 설계 결과입니다.";
    case "review-report":
      return "문제점과 보완 포인트가 먼저 보이도록 정리한 검토 결과입니다.";
    case "prompt":
    default:
      return "다른 AI에 바로 붙여 넣을 수 있는 실행형 프롬프트입니다.";
  }
}
