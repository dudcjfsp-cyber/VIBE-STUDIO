import { useEffect, useMemo, useRef } from "react";
import type { CardHint, EngineResult } from "@vive-studio/engine-contracts";

import type { ProviderId, ProviderModel } from "../../../lib/provider/types";
import { formatApprovalReviseGuide } from "../../../lib/ux/formatSignalCopy";
import type { StartExample } from "../types";
import { ProviderSessionPanel } from "./ProviderSessionPanel";
import { hintOptions, startExamples } from "../data/startExamples";

type ClarifyState = {
  question: string;
  reason?: string;
  remainingQuestions: number;
};

type StartPanelProps = {
  approvalRevise: EngineResult | undefined;
  clarify: ClarifyState | undefined;
  flowErrorMessage: string | undefined;
  input: string;
  isBusy: boolean;
  onExampleClick: (example: StartExample) => void;
  onProviderApiKeyChange: (value: string) => void;
  onProviderClear: () => void;
  onProviderConnect: () => void;
  onProviderModelChange: (value: string) => void;
  onProviderSelect: (value: ProviderId) => void;
  onHintSelect: (hint?: CardHint, prompt?: string) => void;
  onInputChange: (value: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  providerApiKey: string;
  providerErrorMessage: string | undefined;
  providerHasActiveSession: boolean;
  providerIsLoading: boolean;
  providerModel: string;
  providerModels: ProviderModel[];
  providerSelection: ProviderId;
  providerSessionLabel: string | undefined;
  selectedHint: CardHint | undefined;
};

export function StartPanel(props: StartPanelProps) {
  const {
    approvalRevise,
    clarify,
    flowErrorMessage,
    input,
    isBusy,
    onExampleClick,
    onProviderApiKeyChange,
    onProviderClear,
    onProviderConnect,
    onProviderModelChange,
    onProviderSelect,
    onHintSelect,
    onInputChange,
    onReset,
    onSubmit,
    providerApiKey,
    providerErrorMessage,
    providerHasActiveSession,
    providerIsLoading,
    providerModel,
    providerModels,
    providerSelection,
    providerSessionLabel,
    selectedHint,
  } = props;
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const approvalReviseGuide = useMemo(
    () =>
      approvalRevise ? formatApprovalReviseGuide(approvalRevise) : undefined,
    [approvalRevise],
  );

  useEffect(() => {
    if (!approvalReviseGuide || !composerInputRef.current) {
      return;
    }

    const inputElement = composerInputRef.current;
    const inputLength = inputElement.value.length;

    inputElement.focus();
    inputElement.setSelectionRange(inputLength, inputLength);
    inputElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [approvalRevise]);

  return (
    <section
      className={`start-panel${clarify || approvalReviseGuide ? " has-follow-up" : ""}`}
    >
      <div className="brand-lockup">
        <h1 className="brandmark">VIBE STUDIO</h1>
      </div>

      <ProviderSessionPanel
        apiKey={providerApiKey}
        errorMessage={providerErrorMessage}
        hasActiveSession={providerHasActiveSession}
        isLoading={providerIsLoading}
        model={providerModel}
        models={providerModels}
        onApiKeyChange={onProviderApiKeyChange}
        onClear={onProviderClear}
        onConnect={onProviderConnect}
        onModelChange={onProviderModelChange}
        onProviderChange={onProviderSelect}
        provider={providerSelection}
        sessionLabel={providerSessionLabel}
      />

      {approvalReviseGuide ? null : (
        <div className="composer">
          <textarea
            aria-label="요청 입력"
            className="composer-input"
            ref={composerInputRef}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="무엇을 만들고 싶은지, 혹은 지금 가진 초안을 적어보세요."
            value={input}
          />

          <button
            className="primary-action"
            disabled={isBusy || input.trim().length === 0}
            onClick={onSubmit}
            type="button"
          >
            {isBusy
              ? clarify
                ? "다시 확인 중..."
                : "정리 중..."
              : clarify
                ? "이 내용으로 계속"
                : "시작하기"}
          </button>

          {clarify ? (
            <p className="composer-helper">입력창에 한 줄만 덧붙여도 바로 이어서 정리할게요.</p>
          ) : null}

          {flowErrorMessage ? <p className="flow-error">{flowErrorMessage}</p> : null}
        </div>
      )}

      {clarify ? (
        <section className="clarify-inline" aria-live="polite">
          <div className="clarify-inline-header">
            <p className="clarify-badge">더 알려주세요</p>
            <button className="ghost-action ghost-action-inline" onClick={onReset} type="button">
              처음부터 다시
            </button>
          </div>

          <p className="clarify-inline-lead">이것만 짧게 알려주면 바로 이어서 정리할게요.</p>
          <p className="clarify-question">{clarify.question}</p>
          {clarify.reason ? <p className="clarify-reason">{clarify.reason}</p> : null}
          {clarify.remainingQuestions > 0 ? (
            <p className="clarify-note">
              필요하면 이어서 {clarify.remainingQuestions}가지만 더 확인할게요.
            </p>
          ) : null}
        </section>
      ) : approvalReviseGuide ? (
        <section className="clarify-inline approval-revise-inline" aria-live="polite">
          <div className="clarify-inline-header">
            <p className="clarify-badge">입력 보완 가이드</p>
            <button className="ghost-action ghost-action-inline" onClick={onReset} type="button">
              처음부터 다시
            </button>
          </div>

          <p className="clarify-inline-lead">{approvalReviseGuide.lead}</p>
          <p className="clarify-question">{approvalReviseGuide.title}</p>

          <section className="approval-revise-current">
            <h3>현재 입력</h3>
            <p>{input}</p>
          </section>

          <div className="approval-revise-grid approval-revise-grid-issues">
            {approvalReviseGuide.issueItems.map((item) => (
              <section className="approval-revise-block" key={item.title}>
                <h3>{item.title}</h3>
                <p className="approval-revise-label">왜 보완이 필요한가</p>
                <p>{item.reason}</p>
                <p className="approval-revise-label">보완하면 무엇이 더 나아지나</p>
                <p>{item.improvement}</p>
                <p className="approval-revise-label">입력에 이렇게 덧붙여보세요</p>
                <p>{item.prompt}</p>
              </section>
            ))}
          </div>

          <section className="approval-revise-editor">
            <div className="approval-revise-editor-header">
              <h3>여기서 바로 수정하기</h3>
              <p>지금 입력을 그대로 가져왔습니다. 아래에서 바로 고쳐 다시 정리해보세요.</p>
            </div>

            <textarea
              aria-label="보완 요청 입력"
              className="approval-revise-textarea"
              ref={composerInputRef}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="안내를 참고해 입력을 더 구체적으로 적어보세요."
              value={input}
            />

            <p className="approval-revise-example">
              보완 예시: {approvalReviseGuide.examplePrompt}
            </p>

            <button
              className="primary-action approval-revise-submit"
              disabled={isBusy || input.trim().length === 0}
              onClick={onSubmit}
              type="button"
            >
              {isBusy ? "다시 정리 중..." : "보완해서 다시 정리"}
            </button>
          </section>

          {flowErrorMessage ? <p className="flow-error">{flowErrorMessage}</p> : null}
        </section>
      ) : (
        <>
          <div className="examples">
            {startExamples.map((example) => (
              <button
                className="example-chip"
                key={example.id}
                onClick={() => onExampleClick(example)}
                type="button"
              >
                {example.text}
              </button>
            ))}
          </div>

          <div className="hint-row" aria-label="보조 힌트">
            {hintOptions.map((option) => (
              <button
                className={`hint-chip${selectedHint === option.cardHint ? " is-selected" : ""}`}
                key={option.id}
                onClick={() => onHintSelect(option.cardHint, option.prompt)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
