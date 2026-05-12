import { useEffect, useRef, useState } from "react";

import { ResultPanel } from "./components/ResultPanel";
import { StartPanel } from "./components/StartPanel";
import { useProviderSession } from "./hooks/useProviderSession";
import { useStudioFlow } from "./hooks/useStudioFlow";

export function StudioScreen() {
  const resultPanelRef = useRef<HTMLDivElement | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | undefined>();
  const providerSession = useProviderSession();
  const flow = useStudioFlow({
    blockReason: providerSession.blockReason,
    runtime: providerSession.runtime,
  });
  const resultToastKey =
    flow.snapshot.stage === "result" && flow.snapshot.result
      ? [
          flow.snapshot.runId ?? "no-run",
          flow.snapshot.result.outputs[0]?.renderer ?? flow.snapshot.result.provisional_renderer,
          flow.snapshot.result.outputs.length,
        ].join(":")
      : undefined;
  useEffect(() => {
    if (flow.snapshot.stage !== "result" || !resultToastKey) {
      return undefined;
    }

    resultPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setCompletionMessage("생성 완료");

    const timeoutId = window.setTimeout(() => {
      setCompletionMessage(undefined);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [flow.snapshot.stage, resultToastKey]);

  return (
    <main className="app-shell" aria-busy={flow.isBusy}>
      <StartPanel
        flowErrorMessage={flow.errorMessage}
        input={flow.input}
        isBusy={flow.isBusy}
        onProviderApiKeyChange={providerSession.setApiKey}
        onProviderClear={providerSession.clearSession}
        onProviderConnect={() => {
          void providerSession.connect();
        }}
        onProviderModelChange={providerSession.setModel}
        onProviderSelect={providerSession.setProvider}
        onInputChange={flow.setInput}
        onSubmit={(nextInput, cardHint) => {
          void flow.submit({
            ...(nextInput ? { text: nextInput } : {}),
            ...(cardHint ? { cardHint } : {}),
          });
        }}
        providerApiKey={providerSession.apiKey}
        providerErrorMessage={providerSession.errorMessage}
        providerHasActiveSession={providerSession.hasActiveSession}
        providerIsLoading={providerSession.isLoading}
        providerModel={providerSession.model}
        providerModels={providerSession.models}
        providerSelection={providerSession.provider}
        providerSessionLabel={providerSession.sessionLabel}
      />

      {flow.snapshot.stage === "result" && flow.snapshot.result ? (
        <div ref={resultPanelRef}>
          <ResultPanel
            isBusy={flow.isBusy}
            onReset={flow.reset}
            onUseInputHint={(hint) => {
              const baseText =
                flow.snapshot.result?.source.text.trim() ?? flow.input.trim();
              const nextInput = [
                baseText,
                hint.text.trim(),
              ]
                .filter(Boolean)
                .join("\n\n");

              void flow.submit({
                appliedInputHint: {
                  baseText,
                  text: hint.text,
                  title: hint.title,
                },
                text: nextInput,
              });
            }}
            result={flow.snapshot.result}
            runId={flow.snapshot.runId}
            runtime={providerSession.runtime}
          />
        </div>
      ) : null}

      {flow.isBusy ? (
        <div className="busy-toast" role="status" aria-live="polite">
          <span className="busy-spinner" aria-hidden="true" />
          <span>요청을 정리하고 있어요. 잠시만 기다려 주세요.</span>
        </div>
      ) : null}

      {completionMessage ? (
        <div className="busy-toast is-complete" role="status" aria-live="polite">
          <span className="complete-dot" aria-hidden="true" />
          <span>{completionMessage}</span>
        </div>
      ) : null}
    </main>
  );
}
