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
import { buildPromptHelpLearningPanel } from "../../../lib/ux/promptHelpLearning";

type ResultPanelProps = {
  onReset: () => void;
  result: EngineResult;
  runId?: string;
  runtime: ProviderRuntimeConfig | undefined;
};

export function ResultPanel({ onReset, result, runId, runtime }: ResultPanelProps) {
  const output = result.outputs[0];
  const promptLearningPanel =
    output?.renderer === "prompt"
      ? buildPromptHelpLearningPanel(result, output.output as PromptOutput)
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
        error instanceof Error
          ? error.message
          : "후속 결과를 만드는 중 문제가 생겼어요.",
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
        error instanceof Error
          ? error.message
          : "답변을 반영해 수정안을 보완하는 중 문제가 생겼어요.",
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
              <section className="result-section prompt-learning-panel">
                <p className="panel-kicker">이번에 같이 볼 포인트</p>
                <p className="prompt-learning-lead">
                  이 프롬프트가 어떻게 더 안정적인 결과를 만들도록 정리됐는지,
                  대표적인 방법만 짧게 보여드립니다.
                </p>

                {promptLearningPanel.summaryItems.length > 0 ? (
                  <ul className="prompt-learning-summary">
                    {promptLearningPanel.summaryItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="prompt-learning-grid">
                  {promptLearningPanel.techniques.map((technique) => (
                    <article className="prompt-learning-card" key={technique.label}>
                      <div className="prompt-learning-card-header">
                        <h3>{technique.label}</h3>
                        <span
                          className={`prompt-learning-badge${technique.applied ? " is-applied" : ""}`}
                        >
                          {technique.applied ? "이번 적용" : "이번 미적용"}
                        </span>
                      </div>
                      <p>
                        <strong>언제 쓰나</strong>
                        <span>{technique.whenToUse}</span>
                      </p>
                      <p>
                        <strong>왜 중요했나</strong>
                        <span>{technique.reason}</span>
                      </p>
                    </article>
                  ))}
                </div>

                {promptLearningPanel.conditionalTechniques.length > 0 ? (
                  <div className="prompt-learning-conditional">
                    <h3>이번 입력에서 더 중요했던 포인트</h3>
                    <div className="prompt-learning-grid">
                      {promptLearningPanel.conditionalTechniques.map((technique) => (
                        <article className="prompt-learning-card" key={technique.label}>
                          <div className="prompt-learning-card-header">
                            <h4>{technique.label}</h4>
                            <span className="prompt-learning-badge is-applied">이번 적용</span>
                          </div>
                          <p>
                            <strong>언제 쓰나</strong>
                            <span>{technique.whenToUse}</span>
                          </p>
                          <p>
                            <strong>왜 중요했나</strong>
                            <span>{technique.reason}</span>
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}

        {output.renderer === "plan"
          ? (output.output as PlanOutput).sections.map((section) => (
              <section className="result-section" key={section.title}>
                <h3>{section.title}</h3>
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>
            ))
          : null}

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
          </>
        ) : null}

        {output.renderer === "review-report" ? (
          <>
            <section className="result-section">
              <h3>판단</h3>
              <p>{(output.output as ReviewReportOutput).verdict}</p>
            </section>
            {(output.output as ReviewReportOutput).findings.map((finding) => (
              <section className="result-section" key={`${finding.severity}-${finding.title}`}>
                <h3>{`[${finding.severity}] ${finding.title}`}</h3>
                <p>{finding.detail}</p>
                <p>{finding.recommendation}</p>
              </section>
            ))}
          </>
        ) : null}
      </div>

      <ul className="note-list">
        {readOutputNotes(output).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

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

          {followUp.result_kind === "expanded-architecture" &&
          output.renderer === "architecture" ? (
            <ArchitectureDiagram
              architecture={output.output as ArchitectureOutput}
              intro="원본 구조를 기준으로 후속 결과가 더 자세히 풀어쓴 흐름입니다."
              title="후속 흐름도"
            />
          ) : null}

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
            <span>{component.responsibility}</span>
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
  if (output.renderer === "plan") {
    return (output.output as PlanOutput).notes;
  }

  if (output.renderer === "architecture") {
    return (output.output as ArchitectureOutput).notes;
  }

  if (output.renderer === "review-report") {
    return (output.output as ReviewReportOutput).notes;
  }

  return (output.output as PromptOutput).notes;
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
