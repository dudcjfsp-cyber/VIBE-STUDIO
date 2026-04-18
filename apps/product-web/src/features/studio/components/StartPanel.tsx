import type { CardHint } from "@vive-studio/engine-contracts";

import type { ProviderId, ProviderModel } from "../../../lib/provider/types";
import type { StartExample } from "../types";
import { ProviderSessionPanel } from "./ProviderSessionPanel";
import { hintOptions, startExamples } from "../data/startExamples";

type ClarifyState = {
  question: string;
  reason?: string;
  remainingQuestions: number;
};

type StartPanelProps = {
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

  return (
    <section className={`start-panel${clarify ? " has-follow-up" : ""}`}>
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

      <div className="composer">
        <textarea
          aria-label="요청 입력"
          className="composer-input"
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
