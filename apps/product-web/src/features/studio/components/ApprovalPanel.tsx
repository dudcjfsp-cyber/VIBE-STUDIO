import type { ApprovalLevel, EngineResult } from "@vive-studio/engine-contracts";

import { formatApprovalCopy } from "../../../lib/ux/formatSignalCopy";

type ApprovalPanelProps = {
  isBusy: boolean;
  onApprove: (level: ApprovalLevel) => void;
  onRevise: () => void;
  result: EngineResult;
};

export function ApprovalPanel(props: ApprovalPanelProps) {
  const { isBusy, onApprove, onRevise, result } = props;
  const isRequired = result.approval_level === "required";

  return (
    <section className="detail-panel">
      <p className="panel-kicker">한 번 더 확인</p>
      <h2>{formatApprovalCopy(result.approval_level, result.provisional_renderer)}</h2>
      <p className="panel-copy">
        {isRequired
          ? "지금 단계에서는 범위와 방향을 한 번 점검한 뒤 진행하는 편이 좋습니다."
          : "입력을 조금 더 다듬어도 되고, 지금 내용 그대로 바로 다음 단계로 진행해도 됩니다."}
      </p>

      <div className="action-row">
        <button
          className="ghost-action"
          disabled={isBusy}
          onClick={onRevise}
          type="button"
        >
          입력 보완하기
        </button>

        <button
          className="primary-action"
          disabled={isBusy}
          onClick={() => onApprove(result.approval_level)}
          type="button"
        >
          {isBusy
            ? "정리 중.."
            : isRequired
              ? "확인 후 진행"
              : "그대로 진행"}
        </button>
      </div>
    </section>
  );
}
