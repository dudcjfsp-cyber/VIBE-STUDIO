import type { ReactNode } from "react";

export type LearningPanelPoint = {
  applied: boolean;
  label: string;
  reason: string;
  whenToUse: string;
};

type LearningPanelProps = {
  children?: ReactNode;
  inactiveLabel?: string;
  lead: string;
  points: LearningPanelPoint[];
  summaryItems: string[];
  title?: string;
};

export function LearningPanel({
  children,
  inactiveLabel = "다음 보완",
  lead,
  points,
  summaryItems,
  title = "이번에 같이 볼 포인트",
}: LearningPanelProps) {
  return (
    <section className="result-section learning-panel">
      <p className="panel-kicker">{title}</p>
      <p className="learning-lead">{lead}</p>

      {summaryItems.length > 0 ? (
        <ul className="learning-summary">
          {summaryItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <LearningPointGrid inactiveLabel={inactiveLabel} points={points} />

      {children}
    </section>
  );
}

type LearningPointGridProps = {
  inactiveLabel?: string;
  points: LearningPanelPoint[];
};

export function LearningPointGrid({
  inactiveLabel = "다음 보완",
  points,
}: LearningPointGridProps) {
  return (
    <div className="learning-grid">
      {points.map((point) => (
        <article className="learning-card" key={point.label}>
          <div className="learning-card-header">
            <h3>{point.label}</h3>
            <span className={`learning-badge${point.applied ? " is-applied" : ""}`}>
              {point.applied ? "이번 적용" : inactiveLabel}
            </span>
          </div>
          <p>
            <strong>언제 쓰나</strong>
            <span>{point.whenToUse}</span>
          </p>
          <p>
            <strong>왜 중요했나</strong>
            <span>{point.reason}</span>
          </p>
        </article>
      ))}
    </div>
  );
}
