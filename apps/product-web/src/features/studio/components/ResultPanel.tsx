import { useEffect, useMemo, useRef, useState } from "react";

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
  formatRendererLabel,
} from "../../../lib/ux/formatSignalCopy";
import { buildPlanLearningPanel } from "../../../lib/ux/planLearning";
import { buildPromptHelpLearningPanel } from "../../../lib/ux/promptHelpLearning";
import { buildReviewReportLearningPanel } from "../../../lib/ux/reviewReportLearning";
import { LearningPanel } from "./LearningPanel";

const CODING_TOOL_COPY_REVIEW_STORAGE_KEY =
  "vibe-studio:coding-tool-copy-review-seen";

type ResultPanelProps = {
  isBusy: boolean;
  onReset: () => void;
  onUseInputHint: (hint: { text: string; title: string }) => void;
  result: EngineResult;
  runId?: string;
  runtime: ProviderRuntimeConfig | undefined;
};

export function ResultPanel({
  isBusy,
  onReset,
  onUseInputHint,
  result,
  runId,
  runtime,
}: ResultPanelProps) {
  const output = result.outputs[0];
  const inputHintsPanelRef = useRef<HTMLElement | null>(null);
  const decisionCard = buildDecisionCardCopy(result);
  const inputImprovementHints = buildInputImprovementHints(result);
  const intentContext = buildIntentContextSummary(result);
  const appliedInputHint = readAppliedInputHint(result);
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
  const [codingToolCopyLabel, setCodingToolCopyLabel] = useState(
    "AI 코딩툴에 넣을 내용 복사",
  );
  const [copyReviewPromptVisible, setCopyReviewPromptVisible] = useState(false);
  const [hasSeenCopyReviewPrompt, setHasSeenCopyReviewPrompt] = useState(
    () => window.sessionStorage.getItem(CODING_TOOL_COPY_REVIEW_STORAGE_KEY) === "true",
  );
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
    () =>
      followUp
        ? []
        : listVisibleStage1Actions(result).filter(
            (action) => action.action_id !== "expand-plan-detail",
          ),
    [followUp, result],
  );

  useEffect(() => {
    setCopyLabel("복사");
    setCodingToolCopyLabel("AI 코딩툴에 넣을 내용 복사");
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

  async function handleCopyCodingToolPayload() {
    if (output.renderer !== "plan") {
      return;
    }

    if (!hasSeenCopyReviewPrompt) {
      setCopyReviewPromptVisible(true);
      return;
    }

    await copyCodingToolPayload();
  }

  async function copyCodingToolPayload() {
    if (output.renderer !== "plan") {
      return;
    }

    try {
      await copyTextToClipboard(
        buildCodingToolPayloadText(
          result,
          output.output as PlanOutput,
          appliedInputHint,
        ),
      );
      trackProductEvent("coding_tool_payload_copy_clicked", "result", {
        renderer: "plan",
        run_id: runId,
      });
      setCodingToolCopyLabel("복사됨");
      window.setTimeout(
        () => setCodingToolCopyLabel("AI 코딩툴에 넣을 내용 복사"),
        1600,
      );
    } catch {
      setCodingToolCopyLabel("복사 실패");
      window.setTimeout(
        () => setCodingToolCopyLabel("AI 코딩툴에 넣을 내용 복사"),
        1600,
      );
    }
  }

  function markCopyReviewPromptSeen() {
    setHasSeenCopyReviewPrompt(true);
    window.sessionStorage.setItem(CODING_TOOL_COPY_REVIEW_STORAGE_KEY, "true");
  }

  function handleReviewBeforeCopy() {
    markCopyReviewPromptSeen();
    setCopyReviewPromptVisible(false);
    window.setTimeout(() => {
      inputHintsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function handleCopyWithoutReview() {
    markCopyReviewPromptSeen();
    setCopyReviewPromptVisible(false);
    await copyCodingToolPayload();
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

      <section className="intent-context-panel" aria-label="요청 이해와 작업 방향">
        <div className="intent-context-header">
          <p className="panel-kicker">먼저 이렇게 이해했어요</p>
          <p>
            바로 결과만 만든 것이 아니라, 지금 입력이 어떤 작업에 가까운지 먼저
            정리했습니다.
          </p>
        </div>

        <div className="intent-context-grid">
          {intentContext.items.map((item) => (
            <article className="intent-context-item" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {appliedInputHint ? (
        <section className="applied-hint-panel" aria-label="힌트 적용 후 바뀐 점">
          <div className="applied-hint-header">
            <p className="panel-kicker">힌트 적용 후 바뀐 점</p>
            <h3>{appliedInputHint.title}</h3>
          </div>
          <p>이번 결과는 이전 입력에 아래 문장을 덧붙여 다시 정리한 버전입니다.</p>
          <blockquote>{appliedInputHint.text}</blockquote>
          <ul className="applied-hint-list">
            {buildAppliedHintEffects(appliedInputHint.title).map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        </section>
      ) : null}

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

            <PromptTransformationPanel
              output={output.output as PromptOutput}
              result={result}
            />
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

            <section className="coding-tool-panel" aria-label="AI 코딩툴 복사용 내용">
              <div className="coding-tool-header">
                <div>
                  <p className="panel-kicker">필요할 때만 넘기기</p>
                  <h3>AI 코딩툴에 넣을 내용</h3>
                </div>
                <button
                  className="ghost-action copy-action"
                  disabled={isBusy}
                  onClick={() => {
                    void handleCopyCodingToolPayload();
                  }}
                  type="button"
                >
                  {isBusy ? "정리 중..." : codingToolCopyLabel}
                </button>
              </div>
              <p>
                위 기획을 먼저 읽고 나서, 실제 구현 대화를 시작할 때만 목표,
                범위, 제외할 것, 확인 기준을 정해진 JSON 구조로 묶어 복사합니다.
                힌트로 다시 정리하면 이 내용도 최신 결과 기준으로 바뀝니다.
              </p>
            </section>
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

      {output.renderer !== "prompt" ? (
        <section
          className="input-hints-panel"
          ref={inputHintsPanelRef}
          aria-label="다음 입력 개선 힌트"
        >
          <div className="input-hints-header">
            <p className="panel-kicker">{inputImprovementHints.title}</p>
            <p>{inputImprovementHints.lead}</p>
          </div>

          <div className="input-hints-grid">
            {inputImprovementHints.items.map((item) => (
              <article className="input-hint-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.example}</p>
                <button
                  className="text-action input-hint-action"
                  disabled={isBusy}
                  onClick={() =>
                    onUseInputHint({
                      text: item.example,
                      title: item.title,
                    })
                  }
                  type="button"
                >
                  {isBusy ? "정리 중..." : "이 문장 덧붙여 다시 정리"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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

          <FollowUpBody followUp={followUp} />

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

      {copyReviewPromptVisible ? (
        <div className="copy-review-overlay" role="presentation">
          <section
            aria-labelledby="copy-review-title"
            aria-modal="true"
            className="copy-review-dialog"
            role="dialog"
          >
            <p className="panel-kicker">복사하기 전 확인</p>
            <h3 id="copy-review-title">AI 코딩툴에 넣기 전에 잠깐만 확인해볼까요?</h3>
            <p>
              이 내용은 바로 붙여넣을 수 있지만, 아래 결과와 힌트를 한 번 훑어보면
              코딩 에이전트가 무엇을 만들지 더 잘 이해할 수 있습니다.
            </p>
            <div className="copy-review-actions">
              <button
                className="primary-action"
                onClick={handleReviewBeforeCopy}
                type="button"
              >
                내용 보고 복사하기
              </button>
              <button
                className="ghost-action"
                onClick={() => {
                  void handleCopyWithoutReview();
                }}
                type="button"
              >
                바로 복사하기
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

type BeforeBuildKnowledgePanelProps = {
  panel: ReturnType<typeof buildBeforeBuildKnowledgePanel>;
};

type PromptTransformationPanelProps = {
  output: PromptOutput;
  result: EngineResult;
};

function PromptTransformationPanel({
  output,
  result,
}: PromptTransformationPanelProps) {
  const sourceText = result.source.text.trim();
  const sections = readPromptSections(output.prompt);
  const addedParts = buildPromptAddedParts(sections);
  const reusablePhrases = buildReusablePromptPhrases(result, output);
  const editableParts = buildEditablePromptParts(sections);

  return (
    <section className="result-section prompt-transform-panel">
      <p className="panel-kicker">내 말이 이렇게 바뀌었어요</p>
      <div className="prompt-transform-grid">
        <article>
          <h3>처음 입력</h3>
          <p>{sourceText}</p>
        </article>
        <article>
          <h3>프롬프트에 추가된 것</h3>
          <ul>
            {addedParts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="prompt-transform-section">
        <h3>다음에 직접 붙여볼 문장</h3>
        <ul className="prompt-phrase-list">
          {reusablePhrases.map((phrase) => (
            <li key={phrase}>{phrase}</li>
          ))}
        </ul>
      </div>

      <div className="prompt-transform-section">
        <h3>바꿔도 되는 부분</h3>
        <ul>
          {editableParts.map((part) => (
            <li key={part}>{part}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

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

type FollowUpBodyProps = {
  followUp: Stage1FollowUpResult;
};

function FollowUpBody({ followUp }: FollowUpBodyProps) {
  const [codingPromptCopyLabel, setCodingPromptCopyLabel] =
    useState("설계 프롬프트 복사");

  if (
    followUp.action_id === "expand-architecture-detail" &&
    followUp.result_kind === "expanded-architecture"
  ) {
    const codingPrompt = buildArchitectureCodingPrompt(followUp);

    async function handleCopyCodingPrompt() {
      try {
        await copyTextToClipboard(codingPrompt);
        setCodingPromptCopyLabel("복사됨");
        window.setTimeout(
          () => setCodingPromptCopyLabel("설계 프롬프트 복사"),
          1600,
        );
      } catch {
        setCodingPromptCopyLabel("복사 실패");
        window.setTimeout(
          () => setCodingPromptCopyLabel("설계 프롬프트 복사"),
          1600,
        );
      }
    }

    return (
      <div className="follow-up-result-body">
        <ArchitectureFollowUpVisual resultBody={followUp.result_body} />

        <section className="follow-up-coding-prompt">
          <div>
            <h4>바이브 코딩용 설계 프롬프트</h4>
            <p>
              세부 설계를 바로 코드로 밀어 넣기보다, 구현 계획과 파일 구조를 먼저
              잡도록 정리한 복사용 프롬프트입니다.
            </p>
          </div>

          <button
            className="ghost-action follow-up-copy-action"
            onClick={() => {
              void handleCopyCodingPrompt();
            }}
            type="button"
          >
            {codingPromptCopyLabel}
          </button>
        </section>

        <details className="follow-up-raw-detail">
          <summary>세부 텍스트 전체 보기</summary>
          <pre className="follow-up-body">{followUp.result_body}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="follow-up-result-body">
      <pre className="follow-up-body">{followUp.result_body}</pre>
    </div>
  );
}

async function copyTextToClipboard(text: string): Promise<void> {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");

    if (copied) {
      return;
    }
  } finally {
    document.body.removeChild(textarea);
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some local browser contexts block the async clipboard API.
    }
  }

  throw new Error("copy command failed");
}

function readPromptSections(prompt: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const pattern = /^\[(.+?)\]\s*$/gm;
  const matches = [...prompt.matchAll(pattern)];

  matches.forEach((match, index) => {
    const title = match[1]?.trim();
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index ?? prompt.length
        : prompt.length;

    if (title) {
      sections[title] = prompt.slice(start, end).trim();
    }
  });

  return sections;
}

function buildPromptAddedParts(sections: Record<string, string>): string[] {
  const items = [
    sections["목표"] ? "목표: 무엇을 만들어야 하는지 한 줄로 분리했습니다." : undefined,
    sections["참고 맥락"] ? "맥락: 대상, 상황, 피하고 싶은 조건을 따로 묶었습니다." : undefined,
    sections["작업"] ? "작업: AI가 해야 할 일을 단계와 원칙으로 나눴습니다." : undefined,
    sections["출력 형식"] ? "형식: 결과가 흔들리지 않도록 보여줄 모양을 정했습니다." : undefined,
  ].filter(Boolean) as string[];

  return items.length > 0
    ? items
    : ["AI가 바로 실행할 수 있도록 목표, 맥락, 작업, 출력 형식으로 나눴습니다."];
}

function buildReusablePromptPhrases(
  result: EngineResult,
  output: PromptOutput,
): string[] {
  const sourceText = result.source.text.trim();
  const audience = inferPromptAudience(sourceText);
  const avoidStyle = inferAvoidStyle(sourceText);
  const resultCount = inferResultCount(sourceText);
  const outputShape = inferOutputShape(sourceText) ?? (resultCount ? "목록" : undefined);
  const phrases = [
    audience ? `대상은 ${appendParticle(audience, "으로", "로")} 잡아줘.` : "대상은 ... 로 잡아줘.",
    avoidStyle ? `${appendParticle(avoidStyle, "은", "는")} 피하고 싶어.` : "피하고 싶은 스타일은 ... 이야.",
    resultCount ? `결과는 ${resultCount}개로 보여줘.` : "결과는 ...개로 보여줘.",
    outputShape ? `출력 형식은 ${outputShape} 형태로 해줘.` : "출력 형식은 목록/표/단계 중 ... 로 해줘.",
  ];

  if (result.ambiguity_score > 0 || output.prompt.includes("확인해야 할 정보")) {
    phrases.push("부족한 정보가 있으면 먼저 질문으로 분리해줘.");
  }

  return phrases;
}

function inferPromptAudience(sourceText: string): string | undefined {
  const patterns = [
    /(?:상황|맥락|대상)\s*[:：]?\s*([가-힣A-Za-z0-9\s]{1,24}?)(?:을|를)\s*대상으로/u,
    /([가-힣A-Za-z0-9\s]{1,24}?)(?:을|를)\s*대상으로/u,
    /대상(?:은|:)?\s*([가-힣A-Za-z0-9\s]+?)(?:이고|이야|입니다|,|\.|$)/u,
    /(초보자|입문자|신입\s*[가-힣A-Za-z]*|학생|고객|사용자)/u,
  ];

  return readFirstMatch(sourceText, patterns);
}

function inferAvoidStyle(sourceText: string): string | undefined {
  const patterns = [
    /너무\s*([가-힣A-Za-z0-9\s]+?)(?:은|는)?\s*피하고 싶어/u,
    /([가-힣A-Za-z0-9\s]{1,24}?)(?:은|는)?\s*(?:피하고 싶어|피하고 싶다|피해줘|피하기)/u,
    /(?:피하고 싶은 스타일|피할 것)\s*[:：]?\s*([가-힣A-Za-z0-9\s]+?)(?:\.|,|$)/u,
  ];

  return readFirstMatch(sourceText, patterns);
}

function inferResultCount(sourceText: string): string | undefined {
  return sourceText.match(/(\d+)\s*개/u)?.[1];
}

function inferOutputShape(sourceText: string): string | undefined {
  if (/표|비교/u.test(sourceText)) {
    return "비교표";
  }

  if (/체크리스트/u.test(sourceText)) {
    return "체크리스트";
  }

  if (/계획|단계|순서/u.test(sourceText)) {
    return "단계별 목록";
  }

  if (/요약|줄/u.test(sourceText)) {
    return "짧은 목록";
  }

  return undefined;
}

function readFirstMatch(sourceText: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const matched = sourceText.match(pattern)?.[1]?.trim();

    if (matched) {
      return matched.replace(/\s+/g, " ");
    }
  }

  return undefined;
}

function appendParticle(value: string, consonantParticle: string, vowelParticle: string): string {
  const trimmed = value.trim();
  const lastChar = trimmed.at(-1);

  if (!lastChar) {
    return trimmed;
  }

  const code = lastChar.charCodeAt(0);
  const hangulStart = 0xac00;
  const hangulEnd = 0xd7a3;

  if (code < hangulStart || code > hangulEnd) {
    return `${trimmed}${vowelParticle}`;
  }

  const finalConsonantIndex = (code - hangulStart) % 28;

  if (consonantParticle === "으로" && finalConsonantIndex === 8) {
    return `${trimmed}${vowelParticle}`;
  }

  return `${trimmed}${finalConsonantIndex > 0 ? consonantParticle : vowelParticle}`;
}

function buildEditablePromptParts(sections: Record<string, string>): string[] {
  return [
    sections["목표"] ? "목표 문장의 숫자, 주제, 결과 개수는 바꿔도 됩니다." : undefined,
    sections["참고 맥락"] ? "참고 맥락의 대상, 상황, 금지하고 싶은 스타일은 내 상황에 맞게 바꿔도 됩니다." : undefined,
    sections["출력 형식"] ? "출력 형식은 목록, 표, 단계처럼 원하는 모양으로 바꿔도 됩니다." : undefined,
    "역할 문장은 원하는 AI의 태도나 전문성에 맞게 바꿔도 됩니다.",
  ].filter(Boolean) as string[];
}

function cleanPromptSection(value: string): string {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function buildCodingToolPayloadText(
  result: EngineResult,
  plan: PlanOutput,
  appliedInputHint:
    | {
        text: string;
        title: string;
      }
    | undefined,
): string {
  const sections = mapPlanSections(plan);
  const payload = {
    schema_version: "vibe_studio.plan_to_coding_tool.v1",
    goal: readFirstSectionText(sections, ["아이디어 요약"], result.source.text),
    target_user: readSectionState(sections, ["핵심 사용자"]),
    problem: readSectionState(sections, ["해결하려는 문제"]),
    context: readSectionState(sections, ["맥락"]),
    mvp_scope: readSectionItems(sections, ["초기 방향"]),
    excluded_scope: [
      "요청에 없는 로그인, 결제, 배포, 관리자 기능, 복잡한 백엔드 저장소를 임의로 추가하지 않는다.",
      "실제 금융 거래, 자동매매, 투자 자문처럼 위험하거나 규제 검토가 필요한 기능은 첫 버전에서 제외한다.",
      "수익률 보장, 투자 추천 확정 표현, 실시간 주문 실행은 포함하지 않는다.",
    ],
    screens_or_flows: inferCodingFlows(sections),
    data_needed: inferDataNeeded(sections),
    implementation_tasks: buildImplementationTasks(sections),
    acceptance_criteria: buildAcceptanceCriteria(sections),
    constraints: [
      "먼저 로컬에서 동작하는 작은 MVP를 만든다.",
      "작업을 마치면 로컬 실행 방법과 사용자가 직접 확인할 수 있는 수동 테스트 절차를 제공한다.",
      "입력, 목록 확인, 수정 가능한 기본 흐름을 우선한다.",
      "단일 index 또는 app 파일에 모든 로직을 몰아넣지 말고, 화면, 상태, 데이터, 유틸 로직을 최소한의 파일로 분리한다.",
      "불확실한 요구사항은 임의로 확장하지 말고 TODO 또는 질문으로 남긴다.",
      "사용자가 'ㅇㅇ', 'ㄱㄱ', '좋아', '그걸로', '진행'처럼 짧게 승인하면 범위를 넓히지 말고 안전한 최소 버전으로 진행한다.",
      "비어 있거나 미확정인 항목은 먼저 안전한 구현 제안을 보여주고, 이어서 사용자가 생각해둔 내용이 있는지 질문한다.",
      "전문 용어만 쓰지 말고, 비전공자와 비개발자도 이해하기 쉬운 일상의 비유를 들어 다음 구현 흐름을 설명한다.",
      "금융, 의료, 법률처럼 위험도가 높은 주제가 포함되면 실제 조언, 자동 실행, 의사결정 대행, 결과 보장 기능은 만들지 않는다.",
    ],
    open_questions: readSectionItems(sections, ["열린 질문"]),
    needs_user_decision: buildNeedsUserDecision(sections),
    source_input: result.source.text,
    applied_hint: appliedInputHint
      ? {
          text: appliedInputHint.text,
          title: appliedInputHint.title,
        }
      : null,
    coding_agent_instruction:
      "이 JSON을 기준으로 MVP를 구현하세요. 범위를 벗어나는 기능은 만들지 말고, 먼저 실행 가능한 작은 프로토타입과 확인 방법을 제공하세요.",
    final_instruction:
      "에이전트는 사용자에게 이 JSON을 바이브 코딩 툴에서 어떻게 활용하면 되는지 비전공자도 이해할 수 있는 일상의 비유를 들어 먼저 짧게 설명하세요. needs_user_decision 항목이 있으면 각 항목마다 1. 안전하게 구현되도록 하는 기본 제안, 2. 혹시 사용자가 생각해둔 내용이 있는지 묻는 질문을 함께 제시하세요. 사용자가 짧게 동의하면 안전한 최소 범위 MVP로 해석하고, 범위를 임의로 넓히지 않은 채 구현을 진행해주기를 바랍니다.",
  };

  return JSON.stringify(payload, null, 2);
}

function mapPlanSections(plan: PlanOutput): Record<string, string[]> {
  return Object.fromEntries(
    plan.sections.map((section) => [
      section.title,
      section.bullets.map((bullet) => bullet.trim()).filter(Boolean),
    ]),
  );
}

function readFirstSectionText(
  sections: Record<string, string[]>,
  titles: string[],
  fallback: string,
): string {
  return readSectionItems(sections, titles)[0] ?? fallback.trim();
}

function readSectionState(
  sections: Record<string, string[]>,
  titles: string[],
): {
  items: string[];
  status: "ready" | "needs_detail";
} {
  const items = readSectionItems(sections, titles);
  const needsDetail = items.length === 0 || items.some(isNeedsDetailText);

  return {
    items,
    status: needsDetail ? "needs_detail" : "ready",
  };
}

function readSectionItems(
  sections: Record<string, string[]>,
  titles: string[],
): string[] {
  return titles.flatMap((title) => sections[title] ?? []);
}

function inferCodingFlows(sections: Record<string, string[]>): string[] {
  const problemItems = readActionableItems(sections, ["해결하려는 문제"]);
  const userItems = readActionableItems(sections, ["핵심 사용자"]);
  const scopeItems = readActionableItems(sections, ["초기 방향"]);

  return [
    "사용자가 아이디어나 항목을 입력한다.",
    ...problemItems.slice(0, 1).map((item) => `입력한 내용에서 해결하려는 문제를 확인한다: ${item}`),
    ...userItems.slice(0, 1).map((item) => `핵심 사용자를 기준으로 화면 문구와 흐름을 맞춘다: ${item}`),
    ...scopeItems.slice(0, 2).map((item) => `첫 버전에 필요한 기능으로 나눈다: ${item}`),
    "결과를 목록 또는 요약 화면에서 다시 확인한다.",
  ];
}

function inferDataNeeded(sections: Record<string, string[]>): string[] {
  return [
    "사용자가 입력한 아이디어 또는 항목 설명",
    ...readActionableItems(sections, ["핵심 사용자"]).slice(0, 1),
    ...readActionableItems(sections, ["초기 방향"]).slice(0, 2),
  ];
}

function buildImplementationTasks(sections: Record<string, string[]>): Array<{
  description: string;
  title: string;
}> {
  const scopeItems = readActionableItems(sections, ["초기 방향"]);
  const tasks = scopeItems.length > 0 ? scopeItems : ["기본 입력과 결과 확인 흐름 만들기"];

  return tasks.slice(0, 5).map((item, index) => ({
    description: item,
    title: `작업 ${index + 1}`,
  }));
}

function buildAcceptanceCriteria(sections: Record<string, string[]>): string[] {
  const scopeItems = readActionableItems(sections, ["초기 방향"]);

  return [
    "사용자는 핵심 아이디어를 입력할 수 있다.",
    "입력한 내용은 화면에서 다시 확인할 수 있다.",
    "사용자는 로컬에서 앱을 실행하고 핵심 흐름을 직접 확인할 수 있다.",
    ...scopeItems.slice(0, 3).map((item) => `첫 버전 범위가 화면 또는 동작으로 확인된다: ${item}`),
  ];
}

function buildNeedsUserDecision(sections: Record<string, string[]>): Array<{
  agent_guidance: string;
  field: string;
  reason: string;
}> {
  return [
    ...buildDecisionItems(
      "target_user",
      readSectionItems(sections, ["핵심 사용자"]),
      "1. 안전한 기본 제안: 핵심 사용자를 가장 보수적인 초기 사용자 1명으로 가정하고 구현 범위를 작게 잡으세요. 2. 사용자에게 할 질문: 이 대상으로 진행할까요, 아니면 생각해둔 핵심 사용자가 있나요?",
    ),
    ...buildDecisionItems(
      "mvp_scope",
      readSectionItems(sections, ["초기 방향"]),
      "1. 안전한 기본 제안: 첫 버전은 입력, 저장 또는 표시, 다시 확인 흐름까지만 구현하세요. 2. 사용자에게 할 질문: 이 최소 범위로 진행할까요, 아니면 꼭 넣고 싶은 기능이 1개 있나요?",
    ),
    ...readSectionItems(sections, ["열린 질문"]).map((question) => ({
      agent_guidance:
        "1. 안전한 기본 제안: 이 항목은 TODO로 남기고 최소 구현을 먼저 진행하세요. 2. 사용자에게 할 질문: 지금 답을 정하고 갈까요, 아니면 일단 비워두고 MVP부터 만들까요?",
      field: "open_questions",
      reason: question,
    })),
  ].filter((item) => isNeedsDetailText(item.reason));
}

function buildDecisionItems(
  field: string,
  items: string[],
  agentGuidance: string,
): Array<{
  agent_guidance: string;
  field: string;
  reason: string;
}> {
  return items
    .filter(isNeedsDetailText)
    .map((item) => ({
      agent_guidance: agentGuidance,
      field,
      reason: item,
    }));
}

function readActionableItems(
  sections: Record<string, string[]>,
  titles: string[],
): string[] {
  return readSectionItems(sections, titles).filter((item) => !isNeedsDetailText(item));
}

function isNeedsDetailText(value: string): boolean {
  return (
    value.includes("아직 구체화되지 않았습니다") ||
    value.includes("추가 확인") ||
    value.includes("열린 질문") ||
    value.includes("명확하지") ||
    value.includes("다듬을 여지") ||
    value.includes("더 정하면 좋습니다")
  );
}

type ParsedFollowUpFlow = {
  name: string;
  steps: string[];
};

type ParsedExceptionFlow = {
  branches: string[];
  name: string;
  start: string;
};

function ArchitectureFollowUpVisual({ resultBody }: { resultBody: string }) {
  const flows = parseDetailedFlows(resultBody);
  const exceptionFlows = parseExceptionFlows(resultBody);

  if (flows.length === 0 && exceptionFlows.length === 0) {
    return <pre className="follow-up-body">{resultBody}</pre>;
  }

  return (
    <section className="follow-up-visual" aria-label="세부 설계 흐름도">
      <div className="follow-up-visual-header">
        <h4>세부 설계 흐름도</h4>
        <p>정상 처리 흐름과 예외 분기를 먼저 한눈에 보고, 필요한 경우 아래 세부 텍스트를 확인하세요.</p>
      </div>

      {flows.length > 0 ? (
        <div className="follow-up-flow-map-list">
          {flows.map((flow) => (
            <article className="follow-up-flow-map" key={flow.name}>
              <h5>{flow.name}</h5>
              <ol>
                {flow.steps.map((step, index) => (
                  <li key={`${flow.name}-${step}`}>
                    <span className="follow-up-flow-index">{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : null}

      {exceptionFlows.length > 0 ? (
        <div className="follow-up-exception-map">
          <h4>예외/엣지케이스 분기</h4>
          <div className="follow-up-exception-grid">
            {exceptionFlows.map((flow) => (
              <article className="follow-up-exception-card" key={flow.name}>
                <h5>{flow.name}</h5>
                <p className="follow-up-exception-start">{flow.start}</p>
                <ul>
                  {flow.branches.map((branch) => (
                    <li key={`${flow.name}-${branch}`}>{branch}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildArchitectureCodingPrompt(followUp: Stage1FollowUpResult): string {
  const flows = parseDetailedFlows(followUp.result_body);
  const exceptionFlows = parseExceptionFlows(followUp.result_body);
  const boundary = extractArchitectureBoundary(followUp.result_body);
  const priorityFlows = flows.flatMap((flow) => [
    `- ${flow.name}`,
    ...flow.steps.slice(0, 6).map((step) => `  - ${step}`),
  ]);
  const exceptionCases = exceptionFlows.flatMap((flow) => [
    `- ${flow.name}: ${flow.start}`,
    ...flow.branches.map((branch) => `  - ${branch}`),
  ]);
  const outOfScope =
    followUp.remaining_questions.length > 0
      ? followUp.remaining_questions.map((item) => `- ${item}`)
      : ["- 상세 API 명세 자동 확정", "- 실제 외부 서비스 연동", "- 코드 대량 생성"];

  return [
    "다음 구조 설계를 바탕으로 MVP 수준의 구현 계획을 세워주세요.",
    "",
    "[목표]",
    boundary
      ? `- ${boundary}`
      : "- 아래 흐름을 기준으로 구현 가능한 화면, 모듈, 데이터, API 단위를 나눕니다.",
    "- 바로 코드를 많이 생성하기보다, 먼저 구현 계획과 작업 경계를 제안합니다.",
    "",
    "[우선 구현 흐름]",
    ...(priorityFlows.length > 0
      ? priorityFlows
      : ["- 정상 흐름을 먼저 정리하고, 가장 작은 MVP 구현 순서를 제안합니다."]),
    "",
    "[예외/엣지케이스]",
    ...(exceptionCases.length > 0
      ? exceptionCases
      : ["- 필수 입력 누락, 권한 문제, 외부 처리 실패, 중복 요청을 어떻게 막을지 정리합니다."]),
    "",
    "[이번 단계 제외 범위]",
    ...outOfScope,
    "",
    "[먼저 해줄 일]",
    "1. 필요한 화면과 모듈을 나눠주세요.",
    "2. 데이터 모델 초안을 제안해주세요.",
    "3. 주요 API 또는 함수 단위를 제안해주세요.",
    "4. 정상 흐름과 예외 흐름을 분리해서 구현 순서를 잡아주세요.",
    "5. 아직 결정이 필요한 질문을 마지막에 정리해주세요.",
    "",
    "[주의]",
    "- 불명확한 부분은 임의로 확정하지 말고 질문으로 남겨주세요.",
    "- 구현 범위가 커지면 MVP에 필요한 것과 나중에 할 것을 분리해주세요.",
    "- 실제 코드 작성은 계획과 파일 구조를 확인한 다음 단계로 미뤄주세요.",
  ].join("\n");
}

function extractArchitectureBoundary(resultBody: string): string | undefined {
  const quotedMatch = resultBody.match(/이번 후속 결과는\s+"(.+?)"\s+구조/u);

  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }

  const englishMatch = resultBody.match(
    /keeps the existing boundary around\s+"(.+?)"\s+and/iu,
  );

  return englishMatch?.[1]?.trim() || undefined;
}

function parseDetailedFlows(resultBody: string): ParsedFollowUpFlow[] {
  const lines = resultBody.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const exceptionIndex = lines.findIndex((line) =>
    /예외\/엣지케이스 분기 흐름도|Exception and Edge-Case Branches/i.test(line),
  );
  const usableLines =
    exceptionIndex >= 0 ? lines.slice(0, exceptionIndex) : lines;
  const flows: ParsedFollowUpFlow[] = [];

  for (let index = 0; index < usableLines.length; index += 1) {
    const line = usableLines[index];
    const nextLine = usableLines[index + 1] ?? "";

    if (!isFollowUpFlowHeading(line, nextLine)) {
      continue;
    }

    const steps: string[] = [];

    for (let stepIndex = index + 1; stepIndex < usableLines.length; stepIndex += 1) {
      const stepLine = usableLines[stepIndex];
      const followingLine = usableLines[stepIndex + 1] ?? "";

      if (stepIndex > index + 1 && isFollowUpFlowHeading(stepLine, followingLine)) {
        break;
      }

      const match = stepLine.match(/^\d+\.\s+(.+)$/);

      if (match?.[1]) {
        steps.push(match[1].trim());
      }
    }

    if (steps.length > 0) {
      flows.push({
        name: line,
        steps,
      });
    }
  }

  return flows.slice(0, 3);
}

function parseExceptionFlows(resultBody: string): ParsedExceptionFlow[] {
  const lines = resultBody.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const exceptionIndex = lines.findIndex((line) =>
    /예외\/엣지케이스 분기 흐름도|Exception and Edge-Case Branches/i.test(line),
  );

  if (exceptionIndex === -1) {
    return [];
  }

  const exceptionLines = lines.slice(exceptionIndex + 1);
  const flows: ParsedExceptionFlow[] = [];

  for (let index = 0; index < exceptionLines.length; index += 1) {
    const name = exceptionLines[index];
    const startLine = exceptionLines[index + 1] ?? "";

    if (!name || !/^\[.+\]$/.test(startLine)) {
      continue;
    }

    const branches: string[] = [];

    for (let branchIndex = index + 2; branchIndex < exceptionLines.length; branchIndex += 1) {
      const branchLine = exceptionLines[branchIndex];
      const nextLine = exceptionLines[branchIndex + 1] ?? "";

      if (/^\[.+\]$/.test(nextLine) && !branchLine.startsWith("->")) {
        break;
      }

      if (branchLine.startsWith("->")) {
        branches.push(branchLine.replace(/^->\s*/, "").trim());
      }
    }

    if (branches.length > 0) {
      flows.push({
        branches,
        name,
        start: startLine.replace(/^\[|\]$/g, ""),
      });
    }
  }

  return flows.slice(0, 3);
}

function isFollowUpFlowHeading(line: string, nextLine: string): boolean {
  return (
    Boolean(line) &&
    /^\d+\.\s+/.test(nextLine) &&
    !line.includes(":") &&
    !line.startsWith("[") &&
    !line.startsWith("-") &&
    !/세부 설계 확장|Detailed Flow Expansion|확장 초점|Expansion focus/i.test(line)
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

function buildIntentContextSummary(result: EngineResult): {
  items: Array<{
    body: string;
    title: string;
  }>;
} {
  const missingContext = readContextList([
    ...result.intent_ir.analysis.missing_information,
    ...result.intent_ir.analysis.clarification_questions.map(
      (question) => question.question,
    ),
  ]);
  const riskyAssumptions = readContextList([
    ...result.intent_ir.analysis.risks,
    ...result.intent_ir.analysis.assumptions,
  ]);

  return {
    items: [
      {
        title: "내가 이해한 요청",
        body: formatIntentSummary(result.intent_ir.summary, result.source.text),
      },
      {
        title: "추천 작업 형태",
        body: `${formatRendererLabel(result.provisional_renderer)}로 먼저 정리하는 편이 좋아 보입니다.`,
      },
      {
        title: "왜 이 방향인지",
        body: readWorkTypeReason(result),
      },
      {
        title: "빠진 정보",
        body:
          missingContext.length > 0
            ? missingContext.join(" / ")
            : "지금 입력만으로도 첫 결과를 만들 수 있을 만큼 핵심 방향은 보입니다.",
      },
      {
        title: "조심해야 할 추측",
        body:
          riskyAssumptions.length > 0
            ? riskyAssumptions.join(" / ")
            : "큰 추측 없이 정리했지만, 세부 조건은 결과를 보며 조정하면 좋습니다.",
      },
      {
        title: "다음에 더 잘 요청하려면",
        body: readNextBetterRequestHint(result),
      },
    ],
  };
}

function formatIntentSummary(summary: string, sourceText: string): string {
  const normalized = summary.trim();

  if (normalized) {
    return formatSummary(normalized);
  }

  const preview = sourceText.trim().replace(/\s+/g, " ").slice(0, 90);

  return preview
    ? `${preview}${sourceText.trim().length > preview.length ? "..." : ""}`
    : "입력한 내용을 바탕으로 의도와 작업 방향을 먼저 정리했습니다.";
}

function readContextList(values: string[]): string[] {
  return values
    .map((value) => formatSummary(value).trim().replace(/\.$/, ""))
    .filter(Boolean)
    .slice(0, 3);
}

function readWorkTypeReason(result: EngineResult): string {
  if (result.mode_guess === "review") {
    return "새로 쓰기보다 기존 초안의 약점과 보완점을 먼저 보는 요청으로 읽혔습니다.";
  }

  switch (result.provisional_renderer) {
    case "plan":
      return "최종 문구보다 문제, 대상, 범위가 먼저 잡혀야 결과가 덜 얕아집니다.";
    case "architecture":
      return "기능을 바로 나열하기보다 경계, 구성요소, 흐름을 나누는 일이 먼저입니다.";
    case "prompt":
      return "목표와 사용 상황이 비교적 분명해서 다른 AI에 넘길 실행형 입력으로 만들 수 있습니다.";
    case "review-report":
    default:
      return "현재 내용은 결과를 새로 만들기보다 판단 기준에 따라 점검하는 편이 더 맞습니다.";
  }
}

function readNextBetterRequestHint(result: EngineResult): string {
  switch (result.provisional_renderer) {
    case "plan":
      return "누가 쓰는지, 어떤 문제를 풀고 싶은지, 첫 버전에서 어디까지 할지 함께 적어보세요.";
    case "architecture":
      return "포함할 화면이나 역할, 가장 중요한 사용자 흐름, 이번 단계에서 제외할 것을 함께 적어보세요.";
    case "review-report":
      return "검토할 초안 전체, 어디에 쓰일지, 먼저 보고 싶은 기준을 함께 적어보세요.";
    case "prompt":
    default:
      return "사용 상황, 원하는 출력 형식, 대상, 꼭 지킬 조건을 함께 적어보세요.";
  }
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

function readAppliedInputHint(result: EngineResult):
  | {
      text: string;
      title: string;
    }
  | undefined {
  const metadata = result.source.metadata;

  if (!metadata) {
    return undefined;
  }

  const title = metadata.applied_input_hint_title;
  const text = metadata.applied_input_hint_text;

  if (typeof title !== "string" || typeof text !== "string") {
    return undefined;
  }

  if (!title.trim() || !text.trim()) {
    return undefined;
  }

  return {
    text: text.trim(),
    title: title.trim(),
  };
}

function buildAppliedHintEffects(title: string): string[] {
  if (title.includes("핵심 사용자")) {
    return [
      "결과에서 누가 가장 먼저 쓸 사람인지 더 먼저 보도록 요청이 바뀌었습니다.",
      "확인할 곳: 핵심 사용자, 맥락 섹션",
    ];
  }

  if (title.includes("해결하려는 문제") || title.includes("문제")) {
    return [
      "결과에서 사용자가 겪는 불편과 해결 순간을 더 먼저 보도록 요청이 바뀌었습니다.",
      "확인할 곳: 해결하려는 문제, 핵심 사용자 섹션",
    ];
  }

  if (title.includes("MVP") || title.includes("범위")) {
    return [
      "결과에서 처음 버전에 넣을 것과 나중으로 미룰 것을 더 구분하도록 요청이 바뀌었습니다.",
      "확인할 곳: 초기 방향, 열린 질문 섹션",
    ];
  }

  if (title.includes("성공") || title.includes("질문")) {
    return [
      "결과에서 다음 판단 기준과 아직 남은 질문을 더 드러내도록 요청이 바뀌었습니다.",
      "확인할 곳: 초기 방향, 열린 질문 섹션",
    ];
  }

  return [
    "결과가 새 내용을 발명한 것이 아니라, 입력에 덧붙인 관점을 기준으로 다시 정리됐습니다.",
    "확인할 곳: 방금 누른 힌트 제목과 같은 결과 섹션",
  ];
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
