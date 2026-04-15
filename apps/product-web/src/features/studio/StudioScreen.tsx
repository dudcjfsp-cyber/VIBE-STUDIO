import { ApprovalPanel } from "./components/ApprovalPanel";
import { ClarifyPanel } from "./components/ClarifyPanel";
import { ResultPanel } from "./components/ResultPanel";
import { StartPanel } from "./components/StartPanel";
import { useStudioFlow } from "./hooks/useStudioFlow";

export function StudioScreen() {
  const flow = useStudioFlow();

  return (
    <main className="app-shell">
      <StartPanel
        input={flow.input}
        isBusy={flow.isBusy}
        onExampleClick={(value) => {
          flow.setInput(value);
          void flow.submit({ text: value });
        }}
        onHintSelect={(hint, prompt) => {
          flow.setSelectedHint(hint);
          if (!flow.input.trim() && prompt) {
            flow.setInput(prompt);
          }
        }}
        onInputChange={flow.setInput}
        onSubmit={() => {
          void flow.submit();
        }}
        selectedHint={flow.selectedHint}
      />

      {flow.snapshot.stage === "clarify" && flow.snapshot.result ? (
        <ClarifyPanel onReset={flow.reset} result={flow.snapshot.result} />
      ) : null}

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
