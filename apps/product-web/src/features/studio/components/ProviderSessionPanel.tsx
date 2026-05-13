import { providerOptions } from "../../../lib/provider/types";
import type { ProviderId, ProviderModel } from "../../../lib/provider/types";
import { enabledProviders } from "../../../lib/runtime/productRuntimeConfig";

type ProviderSessionPanelProps = {
  apiKey: string;
  errorMessage: string | undefined;
  hasActiveSession: boolean;
  isLoading: boolean;
  model: string;
  models: ProviderModel[];
  onApiKeyChange: (value: string) => void;
  onClear: () => void;
  onConnect: () => void;
  onModelChange: (value: string) => void;
  onProviderChange: (value: ProviderId) => void;
  provider: ProviderId;
  sessionLabel: string | undefined;
};

export function ProviderSessionPanel(props: ProviderSessionPanelProps) {
  const {
    apiKey,
    errorMessage,
    hasActiveSession,
    isLoading,
    model,
    models,
    onApiKeyChange,
    onClear,
    onConnect,
    onModelChange,
    onProviderChange,
    provider,
    sessionLabel,
  } = props;
  const isRemoteProvider = provider !== "local";
  const visibleProviderOptions = providerOptions.filter((option) =>
    enabledProviders.includes(option.id),
  );

  return (
    <section className="provider-panel">
      <div className="provider-row">
        <label className="provider-field">
          <span className="provider-label">실행 방식</span>
          <select
            className="provider-select"
            onChange={(event) => onProviderChange(event.target.value as ProviderId)}
            value={provider}
          >
            {visibleProviderOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isRemoteProvider ? (
          <label className="provider-field provider-key-field">
            <span className="provider-label">개인 연결 키</span>
            <input
              autoComplete="off"
              className="provider-input"
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="이미 발급받은 키가 있을 때만 붙여넣으세요."
              type="password"
              value={apiKey}
            />
          </label>
        ) : (
          <div className="provider-note">
            <span className="provider-label">기본값</span>
            <p>처음이라면 이 설정을 그대로 두고 시작하면 됩니다.</p>
          </div>
        )}

        {isRemoteProvider ? (
          <button
            className="ghost-action provider-action"
            disabled={isLoading}
            onClick={onConnect}
            type="button"
          >
            {isLoading ? "불러오는 중..." : hasActiveSession ? "모델 다시 불러오기" : "모델 불러오기"}
          </button>
        ) : null}
      </div>

      {isRemoteProvider ? (
        <div className="provider-row provider-row-secondary">
          <label className="provider-field provider-model-field">
            <span className="provider-label">모델</span>
            <select
              className="provider-select"
              disabled={models.length === 0}
              onChange={(event) => onModelChange(event.target.value)}
              value={model}
            >
              <option value="">
                {models.length > 0 ? "모델을 선택하세요." : "먼저 모델 목록을 불러오세요."}
              </option>
              {models.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="provider-meta">
            <span className={`provider-badge${hasActiveSession ? " is-ready" : ""}`}>
              {hasActiveSession ? sessionLabel ?? "세션 활성화" : "세션 없음"}
            </span>
            {hasActiveSession ? (
              <button className="provider-clear" onClick={onClear} type="button">
                세션 지우기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {errorMessage ? <p className="provider-error">{errorMessage}</p> : null}
    </section>
  );
}
