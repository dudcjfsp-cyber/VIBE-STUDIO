import type { EngineResult } from "@vive-studio/engine-contracts";

import { formatClarifyLead } from "../../../lib/ux/formatSignalCopy";

type ClarifyPanelProps = {
  onReset: () => void;
  result: EngineResult;
};

export function ClarifyPanel({ onReset, result }: ClarifyPanelProps) {
  return (
    <section className="detail-panel">
      <p className="panel-kicker">더 알려주세요</p>
      <h2>{formatClarifyLead(result.provisional_renderer)}</h2>
      <p className="panel-copy">
        지금은 바로 결과를 만드는 것보다, 빠진 핵심 정보를 채우는 편이 더 정확합니다.
      </p>

      <ul className="detail-list">
        {result.intent_ir.analysis.clarification_questions.map((question) => (
          <li key={question.id}>
            <strong>{question.question}</strong>
            <span>{question.reason}</span>
          </li>
        ))}
      </ul>

      <button className="ghost-action" onClick={onReset} type="button">
        처음부터 다시 쓰기
      </button>
    </section>
  );
}
