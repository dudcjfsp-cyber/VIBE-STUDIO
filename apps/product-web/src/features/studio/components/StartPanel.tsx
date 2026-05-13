import { useMemo, useRef, useState } from "react";
import type { CardHint } from "@vive-studio/engine-contracts";

import type { ProviderId, ProviderModel } from "../../../lib/provider/types";
import { startTemplates } from "../data/startTemplates";
import type { StartTemplate, StartTemplateId } from "../types";
import { ProviderSessionPanel } from "./ProviderSessionPanel";

type StartPanelProps = {
  flowErrorMessage: string | undefined;
  input: string;
  isBusy: boolean;
  onProviderApiKeyChange: (value: string) => void;
  onProviderClear: () => void;
  onProviderConnect: () => void;
  onProviderModelChange: (value: string) => void;
  onProviderSelect: (value: ProviderId) => void;
  onInputChange: (value: string) => void;
  onSubmit: (nextInput?: string, cardHint?: CardHint) => void;
  providerApiKey: string;
  providerErrorMessage: string | undefined;
  providerHasActiveSession: boolean;
  providerIsLoading: boolean;
  providerModel: string;
  providerModels: ProviderModel[];
  providerSelection: ProviderId;
  providerSessionLabel: string | undefined;
};

export function StartPanel(props: StartPanelProps) {
  const {
    flowErrorMessage,
    input,
    isBusy,
    onProviderApiKeyChange,
    onProviderClear,
    onProviderConnect,
    onProviderModelChange,
    onProviderSelect,
    onInputChange,
    onSubmit,
    providerApiKey,
    providerErrorMessage,
    providerHasActiveSession,
    providerIsLoading,
    providerModel,
    providerModels,
    providerSelection,
    providerSessionLabel,
  } = props;
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<StartTemplateId | undefined>();
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const selectedTemplate = useMemo(
    () => startTemplates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId],
  );
  const isFreeInput = selectedTemplate?.id === "free";

  function selectTemplate(template: StartTemplate) {
    setSelectedTemplateId(template.id);
    setTemplateValues({});
    onInputChange("");

    if (template.id === "free") {
      window.setTimeout(() => composerInputRef.current?.focus(), 0);
    }
  }

  function updateTemplateValue(template: StartTemplate, fieldId: string, value: string) {
    const nextValues = {
      ...templateValues,
      [fieldId]: value,
    };

    setTemplateValues(nextValues);
    onInputChange(template.buildInput(nextValues));
  }

  function resetTemplateChoice() {
    setSelectedTemplateId(undefined);
    setTemplateValues({});
    onInputChange("");
  }

  return (
    <section className="start-panel">
      <div className="brand-lockup">
        <h1 className="brandmark">VIBE STUDIO</h1>
        <p className="brand-subcopy">어디서 시작할지만 고르면, 먼저 정리해드릴게요.</p>
      </div>

      <div className="template-picker" aria-label="시작 방식 선택">
        {startTemplates.map((template) => (
          <button
            className={`template-card${template.id === selectedTemplateId ? " is-selected" : ""}`}
            key={template.id}
            onClick={() => selectTemplate(template)}
            type="button"
          >
            <span>{template.title}</span>
            <strong>{template.label}</strong>
            <em>{template.description}</em>
          </button>
        ))}
      </div>

      {selectedTemplate ? (
        <div className={`composer${isFreeInput ? " is-direct" : ""}`}>
          <div className="template-composer-header">
            <div>
              <p className="starter-kicker">{selectedTemplate.title}</p>
              <h2>{selectedTemplate.label}</h2>
            </div>
            <button className="text-action" onClick={resetTemplateChoice} type="button">
              다른 시작 선택
            </button>
          </div>

          {isFreeInput ? (
            <textarea
              aria-label="요청 입력"
              className="composer-input"
              ref={composerInputRef}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="무엇을 만들고 싶은지, 혹은 지금 가진 초안을 적어보세요."
              value={input}
            />
          ) : (
            <div className="starter-composer" aria-label={`${selectedTemplate.title} 템플릿`}>
              {selectedTemplate.fields.map((field) => (
                <label className="template-field" key={field.id}>
                  <span>
                    {field.label}
                    {field.optional ? <em>선택</em> : null}
                  </span>
                  <input
                    aria-label={field.label}
                    className="starter-input"
                    onChange={(event) =>
                      updateTemplateValue(selectedTemplate, field.id, event.target.value)
                    }
                    placeholder={field.placeholder}
                    value={templateValues[field.id] ?? ""}
                  />
                  {field.helper ? <small>{field.helper}</small> : null}
                </label>
              ))}
            </div>
          )}

          <div className="composer-footer">
            <div className="composer-tools">
              <span className="composer-helper-inline">
                짧게 적어도 괜찮아요. 부족한 부분은 결과 안에서 조심스럽게 짚어드립니다.
              </span>
            </div>

            <div className="composer-submit-group">
              <span className="composer-count">{input.length} / 4000</span>
              <button
                className="primary-action"
                disabled={isBusy || input.trim().length === 0}
                onClick={() => onSubmit(undefined, selectedTemplate.cardHint)}
                type="button"
              >
                {isBusy ? "정리 중..." : "정리하기"}
              </button>
            </div>
          </div>

          {flowErrorMessage ? <p className="flow-error">{flowErrorMessage}</p> : null}
        </div>
      ) : null}

      <details className="provider-disclosure">
        <summary>
          <span>고급 설정</span>
          {providerHasActiveSession ? <em>연결됨</em> : null}
        </summary>
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
      </details>
    </section>
  );
}
