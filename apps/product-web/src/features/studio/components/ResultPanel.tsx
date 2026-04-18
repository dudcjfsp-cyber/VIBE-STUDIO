import { useState } from "react";

import type { EngineResult } from "@vive-studio/engine-contracts";
import type { ArchitectureOutput } from "@vive-studio/renderer-architecture";
import type { PlanOutput } from "@vive-studio/renderer-plan";
import type { PromptOutput } from "@vive-studio/renderer-prompt";
import type { ReviewReportOutput } from "@vive-studio/renderer-review-report";

type ResultPanelProps = {
  onReset: () => void;
  result: EngineResult;
};

export function ResultPanel({ onReset, result }: ResultPanelProps) {
  const output = result.outputs[0];
  const [copyLabel, setCopyLabel] = useState("복사");

  if (!output) {
    return null;
  }

  async function handleCopyPrompt() {
    if (output.renderer !== "prompt") {
      return;
    }

    try {
      await navigator.clipboard.writeText((output.output as PromptOutput).prompt);
      setCopyLabel("복사됨");
      window.setTimeout(() => setCopyLabel("복사"), 1600);
    } catch {
      setCopyLabel("복사 실패");
      window.setTimeout(() => setCopyLabel("복사"), 1600);
    }
  }

  return (
    <section className="result-panel">
      <p className="panel-kicker">결과</p>
      <h2>{readOutputTitle(output)}</h2>
      <p className="panel-copy">{renderSummary(output.renderer)}</p>

      <div className="result-body">
        {output.renderer === "prompt" ? (
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

      <button className="ghost-action" onClick={onReset} type="button">
        새로 시작
      </button>
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
      return "다른 AI에 바로 붙여 넣을 수 있는 실행 프롬프트입니다.";
  }
}
