import { ApprovalPanel } from "./components/ApprovalPanel";
import { ResultPanel } from "./components/ResultPanel";
import { StartPanel } from "./components/StartPanel";
import { useProviderSession } from "./hooks/useProviderSession";
import { useStudioFlow } from "./hooks/useStudioFlow";

export function StudioScreen() {
  const providerSession = useProviderSession();
  const flow = useStudioFlow({
    blockReason: providerSession.blockReason,
    runtime: providerSession.runtime,
  });
  const clarifyQuestion =
    flow.snapshot.stage === "clarify" && flow.snapshot.result
      ? flow.snapshot.result.intent_ir.analysis.clarification_questions[0]
      : undefined;
  const remainingClarifyCount =
    flow.snapshot.stage === "clarify" && flow.snapshot.result
      ? Math.max(flow.snapshot.result.intent_ir.analysis.clarification_questions.length - 1, 0)
      : 0;

  return (
    <main className="app-shell">
      <StartPanel
        clarify={
          clarifyQuestion
            ? {
                question: clarifyQuestion.question,
                reason: clarifyQuestion.reason,
                remainingQuestions: remainingClarifyCount,
              }
            : undefined
        }
        flowErrorMessage={flow.errorMessage}
        input={flow.input}
        isBusy={flow.isBusy}
        onExampleClick={(value) => {
          flow.setInput(value);
          void flow.submit({ text: value });
        }}
        onProviderApiKeyChange={providerSession.setApiKey}
        onProviderClear={providerSession.clearSession}
        onProviderConnect={() => {
          void providerSession.connect();
        }}
        onProviderModelChange={providerSession.setModel}
        onProviderSelect={providerSession.setProvider}
        onHintSelect={(hint, prompt) => {
          flow.setSelectedHint(hint);
          if (!flow.input.trim() && prompt) {
            flow.setInput(prompt);
          }
        }}
        onInputChange={flow.setInput}
        onReset={flow.reset}
        onSubmit={() => {
          void flow.submit();
        }}
        providerApiKey={providerSession.apiKey}
        providerErrorMessage={providerSession.errorMessage}
        providerHasActiveSession={providerSession.hasActiveSession}
        providerIsLoading={providerSession.isLoading}
        providerModel={providerSession.model}
        providerModels={providerSession.models}
        providerSelection={providerSession.provider}
        providerSessionLabel={providerSession.sessionLabel}
        selectedHint={flow.selectedHint}
      />

      {flow.snapshot.stage === "approval" && flow.snapshot.result ? (
        <ApprovalPanel
          isBusy={flow.isBusy}
          onApprove={(level) => {
            if (level === "none") {
              return;
            }

            void flow.continueAfterApproval(level);
          }}
          result={flow.snapshot.result}
        />
      ) : null}

      {flow.snapshot.stage === "result" && flow.snapshot.result ? (
        <ResultPanel onReset={flow.reset} result={flow.snapshot.result} />
      ) : null}
    </main>
  );
}
