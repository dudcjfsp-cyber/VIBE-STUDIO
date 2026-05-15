import { useMemo, useRef, useState } from "react";
import type { CardHint } from "@vive-studio/engine-contracts";

import type { ProviderId, ProviderModel } from "../../../lib/provider/types";
import { startTemplates } from "../data/startTemplates";
import type { StartTemplate, StartTemplateId } from "../types";
import { ProviderSessionPanel } from "./ProviderSessionPanel";

const beginnerTemplateIds: StartTemplateId[] = ["free", "prompt", "plan"];

const starterExamples: Array<{
  cardHint: CardHint;
  description: string;
  input: string;
  label: string;
}> = [
  {
    cardHint: "command-optimization",
    description: "요청이 바로 실행형 작업으로 정리되는 흐름을 봅니다.",
    input:
      "AI 입문자를 대상으로 한 5분짜리 유튜브 영상 제목을 10개 뽑고 싶어. 너무 과장된 제목은 피하고 싶어.",
    label: "유튜브 제목 10개 뽑기",
  },
  {
    cardHint: "idea-structuring",
    description: "막연한 생각이 어떤 작업 형태로 정리되는지 봅니다.",
    input:
      "AI 입문자를 위한 프롬프트 연습 노트를 만들고 싶어. 주요 대상은 AI를 처음 써보는 비개발자야. 이 아이디어를 기획 정리로 잡아줘.",
    label: "아이디어를 기획으로 정리하기",
  },
];

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
  const beginnerTemplates = useMemo(
    () => startTemplates.filter((template) => beginnerTemplateIds.includes(template.id)),
    [],
  );
  const advancedTemplates = useMemo(
    () => startTemplates.filter((template) => !beginnerTemplateIds.includes(template.id)),
    [],
  );
  const isAdvancedTemplateSelected = selectedTemplate
    ? !beginnerTemplateIds.includes(selectedTemplate.id)
    : false;
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
        <p className="brand-subcopy">
          AI에게 바로 시키기 전에, 내가 무엇을 원하는지와 어떤 작업으로 넘기면
          좋은지 먼저 선명하게 정리해보세요.
        </p>
      </div>

      <section className="starter-examples" aria-label="의도 구조 예시로 먼저 보기">
        <div className="starter-examples-copy">
          <span className="starter-step">의도 구조 미리 보기</span>
          <p>내 요청이 어떤 작업인지 먼저 보기</p>
          <span>
            아직 쓸 말이 떠오르지 않아도 괜찮아요. Vibe Studio가 요청을 어떻게
            이해하고 분류하는지 먼저 볼 수 있어요.
          </span>
        </div>
        <div className="starter-example-actions">
          {starterExamples.map((example) => (
            <button
              className="starter-example-button"
              disabled={isBusy}
              key={example.label}
              onClick={() => onSubmit(example.input, example.cardHint)}
              type="button"
            >
              <strong>{example.label}</strong>
              <span>{example.description}</span>
              <em>눌러서 보기</em>
            </button>
          ))}
        </div>
      </section>

      <section className="beginner-choice-section" aria-label="직접 시작하기">
        <div className="beginner-choice-copy">
          <p>직접 해보고 싶다면</p>
          <span>아래에서 지금 상황에 가까운 것을 고르면 됩니다.</span>
        </div>
        <div className="template-picker" aria-label="시작 방식 선택">
          {beginnerTemplates.map((template) => renderTemplateButton(template))}
        </div>
      </section>

      <details className="advanced-start-disclosure" open={isAdvancedTemplateSelected || undefined}>
        <summary>
          <span>다른 도움이 필요하다면</span>
          {isAdvancedTemplateSelected ? <em>{selectedTemplate.title} 선택됨</em> : null}
        </summary>
        <div className="advanced-start-copy">
          <p>이미 쓴 내용의 빠진 점을 보거나, 화면과 흐름이 많은 서비스를 나눠볼 수 있어요.</p>
        </div>
        <div className="template-picker template-picker-advanced" aria-label="추가 시작 방식 선택">
          {advancedTemplates.map((template) => renderTemplateButton(template))}
        </div>
      </details>

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

  function renderTemplateButton(template: StartTemplate) {
    return (
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
    );
  }
}
