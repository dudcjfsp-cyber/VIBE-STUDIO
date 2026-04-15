import type { ApprovalLevel, EngineResult } from "@vive-studio/engine-contracts";

import { formatApprovalCopy } from "../../../lib/ux/formatSignalCopy";

type ApprovalPanelProps = {
  isBusy: boolean;
  onApprove: (level: ApprovalLevel) => void;
  result: EngineResult;
};

export function ApprovalPanel(props: ApprovalPanelProps) {
  const { isBusy, onApprove, result } = props;
  const isRequired = result.approval_level === "required";

  return (
    <section className="detail-panel">
      <p className="panel-kicker">한 번 더 확인</p>
      <h2>{formatApprovalCopy(result.approval_level, result.provisional_renderer)}</h2>
      <p className="panel-copy">
        {isRequired
          ? "실수 비용이 큰 요청이라 확인 없이 바로 진행하지 않습니다."
          : "지금 방향은 맞지만, 한 번 더 확인하면 결과를 더 잘 맞출 수 있습니다."}
      </p>

      <div className="action-row">
        <button
          className="primary-action"
          disabled={isBusy}
          onClick={() => onApprove(result.approval_level)}
          type="button"
        >
          {isBusy ? "정리 중..." : isRequired ? "확인하고 진행" : "확인하고 계속"}
        </button>

        {!isRequired ? (
          <button
            className="ghost-action"
            disabled={isBusy}
            onClick={() => onApprove("recommended")}
            type="button"
          >
            그대로 진행
          </button>
        ) : null}
      </div>
    </section>
  );
}
