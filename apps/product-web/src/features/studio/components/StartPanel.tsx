import type { CardHint } from "@vive-studio/engine-contracts";

import { hintOptions, startExamples } from "../data/startExamples";

type StartPanelProps = {
  input: string;
  isBusy: boolean;
  onExampleClick: (value: string) => void;
  onHintSelect: (hint?: CardHint, prompt?: string) => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  selectedHint: CardHint | undefined;
};

export function StartPanel(props: StartPanelProps) {
  const {
    input,
    isBusy,
    onExampleClick,
    onHintSelect,
    onInputChange,
    onSubmit,
    selectedHint,
  } = props;

  return (
    <section className="start-panel">
      <div className="brand-lockup">
        <h1 className="brandmark">VIBE STUDIO</h1>
      </div>

      <div className="composer">
        <textarea
          aria-label="요청 입력"
          className="composer-input"
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="무엇을 만들고 싶은지, 혹은 지금 가진 초안을 적어보세요."
          value={input}
        />

        <button
          className="primary-action"
          disabled={isBusy || input.trim().length === 0}
          onClick={onSubmit}
          type="button"
        >
          {isBusy ? "정리 중..." : "시작하기"}
        </button>
      </div>

      <div className="examples">
        {startExamples.map((example) => (
          <button
            className="example-chip"
            key={example}
            onClick={() => onExampleClick(example)}
            type="button"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="hint-row" aria-label="보조 힌트">
        {hintOptions.map((option) => (
          <button
            className={`hint-chip${selectedHint === option.cardHint ? " is-selected" : ""}`}
            key={option.id}
            onClick={() => onHintSelect(option.cardHint, option.prompt)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
